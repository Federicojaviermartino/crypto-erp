import { IsOptional, IsString, IsDateString, IsEnum, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TimeRange {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
  CUSTOM = 'custom',
}

export enum MetricType {
  REVENUE = 'revenue',
  INVOICES = 'invoices',
  USERS = 'users',
  CRYPTO = 'crypto',
}

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ enum: TimeRange, default: TimeRange.MONTH })
  @IsOptional()
  @IsEnum(TimeRange)
  timeRange?: TimeRange = TimeRange.MONTH;

  @ApiPropertyOptional({ description: 'Start date for custom range' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for custom range' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Group by period: day, week, month' })
  @IsOptional()
  @IsString()
  groupBy?: 'day' | 'week' | 'month' = 'day';
}

export class RevenueMetricsDto {
  @ApiProperty({ description: 'Total revenue in the period' })
  totalRevenue: number;

  @ApiProperty({ description: 'Monthly Recurring Revenue' })
  mrr: number;

  @ApiProperty({ description: 'Annual Recurring Revenue' })
  arr: number;

  @ApiProperty({ description: 'Average Revenue Per User' })
  arpu: number;

  @ApiProperty({ description: 'Customer Lifetime Value' })
  ltv: number;

  @ApiProperty({ description: 'Revenue growth percentage' })
  growthRate: number;

  @ApiProperty({ description: 'Revenue by period' })
  revenueByPeriod: { period: string; amount: number }[];

  @ApiProperty({ description: 'Revenue by currency' })
  revenueByCurrency: { currency: string; amount: number }[];

  @ApiProperty({ description: 'Top customers by revenue' })
  topCustomers: { customerId: string; name: string; revenue: number }[];
}

export class InvoiceMetricsDto {
  @ApiProperty({ description: 'Total invoices count' })
  totalInvoices: number;

  @ApiProperty({ description: 'Paid invoices count' })
  paidInvoices: number;

  @ApiProperty({ description: 'Pending invoices count' })
  pendingInvoices: number;

  @ApiProperty({ description: 'Overdue invoices count' })
  overdueInvoices: number;

  @ApiProperty({ description: 'Average invoice value' })
  averageInvoiceValue: number;

  @ApiProperty({ description: 'Average days to payment' })
  averageDaysToPayment: number;

  @ApiProperty({ description: 'Collection rate percentage' })
  collectionRate: number;

  @ApiProperty({ description: 'Invoices by status' })
  invoicesByStatus: { status: string; count: number; amount: number }[];

  @ApiProperty({ description: 'Invoices by period' })
  invoicesByPeriod: { period: string; count: number; amount: number }[];
}

export class UserMetricsDto {
  @ApiProperty({ description: 'Total users count' })
  totalUsers: number;

  @ApiProperty({ description: 'Active users in period' })
  activeUsers: number;

  @ApiProperty({ description: 'New users in period' })
  newUsers: number;

  @ApiProperty({ description: 'Churned users in period' })
  churnedUsers: number;

  @ApiProperty({ description: 'Churn rate percentage' })
  churnRate: number;

  @ApiProperty({ description: 'User growth rate' })
  growthRate: number;

  @ApiProperty({ description: 'Users by role' })
  usersByRole: { role: string; count: number }[];

  @ApiProperty({ description: 'User activity by period' })
  userActivityByPeriod: { period: string; activeUsers: number; newUsers: number }[];
}

export class CryptoPortfolioMetricsDto {
  @ApiProperty({ description: 'Total portfolio value in USD' })
  totalValueUsd: number;

  @ApiProperty({ description: 'Total profit/loss in USD' })
  totalProfitLoss: number;

  @ApiProperty({ description: 'Profit/loss percentage' })
  profitLossPercentage: number;

  @ApiProperty({ description: 'Holdings by cryptocurrency' })
  holdings: {
    symbol: string;
    name: string;
    balance: number;
    valueUsd: number;
    profitLoss: number;
    allocation: number;
  }[];

  @ApiProperty({ description: 'Portfolio value history' })
  valueHistory: { date: string; valueUsd: number }[];

  @ApiProperty({ description: 'Recent transactions' })
  recentTransactions: {
    id: string;
    type: string;
    symbol: string;
    amount: number;
    valueUsd: number;
    date: string;
  }[];
}

export class DashboardSummaryDto {
  @ApiProperty({ description: 'Revenue summary' })
  revenue: {
    total: number;
    change: number;
    changePercentage: number;
  };

  @ApiProperty({ description: 'Invoices summary' })
  invoices: {
    total: number;
    pending: number;
    overdue: number;
  };

  @ApiProperty({ description: 'Customers summary' })
  customers: {
    total: number;
    new: number;
    active: number;
  };

  @ApiProperty({ description: 'Crypto portfolio summary' })
  crypto: {
    totalValue: number;
    profitLoss: number;
    topHolding: string;
  };

  @ApiProperty({ description: 'Recent activity' })
  recentActivity: {
    type: string;
    description: string;
    timestamp: string;
  }[];
}

export class CreateReportDto {
  @ApiProperty({ description: 'Report name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Report description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Metrics to include', enum: MetricType, isArray: true })
  @IsEnum(MetricType, { each: true })
  metrics: MetricType[];

  @ApiProperty({ enum: TimeRange })
  @IsEnum(TimeRange)
  timeRange: TimeRange;

  @ApiPropertyOptional({ description: 'Start date for custom range' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for custom range' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Schedule: daily, weekly, monthly, or null for one-time' })
  @IsOptional()
  @IsString()
  schedule?: 'daily' | 'weekly' | 'monthly';

  @ApiPropertyOptional({ description: 'Email recipients for scheduled reports' })
  @IsOptional()
  @IsString({ each: true })
  recipients?: string[];
}

export class ReportResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description?: string;

  @ApiProperty()
  metrics: MetricType[];

  @ApiProperty()
  timeRange: TimeRange;

  @ApiProperty()
  schedule?: string;

  @ApiProperty()
  lastGeneratedAt?: Date;

  @ApiProperty()
  createdAt: Date;
}
