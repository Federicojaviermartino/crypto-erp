import {
  Controller,
  Get,
  Query,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

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
}
