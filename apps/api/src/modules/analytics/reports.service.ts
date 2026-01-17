import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@crypto-erp/database';
import { AnalyticsService } from './analytics.service.js';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

interface CreateReportDto {
  name: string;
  description?: string;
  metrics: string[];
  timeRange: string;
  startDate?: string;
  endDate?: string;
  schedule?: 'daily' | 'weekly' | 'monthly';
  recipients?: string[];
}

export interface ReportData {
  id: string;
  name: string;
  description?: string;
  metrics: string[];
  timeRange: string;
  schedule?: string;
  recipients?: string[];
  lastGeneratedAt?: Date;
  createdAt: Date;
  data?: any;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  /**
   * Create a new custom report
   */
  async createReport(companyId: string, dto: CreateReportDto): Promise<ReportData> {
    const report = await this.prisma.customReport.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description,
        metrics: dto.metrics,
        timeRange: dto.timeRange,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        schedule: dto.schedule || null,
        recipients: dto.recipients || [],
      },
    });

    return {
      id: report.id,
      name: report.name,
      description: report.description ?? undefined,
      metrics: report.metrics,
      timeRange: report.timeRange,
      schedule: report.schedule ?? undefined,
      recipients: report.recipients,
      createdAt: report.createdAt,
    };
  }

  /**
   * Get all reports for a company
   */
  async getReports(companyId: string): Promise<ReportData[]> {
    const reports = await this.prisma.customReport.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    return reports.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? undefined,
      metrics: r.metrics,
      timeRange: r.timeRange,
      schedule: r.schedule ?? undefined,
      recipients: r.recipients,
      lastGeneratedAt: r.lastGeneratedAt ?? undefined,
      createdAt: r.createdAt,
    }));
  }

  /**
   * Get a specific report
   */
  async getReport(companyId: string, reportId: string): Promise<ReportData> {
    const report = await this.prisma.customReport.findFirst({
      where: { id: reportId, companyId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return {
      id: report.id,
      name: report.name,
      description: report.description ?? undefined,
      metrics: report.metrics,
      timeRange: report.timeRange,
      schedule: report.schedule ?? undefined,
      recipients: report.recipients,
      lastGeneratedAt: report.lastGeneratedAt ?? undefined,
      createdAt: report.createdAt,
    };
  }

  /**
   * Generate report data
   */
  async generateReport(companyId: string, reportId: string): Promise<ReportData> {
    const report = await this.getReport(companyId, reportId);
    const { startDate, endDate } = this.calculateDateRange(report.timeRange);

    const data: Record<string, any> = {};

    for (const metric of report.metrics) {
      switch (metric) {
        case 'revenue':
          data.revenue = await this.analyticsService.getRevenueMetrics(
            companyId,
            startDate,
            endDate,
          );
          break;
        case 'users':
          data.users = await this.analyticsService.getUserMetrics(
            companyId,
            startDate,
            endDate,
          );
          break;
        case 'invoices':
          data.invoices = await this.analyticsService.getInvoiceAnalytics(
            companyId,
            startDate,
            endDate,
          );
          break;
        case 'crypto':
          data.crypto = await this.analyticsService.getCryptoPortfolioAnalytics(
            companyId,
            startDate,
            endDate,
          );
          break;
        case 'portfolio':
          data.portfolio = await this.analyticsService.getPortfolioOverview(companyId);
          break;
        case 'transactions':
          data.transactions = await this.analyticsService.getTransactionStats(
            companyId,
            startDate,
            endDate,
          );
          break;
      }
    }

    // Update last generated timestamp
    await this.prisma.customReport.update({
      where: { id: reportId },
      data: { lastGeneratedAt: new Date() },
    });

    return {
      ...report,
      data,
    };
  }

  /**
   * Export report to PDF
   */
  async exportToPdf(companyId: string, reportId: string): Promise<Buffer> {
    const report = await this.generateReport(companyId, reportId);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(24).text(report.name, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
      doc.moveDown(2);

      if (report.description) {
        doc.fontSize(14).text(report.description);
        doc.moveDown();
      }

      // Metrics data
      if (report.data) {
        for (const [key, value] of Object.entries(report.data)) {
          doc.fontSize(16).text(key.toUpperCase(), { underline: true });
          doc.moveDown(0.5);

          if (typeof value === 'object') {
            this.renderObjectToPdf(doc, value as Record<string, any>, 0);
          } else {
            doc.fontSize(12).text(String(value));
          }

          doc.moveDown();
        }
      }

      // Footer
      doc.fontSize(10).text('Crypto ERP - Analytics Report', { align: 'center' });

      doc.end();
    });
  }

  /**
   * Export report to Excel
   */
  async exportToExcel(companyId: string, reportId: string): Promise<Buffer> {
    const report = await this.generateReport(companyId, reportId);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Crypto ERP';
    workbook.created = new Date();

    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.addRow(['Report Name', report.name]);
    summarySheet.addRow(['Description', report.description || '']);
    summarySheet.addRow(['Generated', new Date().toISOString()]);
    summarySheet.addRow(['Time Range', report.timeRange]);
    summarySheet.addRow([]);

    // Add data sheets for each metric
    if (report.data) {
      for (const [key, value] of Object.entries(report.data)) {
        const sheet = workbook.addWorksheet(key.charAt(0).toUpperCase() + key.slice(1));
        this.renderObjectToExcel(sheet, value as Record<string, any>);
      }
    }

    // Style the summary sheet
    summarySheet.getColumn(1).width = 20;
    summarySheet.getColumn(2).width = 40;

    return workbook.xlsx.writeBuffer() as Promise<Buffer>;
  }

  /**
   * Delete a report
   */
  async deleteReport(companyId: string, reportId: string): Promise<{ success: boolean }> {
    const report = await this.prisma.customReport.findFirst({
      where: { id: reportId, companyId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    await this.prisma.customReport.delete({
      where: { id: reportId },
    });

    return { success: true };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private calculateDateRange(timeRange: string): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = now;
    let startDate: Date;

    switch (timeRange) {
      case 'day':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
    }

    return { startDate, endDate };
  }

  private renderObjectToPdf(doc: PDFKit.PDFDocument, obj: Record<string, any>, indent: number): void {
    const indentStr = '  '.repeat(indent);

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;

      if (Array.isArray(value)) {
        doc.fontSize(12).text(`${indentStr}${key}:`);
        value.slice(0, 10).forEach((item, i) => {
          if (typeof item === 'object') {
            doc.text(`${indentStr}  [${i + 1}]`);
            this.renderObjectToPdf(doc, item, indent + 2);
          } else {
            doc.text(`${indentStr}  - ${item}`);
          }
        });
        if (value.length > 10) {
          doc.text(`${indentStr}  ... and ${value.length - 10} more`);
        }
      } else if (typeof value === 'object') {
        doc.fontSize(12).text(`${indentStr}${key}:`);
        this.renderObjectToPdf(doc, value, indent + 1);
      } else {
        const formattedValue =
          typeof value === 'number'
            ? value.toLocaleString('en-US', { maximumFractionDigits: 2 })
            : String(value);
        doc.fontSize(12).text(`${indentStr}${key}: ${formattedValue}`);
      }
    }
  }

  private renderObjectToExcel(sheet: ExcelJS.Worksheet, obj: Record<string, any>): void {
    // Get all keys to create headers
    const flatData = this.flattenObject(obj);

    if (Array.isArray(obj)) {
      // If it's an array, create a table
      if (obj.length > 0 && typeof obj[0] === 'object') {
        const headers = Object.keys(obj[0]);
        sheet.addRow(headers);

        obj.forEach((item) => {
          sheet.addRow(headers.map((h) => item[h]));
        });
      }
    } else {
      // If it's an object, create key-value pairs
      for (const [key, value] of Object.entries(flatData)) {
        sheet.addRow([key, value]);
      }
    }

    // Auto-fit columns
    sheet.columns.forEach((column) => {
      column.width = 20;
    });
  }

  private flattenObject(obj: Record<string, any>, prefix = ''): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value === null || value === undefined) {
        result[newKey] = '';
      } else if (Array.isArray(value)) {
        result[newKey] = `[${value.length} items]`;
      } else if (typeof value === 'object' && !(value instanceof Date)) {
        Object.assign(result, this.flattenObject(value, newKey));
      } else {
        result[newKey] = value;
      }
    }

    return result;
  }
}
