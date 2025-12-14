import {
  Controller,
  Get,
  Param,
  Headers,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { TaxReportService } from './tax-report.service.js';

@Controller('fiscal/tax-report')
export class TaxReportController {
  constructor(private readonly taxReportService: TaxReportService) {}

  private getCompanyId(headers: Record<string, string>): string {
    const companyId = headers['x-company-id'];
    if (!companyId) {
      throw new BadRequestException('X-Company-Id header is required');
    }
    return companyId;
  }

  @Get(':year')
  async getTaxReport(
    @Headers() headers: Record<string, string>,
    @Param('year') yearStr: string,
  ) {
    const companyId = this.getCompanyId(headers);
    const year = parseInt(yearStr, 10);

    if (isNaN(year) || year < 2015 || year > new Date().getFullYear()) {
      throw new BadRequestException('Invalid year');
    }

    return this.taxReportService.generateTaxReport(companyId, year);
  }

  @Get(':year/summary')
  async getTaxSummary(
    @Headers() headers: Record<string, string>,
    @Param('year') yearStr: string,
  ) {
    const companyId = this.getCompanyId(headers);
    const year = parseInt(yearStr, 10);

    if (isNaN(year) || year < 2015 || year > new Date().getFullYear()) {
      throw new BadRequestException('Invalid year');
    }

    const report = await this.taxReportService.generateTaxReport(companyId, year);

    // Return only summary without full transaction list
    return {
      year: report.year,
      generatedAt: report.generatedAt,
      shortTermGains: report.shortTermGains,
      shortTermLosses: report.shortTermLosses,
      longTermGains: report.longTermGains,
      longTermLosses: report.longTermLosses,
      totalGains: report.totalGains,
      totalLosses: report.totalLosses,
      netCapitalGain: report.netCapitalGain,
      estimatedTax: report.estimatedTax,
      transactionCount: report.transactions.length,
      byAsset: report.byAsset,
    };
  }

  @Get(':year/irpf')
  async getIRPFData(
    @Headers() headers: Record<string, string>,
    @Param('year') yearStr: string,
  ) {
    const companyId = this.getCompanyId(headers);
    const year = parseInt(yearStr, 10);

    if (isNaN(year) || year < 2015 || year > new Date().getFullYear()) {
      throw new BadRequestException('Invalid year');
    }

    return this.taxReportService.generateIRPFData(companyId, year);
  }

  @Get(':year/export/csv')
  async exportCSV(
    @Headers() headers: Record<string, string>,
    @Param('year') yearStr: string,
    @Res() res: Response,
  ) {
    const companyId = this.getCompanyId(headers);
    const year = parseInt(yearStr, 10);

    if (isNaN(year) || year < 2015 || year > new Date().getFullYear()) {
      throw new BadRequestException('Invalid year');
    }

    const csv = await this.taxReportService.exportToCSV(companyId, year);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=tax_report_${year}.csv`);
    res.send('\uFEFF' + csv); // BOM for Excel UTF-8
  }
}
