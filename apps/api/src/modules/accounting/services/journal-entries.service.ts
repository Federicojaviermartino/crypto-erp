import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@crypto-erp/database';
import { CreateJournalEntryDto, QueryJournalEntriesDto } from '../dto/index.js';
import { JournalEntry, JournalStatus, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

type JournalEntryWithLines = JournalEntry & {
  lines: {
    id: string;
    accountId: string;
    debit: Decimal;
    credit: Decimal;
    description: string | null;
    account: {
      id: string;
      code: string;
      name: string;
      type: string;
    };
  }[];
};

@Injectable()
export class JournalEntriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    companyId: string,
    query: QueryJournalEntriesDto,
  ): Promise<{ entries: JournalEntryWithLines[]; total: number }> {
    const where: Prisma.JournalEntryWhereInput = {
      companyId,
      ...(query.status && { status: query.status as JournalStatus }),
      ...(query.fiscalYearId && { fiscalYearId: query.fiscalYearId }),
      ...(query.startDate && { date: { gte: new Date(query.startDate) } }),
      ...(query.endDate && { date: { lte: new Date(query.endDate) } }),
      ...(query.search && {
        OR: [
          { description: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [entries, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        include: {
          lines: {
            include: {
              account: {
                select: { id: true, code: true, name: true, type: true },
              },
            },
            orderBy: { lineNumber: 'asc' },
          },
        },
        orderBy: [{ date: 'desc' }, { number: 'desc' }],
        skip: query.skip || 0,
        take: query.take || 50,
      }),
      this.prisma.journalEntry.count({ where }),
    ]);

    return { entries: entries as JournalEntryWithLines[], total };
  }

  async findById(companyId: string, id: string): Promise<JournalEntryWithLines> {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, companyId },
      include: {
        lines: {
          include: {
            account: {
              select: { id: true, code: true, name: true, type: true },
            },
          },
          orderBy: { lineNumber: 'asc' },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException(`Journal entry with ID ${id} not found`);
    }

    return entry as JournalEntryWithLines;
  }

  async create(
    companyId: string,
    _userId: string,
    dto: CreateJournalEntryDto,
  ): Promise<JournalEntryWithLines> {
    // Validate that debits equal credits
    const totalDebits = dto.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredits = dto.lines.reduce((sum, line) => sum + (line.credit || 0), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.001) {
      throw new BadRequestException(
        `Debits (${totalDebits}) must equal credits (${totalCredits})`,
      );
    }

    // Validate accounts exist
    const accountCodes = dto.lines.map((line) => line.accountCode);
    const accounts = await this.prisma.account.findMany({
      where: { companyId, code: { in: accountCodes } },
    });

    const accountMap = new Map(accounts.map((a) => [a.code, a]));
    for (const code of accountCodes) {
      if (!accountMap.has(code)) {
        throw new NotFoundException(`Account with code ${code} not found`);
      }
    }

    // Get or validate fiscal year
    const entryDate = new Date(dto.date);
    const fiscalYear = await this.prisma.fiscalYear.findFirst({
      where: {
        companyId,
        startDate: { lte: entryDate },
        endDate: { gte: entryDate },
      },
    });

    if (!fiscalYear) {
      throw new BadRequestException('No fiscal year found for the entry date');
    }

    if (fiscalYear.isClosed) {
      throw new BadRequestException('Cannot create entries in a closed fiscal year');
    }

    // Generate entry number
    const entryNumber = await this.generateEntryNumber(companyId, fiscalYear.id);

    const entry = await this.prisma.journalEntry.create({
      data: {
        number: entryNumber,
        date: entryDate,
        description: dto.description,
        reference: dto.reference,
        status: 'DRAFT',
        companyId,
        fiscalYearId: fiscalYear.id,
        lines: {
          create: dto.lines.map((line, index) => ({
            lineNumber: index + 1,
            accountId: accountMap.get(line.accountCode)!.id,
            debit: line.debit || 0,
            credit: line.credit || 0,
            description: line.description,
          })),
        },
      },
      include: {
        lines: {
          include: {
            account: {
              select: { id: true, code: true, name: true, type: true },
            },
          },
          orderBy: { lineNumber: 'asc' },
        },
      },
    });

    return entry as JournalEntryWithLines;
  }

  async update(
    companyId: string,
    id: string,
    dto: Partial<CreateJournalEntryDto>,
  ): Promise<JournalEntryWithLines> {
    const existing = await this.findById(companyId, id);

    if (existing.status === 'POSTED') {
      throw new ConflictException('Cannot modify a posted journal entry');
    }

    if (existing.status === 'REVERSED') {
      throw new ConflictException('Cannot modify a reversed journal entry');
    }

    // If lines are being updated, validate them
    if (dto.lines) {
      const totalDebits = dto.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
      const totalCredits = dto.lines.reduce((sum, line) => sum + (line.credit || 0), 0);

      if (Math.abs(totalDebits - totalCredits) > 0.001) {
        throw new BadRequestException(
          `Debits (${totalDebits}) must equal credits (${totalCredits})`,
        );
      }

      const accountCodes = dto.lines.map((line) => line.accountCode);
      const accounts = await this.prisma.account.findMany({
        where: { companyId, code: { in: accountCodes } },
      });

      const accountMap = new Map(accounts.map((a) => [a.code, a]));
      for (const code of accountCodes) {
        if (!accountMap.has(code)) {
          throw new NotFoundException(`Account with code ${code} not found`);
        }
      }

      // Delete existing lines and create new ones
      await this.prisma.journalLine.deleteMany({
        where: { journalEntryId: id },
      });

      await this.prisma.journalLine.createMany({
        data: dto.lines.map((line, index) => ({
          journalEntryId: id,
          lineNumber: index + 1,
          accountId: accountMap.get(line.accountCode)!.id,
          debit: line.debit || 0,
          credit: line.credit || 0,
          description: line.description,
        })),
      });
    }

    // Update main entry
    await this.prisma.journalEntry.update({
      where: { id },
      data: {
        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.reference !== undefined && { reference: dto.reference }),
      },
    });

    return this.findById(companyId, id);
  }

  async post(companyId: string, id: string, userId: string): Promise<JournalEntryWithLines> {
    const entry = await this.findById(companyId, id);

    if (entry.status === 'POSTED') {
      throw new ConflictException('Journal entry is already posted');
    }

    if (entry.status === 'REVERSED') {
      throw new ConflictException('Cannot post a reversed journal entry');
    }

    await this.prisma.journalEntry.update({
      where: { id },
      data: {
        status: 'POSTED',
        isPosted: true,
        postedAt: new Date(),
        postedBy: userId,
      },
    });

    return this.findById(companyId, id);
  }

  async void(
    companyId: string,
    id: string,
    userId: string,
  ): Promise<JournalEntryWithLines> {
    const entry = await this.findById(companyId, id);

    if (entry.status === 'REVERSED') {
      throw new ConflictException('Journal entry is already reversed');
    }

    // Check if fiscal year is closed
    const fiscalYear = await this.prisma.fiscalYear.findUnique({
      where: { id: entry.fiscalYearId },
    });

    if (fiscalYear?.isClosed) {
      throw new BadRequestException('Cannot void entries in a closed fiscal year');
    }

    // For posted entries, create a reversal entry
    if (entry.status === 'POSTED') {
      const reversalNumber = await this.generateEntryNumber(companyId, entry.fiscalYearId);

      await this.prisma.$transaction([
        this.prisma.journalEntry.update({
          where: { id },
          data: {
            status: 'REVERSED',
            reversedBy: null, // Will be set to the reversal entry ID
          },
        }),
        this.prisma.journalEntry.create({
          data: {
            number: reversalNumber,
            date: new Date(),
            description: `Reversal of #${entry.number}: ${entry.description || ''}`,
            reference: entry.reference,
            status: 'POSTED',
            isPosted: true,
            isReversal: true,
            reversalOf: id,
            companyId,
            fiscalYearId: entry.fiscalYearId,
            postedAt: new Date(),
            postedBy: userId,
            lines: {
              create: entry.lines.map((line, index) => ({
                lineNumber: index + 1,
                accountId: line.accountId,
                debit: line.credit, // Reverse debit and credit
                credit: line.debit,
                description: `Reversal: ${line.description || ''}`,
              })),
            },
          },
        }),
      ]);
    } else {
      // Draft entries can be directly deleted or marked
      await this.prisma.journalEntry.update({
        where: { id },
        data: { status: 'REVERSED' },
      });
    }

    return this.findById(companyId, id);
  }

  async delete(companyId: string, id: string): Promise<void> {
    const entry = await this.findById(companyId, id);

    if (entry.status !== 'DRAFT') {
      throw new ConflictException('Only draft entries can be deleted');
    }

    await this.prisma.$transaction([
      this.prisma.journalLine.deleteMany({ where: { journalEntryId: id } }),
      this.prisma.journalEntry.delete({ where: { id } }),
    ]);
  }

  private async generateEntryNumber(companyId: string, fiscalYearId: string): Promise<number> {
    const lastEntry = await this.prisma.journalEntry.findFirst({
      where: { companyId, fiscalYearId },
      orderBy: { number: 'desc' },
    });

    return (lastEntry?.number || 0) + 1;
  }
}
