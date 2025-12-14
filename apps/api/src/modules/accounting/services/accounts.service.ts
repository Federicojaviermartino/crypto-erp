import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@crypto-erp/database';
import { CreateAccountDto, QueryAccountsDto } from '../dto/index.js';
import { Account, AccountType, Prisma } from '@prisma/client';

export interface AccountWithChildren extends Account {
  children?: AccountWithChildren[];
}

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, query: QueryAccountsDto): Promise<Account[]> {
    const where: Prisma.AccountWhereInput = {
      companyId,
      ...(query.type && { type: query.type as AccountType }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && {
        OR: [
          { code: { contains: query.search, mode: 'insensitive' as const } },
          { name: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    return this.prisma.account.findMany({
      where,
      orderBy: { code: 'asc' },
    });
  }

  async findById(companyId: string, id: string): Promise<Account> {
    const account = await this.prisma.account.findFirst({
      where: { id, companyId },
    });

    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }

    return account;
  }

  async findByCode(companyId: string, code: string): Promise<Account | null> {
    return this.prisma.account.findFirst({
      where: { companyId, code },
    });
  }

  async findTree(companyId: string): Promise<AccountWithChildren[]> {
    const accounts = await this.prisma.account.findMany({
      where: { companyId, isActive: true },
      orderBy: { code: 'asc' },
    });

    // Build tree structure using parentCode
    const accountByCode = new Map<string, AccountWithChildren>();
    const rootAccounts: AccountWithChildren[] = [];

    // First pass: create map by code
    for (const account of accounts) {
      accountByCode.set(account.code, { ...account, children: [] });
    }

    // Second pass: build tree using parentCode
    for (const account of accounts) {
      const node = accountByCode.get(account.code)!;
      if (account.parentCode) {
        const parent = accountByCode.get(account.parentCode);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(node);
        } else {
          rootAccounts.push(node);
        }
      } else {
        rootAccounts.push(node);
      }
    }

    return rootAccounts;
  }

  async getBalance(
    companyId: string,
    accountId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{ debit: number; credit: number; balance: number }> {
    const account = await this.findById(companyId, accountId);

    const where: Prisma.JournalLineWhereInput = {
      accountId,
      journalEntry: {
        companyId,
        status: 'POSTED',
        ...(startDate && { date: { gte: startDate } }),
        ...(endDate && { date: { lte: endDate } }),
      },
    };

    const result = await this.prisma.journalLine.aggregate({
      where,
      _sum: {
        debit: true,
        credit: true,
      },
    });

    const debit = result._sum.debit?.toNumber() || 0;
    const credit = result._sum.credit?.toNumber() || 0;

    // Calculate balance based on account type
    // ASSET and EXPENSE accounts: debit increases, credit decreases
    // LIABILITY, EQUITY, and INCOME accounts: credit increases, debit decreases
    const isDebitNormal = ['ASSET', 'EXPENSE'].includes(account.type);
    const balance = isDebitNormal ? debit - credit : credit - debit;

    return { debit, credit, balance };
  }

  async getBalanceForMultiple(
    companyId: string,
    accountIds: string[],
    startDate?: Date,
    endDate?: Date,
  ): Promise<Map<string, { debit: number; credit: number; balance: number }>> {
    const accounts = await this.prisma.account.findMany({
      where: { id: { in: accountIds }, companyId },
    });

    const accountTypeMap = new Map(accounts.map((a) => [a.id, a.type]));

    const lines = await this.prisma.journalLine.groupBy({
      by: ['accountId'],
      where: {
        accountId: { in: accountIds },
        journalEntry: {
          companyId,
          status: 'POSTED',
          ...(startDate && { date: { gte: startDate } }),
          ...(endDate && { date: { lte: endDate } }),
        },
      },
      _sum: {
        debit: true,
        credit: true,
      },
    });

    const result = new Map<string, { debit: number; credit: number; balance: number }>();

    for (const line of lines) {
      const debit = line._sum.debit?.toNumber() || 0;
      const credit = line._sum.credit?.toNumber() || 0;
      const accountType = accountTypeMap.get(line.accountId);
      const isDebitNormal = accountType && ['ASSET', 'EXPENSE'].includes(accountType);
      const balance = isDebitNormal ? debit - credit : credit - debit;

      result.set(line.accountId, { debit, credit, balance });
    }

    // Add zero balances for accounts with no entries
    for (const accountId of accountIds) {
      if (!result.has(accountId)) {
        result.set(accountId, { debit: 0, credit: 0, balance: 0 });
      }
    }

    return result;
  }

  async create(companyId: string, dto: CreateAccountDto): Promise<Account> {
    // Check if code already exists
    const existing = await this.findByCode(companyId, dto.code);
    if (existing) {
      throw new ConflictException(`Account with code ${dto.code} already exists`);
    }

    // Validate parent if provided
    if (dto.parentCode) {
      const parent = await this.findByCode(companyId, dto.parentCode);
      if (!parent) {
        throw new NotFoundException(`Parent account with code ${dto.parentCode} not found`);
      }
    }

    return this.prisma.account.create({
      data: {
        code: dto.code,
        name: dto.name,
        type: dto.type as AccountType,
        parentCode: dto.parentCode || null,
        companyId,
        isActive: true,
      },
    });
  }

  async update(
    companyId: string,
    id: string,
    dto: Partial<CreateAccountDto>,
  ): Promise<Account> {
    await this.findById(companyId, id);

    const updateData: Prisma.AccountUpdateInput = {};

    if (dto.name) updateData.name = dto.name;
    if (dto.type) updateData.type = dto.type as AccountType;

    if (dto.parentCode !== undefined) {
      if (dto.parentCode) {
        const parent = await this.findByCode(companyId, dto.parentCode);
        if (!parent) {
          throw new NotFoundException(`Parent account with code ${dto.parentCode} not found`);
        }
      }
      updateData.parentCode = dto.parentCode || null;
    }

    return this.prisma.account.update({
      where: { id },
      data: updateData,
    });
  }

  async deactivate(companyId: string, id: string): Promise<Account> {
    await this.findById(companyId, id);

    return this.prisma.account.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async activate(companyId: string, id: string): Promise<Account> {
    await this.findById(companyId, id);

    return this.prisma.account.update({
      where: { id },
      data: { isActive: true },
    });
  }
}
