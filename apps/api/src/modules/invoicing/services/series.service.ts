import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@crypto-erp/database';
import { CreateSeriesDto } from '../dto/index.js';
import { InvoiceSeries, InvoiceType } from '@prisma/client';

@Injectable()
export class SeriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string): Promise<InvoiceSeries[]> {
    return this.prisma.invoiceSeries.findMany({
      where: { companyId },
      orderBy: { prefix: 'asc' },
    });
  }

  async findById(companyId: string, id: string): Promise<InvoiceSeries> {
    const series = await this.prisma.invoiceSeries.findFirst({
      where: { id, companyId },
    });

    if (!series) {
      throw new NotFoundException(`Invoice series with ID ${id} not found`);
    }

    return series;
  }

  async findByPrefix(companyId: string, prefix: string): Promise<InvoiceSeries | null> {
    return this.prisma.invoiceSeries.findFirst({
      where: { companyId, prefix },
    });
  }

  async create(companyId: string, dto: CreateSeriesDto): Promise<InvoiceSeries> {
    // Check for duplicate prefix
    const existing = await this.findByPrefix(companyId, dto.prefix);
    if (existing) {
      throw new ConflictException(`Series with prefix ${dto.prefix} already exists`);
    }

    // If this will be default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.invoiceSeries.updateMany({
        where: {
          companyId,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    return this.prisma.invoiceSeries.create({
      data: {
        code: dto.prefix, // Use prefix as code
        prefix: dto.prefix,
        name: dto.name,
        type: InvoiceType.STANDARD,
        nextNumber: dto.nextNumber ?? 1,
        digitCount: 6,
        isDefault: dto.isDefault ?? false,
        company: {
          connect: { id: companyId },
        },
      },
    });
  }

  async update(
    companyId: string,
    id: string,
    dto: Partial<CreateSeriesDto>,
  ): Promise<InvoiceSeries> {
    const existing = await this.findById(companyId, id);

    // Check for duplicate prefix if changing
    if (dto.prefix && dto.prefix !== existing.prefix) {
      const duplicate = await this.findByPrefix(companyId, dto.prefix);
      if (duplicate) {
        throw new ConflictException(`Series with prefix ${dto.prefix} already exists`);
      }
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.invoiceSeries.updateMany({
        where: {
          companyId,
          isDefault: true,
          NOT: { id },
        },
        data: { isDefault: false },
      });
    }

    return this.prisma.invoiceSeries.update({
      where: { id },
      data: {
        ...(dto.prefix && { prefix: dto.prefix, code: dto.prefix }),
        ...(dto.name && { name: dto.name }),
        ...(dto.nextNumber && { nextNumber: dto.nextNumber }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      },
    });
  }

  async delete(companyId: string, id: string): Promise<void> {
    await this.findById(companyId, id);

    // Check if series has invoices
    const invoiceCount = await this.prisma.invoice.count({
      where: { seriesId: id },
    });

    if (invoiceCount > 0) {
      throw new ConflictException(
        `Cannot delete series with ${invoiceCount} associated invoices. Deactivate instead.`,
      );
    }

    await this.prisma.invoiceSeries.delete({ where: { id } });
  }

  async getStats(
    companyId: string,
    id: string,
  ): Promise<{
    totalInvoices: number;
    currentYear: number;
    currentYearInvoices: number;
    lastInvoiceNumber: string | null;
  }> {
    await this.findById(companyId, id);

    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

    const [totalInvoices, currentYearInvoices, lastInvoice] = await Promise.all([
      this.prisma.invoice.count({
        where: { seriesId: id },
      }),
      this.prisma.invoice.count({
        where: {
          seriesId: id,
          issueDate: { gte: startOfYear, lte: endOfYear },
        },
      }),
      this.prisma.invoice.findFirst({
        where: { seriesId: id },
        orderBy: { number: 'desc' },
        select: { fullNumber: true },
      }),
    ]);

    return {
      totalInvoices,
      currentYear,
      currentYearInvoices,
      lastInvoiceNumber: lastInvoice?.fullNumber || null,
    };
  }
}
