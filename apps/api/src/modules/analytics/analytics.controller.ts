import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  BadRequestException,
  UseGuards,
  Param,
  Delete,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service.js';
import { ReportsService } from './reports.service.js';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly reportsService: ReportsService,
  ) {}

  private getCompanyId(headers: Record<string, string>): string {
    const companyId = headers['x-company-id'];
    if (!companyId) {
      throw new BadRequestException('X-Company-Id header is required');
    }
    return companyId;
  }

  @Get('dashboard')
  async getDashboardMetrics(@Headers() headers: Record<string, string>) {
    const companyId = this.getCompanyId(headers);
    return this.analyticsService.getDashboardMetrics(companyId);
  }

  @Get('portfolio')
  async getPortfolioOverview(@Headers() headers: Record<string, string>) {
    const companyId = this.getCompanyId(headers);
    return this.analyticsService.getPortfolioOverview(companyId);
  }

  @Get('transactions/stats')
  async getTransactionStats(
    @Headers() headers: Record<string, string>,
    @Query('startDate') startDateStr?: string,
    @Query('endDate') endDateStr?: string,
  ) {
    const companyId = this.getCompanyId(headers);
    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    return this.analyticsService.getTransactionStats(companyId, startDate, endDate);
  }

  @Get('charts/monthly')
  async getMonthlyData(
    @Headers() headers: Record<string, string>,
    @Query('months') monthsStr?: string,
  ) {
    const companyId = this.getCompanyId(headers);
    const months = monthsStr ? parseInt(monthsStr, 10) : 12;

    if (isNaN(months) || months < 1 || months > 24) {
      throw new BadRequestException('Months must be between 1 and 24');
    }

    return this.analyticsService.getMonthlyData(companyId, months);
  }

  // ============================================================================
  // PHASE 4 - ADVANCED ANALYTICS ENDPOINTS
  // ============================================================================

  /**
   * Get revenue analytics (MRR, ARR, total revenue, growth)
   * GET /analytics/revenue?startDate=2025-01-01&endDate=2025-12-31
   */
  @Get('revenue')
  async getRevenueMetrics(
    @Headers() headers: Record<string, string>,
    @Query('startDate') startDateStr?: string,
    @Query('endDate') endDateStr?: string,
  ) {
    const companyId = this.getCompanyId(headers);

    // Default to current month if not provided
    const now = new Date();
    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = endDateStr
      ? new Date(endDateStr)
      : now;

    return this.analyticsService.getRevenueMetrics(companyId, startDate, endDate);
  }

  /**
   * Get user behavior analytics (active users, churn rate)
   * GET /analytics/users?startDate=2025-01-01&endDate=2025-12-31
   */
  @Get('users')
  async getUserMetrics(
    @Headers() headers: Record<string, string>,
    @Query('startDate') startDateStr?: string,
    @Query('endDate') endDateStr?: string,
  ) {
    const companyId = this.getCompanyId(headers);

    const now = new Date();
    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = endDateStr
      ? new Date(endDateStr)
      : now;

    return this.analyticsService.getUserMetrics(companyId, startDate, endDate);
  }

  // ============================================================================
  // REPORTS ENDPOINTS
  // ============================================================================

  /**
   * Create a custom report
   * POST /analytics/reports
   */
  @Post('reports')
  @ApiOperation({ summary: 'Create a custom report' })
  async createReport(
    @Headers() headers: Record<string, string>,
    @Body() createReportDto: {
      name: string;
      description?: string;
      metrics: string[];
      timeRange: string;
      startDate?: string;
      endDate?: string;
      schedule?: 'daily' | 'weekly' | 'monthly';
      recipients?: string[];
    },
  ) {
    const companyId = this.getCompanyId(headers);
    return this.reportsService.createReport(companyId, createReportDto);
  }

  /**
   * Get all reports for a company
   * GET /analytics/reports
   */
  @Get('reports')
  @ApiOperation({ summary: 'Get all company reports' })
  async getReports(@Headers() headers: Record<string, string>) {
    const companyId = this.getCompanyId(headers);
    return this.reportsService.getReports(companyId);
  }

  /**
   * Get a specific report
   * GET /analytics/reports/:id
   */
  @Get('reports/:id')
  @ApiOperation({ summary: 'Get a specific report' })
  async getReport(
    @Headers() headers: Record<string, string>,
    @Param('id') reportId: string,
  ) {
    const companyId = this.getCompanyId(headers);
    return this.reportsService.getReport(companyId, reportId);
  }

  /**
   * Generate report and return data
   * GET /analytics/reports/:id/generate
   */
  @Get('reports/:id/generate')
  @ApiOperation({ summary: 'Generate report data' })
  async generateReport(
    @Headers() headers: Record<string, string>,
    @Param('id') reportId: string,
  ) {
    const companyId = this.getCompanyId(headers);
    return this.reportsService.generateReport(companyId, reportId);
  }

  /**
   * Export report as PDF
   * GET /analytics/reports/:id/export/pdf
   */
  @Get('reports/:id/export/pdf')
  @ApiOperation({ summary: 'Export report as PDF' })
  async exportReportPdf(
    @Headers() headers: Record<string, string>,
    @Param('id') reportId: string,
    @Res() res: Response,
  ) {
    const companyId = this.getCompanyId(headers);
    const pdfBuffer = await this.reportsService.exportToPdf(companyId, reportId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="report-${reportId}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }

  /**
   * Export report as Excel
   * GET /analytics/reports/:id/export/excel
   */
  @Get('reports/:id/export/excel')
  @ApiOperation({ summary: 'Export report as Excel' })
  async exportReportExcel(
    @Headers() headers: Record<string, string>,
    @Param('id') reportId: string,
    @Res() res: Response,
  ) {
    const companyId = this.getCompanyId(headers);
    const excelBuffer = await this.reportsService.exportToExcel(companyId, reportId);

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="report-${reportId}.xlsx"`,
      'Content-Length': excelBuffer.length,
    });

    res.send(excelBuffer);
  }

  /**
   * Delete a report
   * DELETE /analytics/reports/:id
   */
  @Delete('reports/:id')
  @ApiOperation({ summary: 'Delete a report' })
  async deleteReport(
    @Headers() headers: Record<string, string>,
    @Param('id') reportId: string,
  ) {
    const companyId = this.getCompanyId(headers);
    return this.reportsService.deleteReport(companyId, reportId);
  }

  // ============================================================================
  // INVOICE ANALYTICS ENDPOINTS
  // ============================================================================

  /**
   * Get invoice analytics
   * GET /analytics/invoices
   */
  @Get('invoices')
  @ApiOperation({ summary: 'Get invoice metrics' })
  async getInvoiceMetrics(
    @Headers() headers: Record<string, string>,
    @Query('startDate') startDateStr?: string,
    @Query('endDate') endDateStr?: string,
  ) {
    const companyId = this.getCompanyId(headers);
    const now = new Date();
    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = endDateStr ? new Date(endDateStr) : now;

    return this.analyticsService.getInvoiceAnalytics(companyId, startDate, endDate);
  }

  // ============================================================================
  // CRYPTO PORTFOLIO ANALYTICS
  // ============================================================================

  /**
   * Get crypto portfolio analytics
   * GET /analytics/crypto
   */
  @Get('crypto')
  @ApiOperation({ summary: 'Get crypto portfolio metrics' })
  async getCryptoMetrics(
    @Headers() headers: Record<string, string>,
    @Query('startDate') startDateStr?: string,
    @Query('endDate') endDateStr?: string,
  ) {
    const companyId = this.getCompanyId(headers);
    const now = new Date();
    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(now.getFullYear(), 0, 1);
    const endDate = endDateStr ? new Date(endDateStr) : now;

    return this.analyticsService.getCryptoPortfolioAnalytics(companyId, startDate, endDate);
  }

  // ============================================================================
  // SUMMARY / DASHBOARD ANALYTICS
  // ============================================================================

  /**
   * Get complete dashboard summary
   * GET /analytics/summary
   */
  @Get('summary')
  @ApiOperation({ summary: 'Get complete dashboard summary with all metrics' })
  async getDashboardSummary(@Headers() headers: Record<string, string>) {
    const companyId = this.getCompanyId(headers);
    return this.analyticsService.getCompleteDashboardSummary(companyId);
  }
}
