import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '@crypto-erp/database';
import { Decimal } from '@prisma/client/runtime/library';

export interface AnalyticsAggregationJob {
  type: 'daily' | 'hourly' | 'monthly';
  companyId?: string; // Optional: aggregate for specific company
  startDate: Date;
  endDate: Date;
}

/**
 * Analytics Aggregation Processor
 * Handles periodic aggregation of analytics data into TimescaleDB continuous aggregates.
 * Scheduled to run:
 * - Hourly: Every hour for revenue metrics
 * - Daily: Every day for user activity and crypto metrics
 * - Monthly: First day of month for monthly reports
 */
@Processor('analytics-aggregation')
export class AnalyticsAggregationProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalyticsAggregationProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<AnalyticsAggregationJob>): Promise<void> {
    const { type, companyId, startDate, endDate } = job.data;

    this.logger.log(
      `Processing ${type} analytics aggregation from ${startDate} to ${endDate}`,
    );

    try {
      switch (type) {
        case 'hourly':
          await this.aggregateHourlyMetrics(companyId, startDate, endDate);
          break;
        case 'daily':
          await this.aggregateDailyMetrics(companyId, startDate, endDate);
          break;
        case 'monthly':
          await this.aggregateMonthlyMetrics(companyId, startDate, endDate);
          break;
      }

      this.logger.log(`Completed ${type} analytics aggregation`);
    } catch (error) {
      this.logger.error(
        `Failed to aggregate ${type} analytics:`,
        error.stack,
      );
      throw error; // Re-throw to trigger retry
    }
  }

  /**
   * Aggregate hourly metrics from raw events.
   * Creates summaries for revenue, user activity, and system metrics.
   */
  private async aggregateHourlyMetrics(
    companyId: string | undefined,
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    // Refresh TimescaleDB continuous aggregates
    await this.prisma.$executeRaw`
      CALL refresh_continuous_aggregate(
        'analytics_revenue_hourly',
        ${startDate},
        ${endDate}
      )
    `;

    // Track invoice creation events - use findMany and aggregate manually
    const invoices = await this.prisma.invoice.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        companyId: true,
        total: true,
      },
    });

    // Group by company manually
    const invoicesByCompany = new Map<string, { count: number; total: Decimal }>();
    for (const inv of invoices) {
      const current = invoicesByCompany.get(inv.companyId) || { count: 0, total: new Decimal(0) };
      current.count++;
      current.total = current.total.add(inv.total);
      invoicesByCompany.set(inv.companyId, current);
    }

    // Create analytics events for each company's invoices
    for (const [invCompanyId, data] of invoicesByCompany) {
      await this.prisma.analyticsEvent.create({
        data: {
          companyId: invCompanyId,
          eventType: 'invoice.created',
          category: 'revenue',
          value: data.total,
          currency: 'EUR',
          metadata: {
            count: data.count,
            period: 'hourly',
          },
          timestamp: startDate,
        },
      });
    }

    this.logger.log(
      `Aggregated ${invoicesByCompany.size} hourly invoice metrics`,
    );
  }

  /**
   * Aggregate daily metrics from raw events.
   * Creates daily summaries for all event types.
   */
  private async aggregateDailyMetrics(
    companyId: string | undefined,
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    // Refresh continuous aggregates
    await this.prisma.$executeRaw`
      CALL refresh_continuous_aggregate(
        'analytics_user_activity_daily',
        ${startDate},
        ${endDate}
      )
    `;

    await this.prisma.$executeRaw`
      CALL refresh_continuous_aggregate(
        'analytics_crypto_daily',
        ${startDate},
        ${endDate}
      )
    `;

    // Get wallets for the company to filter transactions
    const wallets = companyId
      ? await this.prisma.wallet.findMany({ where: { companyId }, select: { id: true } })
      : [];
    const walletIds = wallets.map(w => w.id);

    // Get crypto transactions
    const transactions = await this.prisma.cryptoTransaction.findMany({
      where: {
        ...(walletIds.length > 0 ? { walletId: { in: walletIds } } : {}),
        blockTimestamp: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        type: true,
        priceInEur: true,
      },
    });

    // Group by type manually
    const txByType = new Map<string, { count: number; total: Decimal }>();
    for (const tx of transactions) {
      const current = txByType.get(tx.type) || { count: 0, total: new Decimal(0) };
      current.count++;
      if (tx.priceInEur) {
        current.total = current.total.add(tx.priceInEur);
      }
      txByType.set(tx.type, current);
    }

    for (const [txType, data] of txByType) {
      await this.prisma.analyticsEvent.create({
        data: {
          companyId: companyId || null,
          eventType: `crypto.${txType.toLowerCase()}`,
          category: 'crypto',
          value: data.total,
          currency: 'EUR',
          metadata: {
            count: data.count,
            transactionType: txType,
            period: 'daily',
          },
          timestamp: startDate,
        },
      });
    }

    this.logger.log(
      `Aggregated ${txByType.size} daily crypto metrics`,
    );
  }

  /**
   * Aggregate monthly metrics for reporting.
   * Calculates MRR, ARR, churn, and other business metrics.
   */
  private async aggregateMonthlyMetrics(
    companyId: string | undefined,
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    // Calculate Monthly Recurring Revenue (MRR) from active subscriptions
    // Get subscriptions with their plan prices
    const activeSubscriptions = await this.prisma.subscription.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        status: 'ACTIVE',
        createdAt: {
          lt: endDate,
        },
      },
      include: {
        plan: true,
      },
    });

    // Group by company and calculate MRR
    const companyMrr = new Map<string, { mrr: Decimal; count: number }>();
    for (const sub of activeSubscriptions) {
      const current = companyMrr.get(sub.companyId) || { mrr: new Decimal(0), count: 0 };
      current.mrr = current.mrr.add(sub.plan.monthlyPrice);
      current.count++;
      companyMrr.set(sub.companyId, current);
    }

    for (const [subCompanyId, data] of companyMrr) {
      const arr = data.mrr.mul(12); // Annual Recurring Revenue

      // Create MRR event
      await this.prisma.analyticsEvent.create({
        data: {
          companyId: subCompanyId,
          eventType: 'subscription.mrr',
          category: 'revenue',
          value: data.mrr,
          currency: 'EUR',
          metadata: {
            arr: arr.toString(),
            activeSubscriptions: data.count,
            period: 'monthly',
          },
          timestamp: startDate,
        },
      });
    }

    // Calculate churn rate
    const churnedSubscriptions = await this.prisma.subscription.count({
      where: {
        ...(companyId ? { companyId } : {}),
        status: 'CANCELED',
        canceledAt: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    const totalSubscriptions = await this.prisma.subscription.count({
      where: {
        ...(companyId ? { companyId } : {}),
        createdAt: {
          lt: startDate,
        },
      },
    });

    if (totalSubscriptions > 0) {
      const churnRate = (churnedSubscriptions / totalSubscriptions) * 100;

      await this.prisma.analyticsEvent.create({
        data: {
          companyId: companyId || null,
          eventType: 'subscription.churn',
          category: 'revenue',
          value: new Decimal(churnRate),
          metadata: {
            churnedCount: churnedSubscriptions,
            totalCount: totalSubscriptions,
            period: 'monthly',
          },
          timestamp: startDate,
        },
      });
    }

    this.logger.log(`Aggregated monthly subscription metrics`);
  }
}
