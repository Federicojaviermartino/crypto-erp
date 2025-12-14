import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@crypto-erp/database';
import { CreateInvoiceDto, QueryInvoicesDto } from '../dto/index.js';
import { Invoice, InvoiceLine, Prisma, InvoiceStatus, InvoiceDirection, InvoiceType } from '@prisma/client';
import { VerifactuService } from '../verifactu/verifactu.service.js';

type InvoiceWithRelations = Invoice & {
  lines: InvoiceLine[];
  contact: {
    id: string;
    name: string;
    taxId: string | null;
    email: string | null;
  } | null;
  series: {
    id: string;
    prefix: string | null;
    name: string;
  };
};

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly verifactuService: VerifactuService,
  ) {}

  async findAll(
    companyId: string,
    query: QueryInvoicesDto,
  ): Promise<{ invoices: InvoiceWithRelations[]; total: number }> {
    const where: Prisma.InvoiceWhereInput = {
      companyId,
      ...(query.status && { status: query.status as InvoiceStatus }),
      ...(query.direction && { direction: query.direction as InvoiceDirection }),
      ...(query.contactId && { contactId: query.contactId }),
      ...(query.seriesId && { seriesId: query.seriesId }),
      ...(query.startDate && { issueDate: { gte: new Date(query.startDate) } }),
      ...(query.endDate && { issueDate: { lte: new Date(query.endDate) } }),
      ...(query.verifactuRegistered !== undefined && {
        verifactuHash: query.verifactuRegistered ? { not: null } : null,
      }),
      ...(query.search && {
        OR: [
          { fullNumber: { contains: query.search, mode: 'insensitive' as const } },
          { counterpartyName: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          lines: true,
          contact: {
            select: { id: true, name: true, taxId: true, email: true },
          },
          series: {
            select: { id: true, prefix: true, name: true },
          },
        },
        orderBy: [{ issueDate: 'desc' }, { number: 'desc' }],
        skip: query.skip || 0,
        take: query.take || 50,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { invoices: invoices as InvoiceWithRelations[], total };
  }

  async findById(companyId: string, id: string): Promise<InvoiceWithRelations> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, companyId },
      include: {
        lines: true,
        contact: {
          select: { id: true, name: true, taxId: true, email: true },
        },
        series: {
          select: { id: true, prefix: true, name: true },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    return invoice as InvoiceWithRelations;
  }

  async create(
    companyId: string,
    _userId: string,
    dto: CreateInvoiceDto,
    direction: InvoiceDirection = 'ISSUED',
  ): Promise<InvoiceWithRelations> {
    // Validate contact exists
    const contact = dto.contactId ? await this.prisma.contact.findFirst({
      where: { id: dto.contactId, companyId },
    }) : null;

    if (dto.contactId && !contact) {
      throw new NotFoundException('Contact not found');
    }

    // Get or validate series
    const series = dto.seriesId
      ? await this.prisma.invoiceSeries.findFirst({
          where: { id: dto.seriesId, companyId },
        })
      : await this.prisma.invoiceSeries.findFirst({
          where: { companyId, isDefault: true },
        });

    if (!series) {
      throw new BadRequestException('No invoice series found. Please create one first.');
    }

    // Generate invoice number
    const { number, fullNumber } = await this.generateInvoiceNumber(companyId, series.id);

    // Calculate totals
    const totals = this.calculateTotals(dto.lines);

    // Create invoice with lines
    const invoice = await this.prisma.invoice.create({
      data: {
        number,
        fullNumber,
        type: (dto.type as InvoiceType) || InvoiceType.STANDARD,
        direction,
        issueDate: new Date(dto.date),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        status: 'DRAFT',
        subtotal: totals.subtotal,
        totalTax: totals.taxAmount,
        total: totals.totalAmount,
        taxableBase: totals.subtotal,
        notes: dto.notes || null,
        counterpartyName: contact?.name || dto.counterpartyName || 'N/A',
        counterpartyTaxId: contact?.taxId || dto.counterpartyTaxId,
        counterpartyAddress: contact?.address || dto.counterpartyAddress,
        counterpartyCity: contact?.city || dto.counterpartyCity,
        counterpartyCountry: contact?.country || dto.counterpartyCountry || 'ES',
        companyId,
        contactId: dto.contactId || null,
        seriesId: series.id,
        lines: {
          create: dto.lines.map((line, index) => ({
            lineNumber: index + 1,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            taxRate: line.vatRate ?? 21,
            discount: line.discountPercent ?? 0,
            subtotal: line.quantity * line.unitPrice * (1 - (line.discountPercent || 0) / 100),
            taxAmount: line.quantity * line.unitPrice * (1 - (line.discountPercent || 0) / 100) * ((line.vatRate || 21) / 100),
            total: this.calculateLineTotal(line),
          })),
        },
      },
      include: {
        lines: true,
        contact: {
          select: { id: true, name: true, taxId: true, email: true },
        },
        series: {
          select: { id: true, prefix: true, name: true },
        },
      },
    });

    return invoice as InvoiceWithRelations;
  }

  async update(
    companyId: string,
    id: string,
    dto: Partial<CreateInvoiceDto>,
  ): Promise<InvoiceWithRelations> {
    const existing = await this.findById(companyId, id);

    if (existing.status !== 'DRAFT') {
      throw new ConflictException('Only draft invoices can be modified');
    }

    // Update lines if provided
    if (dto.lines) {
      // Delete existing lines
      await this.prisma.invoiceLine.deleteMany({
        where: { invoiceId: id },
      });

      // Calculate new totals
      const totals = this.calculateTotals(dto.lines);

      // Create new lines and update invoice
      await this.prisma.invoice.update({
        where: { id },
        data: {
          subtotal: totals.subtotal,
          totalTax: totals.taxAmount,
          total: totals.totalAmount,
          taxableBase: totals.subtotal,
          lines: {
            create: dto.lines.map((line, index) => ({
              lineNumber: index + 1,
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              taxRate: line.vatRate ?? 21,
              discount: line.discountPercent ?? 0,
              subtotal: line.quantity * line.unitPrice * (1 - (line.discountPercent || 0) / 100),
              taxAmount: line.quantity * line.unitPrice * (1 - (line.discountPercent || 0) / 100) * ((line.vatRate || 21) / 100),
              total: this.calculateLineTotal(line),
            })),
          },
        },
      });
    }

    // Update other fields
    await this.prisma.invoice.update({
      where: { id },
      data: {
        ...(dto.contactId && { contactId: dto.contactId }),
        ...(dto.date && { issueDate: new Date(dto.date) }),
        ...(dto.dueDate && { dueDate: new Date(dto.dueDate) }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });

    return this.findById(companyId, id);
  }

  async issue(companyId: string, id: string): Promise<InvoiceWithRelations> {
    const invoice = await this.findById(companyId, id);

    if (invoice.status !== 'DRAFT') {
      throw new ConflictException('Only draft invoices can be issued');
    }

    // For outgoing invoices, register with Verifactu
    if (invoice.direction === 'ISSUED') {
      try {
        const verifactuRecord = await this.verifactuService.generateVerifactuRecord(companyId, id);
        if (!verifactuRecord) {
          throw new BadRequestException('Verifactu registration failed');
        }
      } catch (error) {
        // Log but don't fail - Verifactu may not be required
        console.warn('Verifactu registration skipped:', error);
      }
    }

    await this.prisma.invoice.update({
      where: { id },
      data: {
        status: 'ISSUED',
      },
    });

    return this.findById(companyId, id);
  }

  async markAsPaid(
    companyId: string,
    id: string,
    paidAt?: Date,
  ): Promise<InvoiceWithRelations> {
    const invoice = await this.findById(companyId, id);

    if (!['ISSUED', 'SENT'].includes(invoice.status)) {
      throw new ConflictException('Only issued or sent invoices can be marked as paid');
    }

    await this.prisma.invoice.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: paidAt || new Date(),
      },
    });

    return this.findById(companyId, id);
  }

  async cancel(companyId: string, id: string): Promise<InvoiceWithRelations> {
    const invoice = await this.findById(companyId, id);

    if (invoice.status === 'CANCELLED') {
      throw new ConflictException('Invoice is already cancelled');
    }

    // If invoice was issued and registered with Verifactu, we need to issue a rectificative
    if (invoice.verifactuHash) {
      throw new BadRequestException(
        'Cannot cancel a Verifactu-registered invoice. Create a rectificative invoice instead.',
      );
    }

    await this.prisma.invoice.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return this.findById(companyId, id);
  }

  async delete(companyId: string, id: string): Promise<void> {
    const invoice = await this.findById(companyId, id);

    if (invoice.status !== 'DRAFT') {
      throw new ConflictException('Only draft invoices can be deleted');
    }

    await this.prisma.$transaction([
      this.prisma.invoiceLine.deleteMany({ where: { invoiceId: id } }),
      this.prisma.invoice.delete({ where: { id } }),
    ]);
  }

  async getVerifactuQR(companyId: string, id: string): Promise<string> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, companyId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (!invoice.verifactuQrData) {
      throw new BadRequestException('Invoice is not registered with Verifactu');
    }

    return invoice.verifactuQrData;
  }

  private async generateInvoiceNumber(
    companyId: string,
    seriesId: string,
  ): Promise<{ number: number; fullNumber: string }> {
    const series = await this.prisma.invoiceSeries.findUnique({
      where: { id: seriesId },
    });

    if (!series) {
      throw new NotFoundException('Invoice series not found');
    }

    const year = new Date().getFullYear();
    const nextNumber = series.nextNumber;

    // Update the next number
    await this.prisma.invoiceSeries.update({
      where: { id: seriesId },
      data: { nextNumber: nextNumber + 1 },
    });

    // Format: PREFIX-YEAR-NUMBER (e.g., F-2024-000001)
    const prefix = series.prefix || series.code;
    const fullNumber = `${prefix}-${year}-${String(nextNumber).padStart(series.digitCount, '0')}`;

    return { number: nextNumber, fullNumber };
  }

  private calculateTotals(lines: CreateInvoiceDto['lines']): {
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
  } {
    let subtotal = 0;
    let taxAmount = 0;

    for (const line of lines) {
      const lineTotal = line.quantity * line.unitPrice;
      const discount = lineTotal * ((line.discountPercent || 0) / 100);
      const lineSubtotal = lineTotal - discount;
      const lineVat = lineSubtotal * ((line.vatRate || 21) / 100);

      subtotal += lineSubtotal;
      taxAmount += lineVat;
    }

    return {
      subtotal,
      taxAmount,
      totalAmount: subtotal + taxAmount,
    };
  }

  private calculateLineTotal(line: CreateInvoiceDto['lines'][0]): number {
    const lineTotal = line.quantity * line.unitPrice;
    const discount = lineTotal * ((line.discountPercent || 0) / 100);
    const lineSubtotal = lineTotal - discount;
    const lineVat = lineSubtotal * ((line.vatRate || 21) / 100);
    return lineSubtotal + lineVat;
  }
}
