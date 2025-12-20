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

    // Track invoice creation events
    const invoiceEvents = await this.prisma.invoice.groupBy({
      by: ['companyId'],
      _count: true,
      _sum: {
        totalAmount: true,
      },
      where: {
        companyId: companyId,
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    // Create analytics events for each company's invoices
    for (const event of invoiceEvents) {
      await this.prisma.analyticsEvent.create({
        data: {
          companyId: event.companyId,
          eventType: 'invoice.created',
          category: 'revenue',
          value: event._sum.totalAmount || new Decimal(0),
          currency: 'EUR', // TODO: Get from company
          metadata: {
            count: event._count,
            period: 'hourly',
          },
          timestamp: startDate,
        },
      });
    }

    this.logger.log(
      `Aggregated ${invoiceEvents.length} hourly invoice metrics`,
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

    // Aggregate crypto transactions
    const cryptoTransactions = await this.prisma.cryptoTransaction.groupBy({
      by: ['companyId', 'type'],
      _count: true,
      _sum: {
        amountFiat: true,
      },
      where: {
        companyId: companyId,
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    for (const tx of cryptoTransactions) {
      await this.prisma.analyticsEvent.create({
        data: {
          companyId: tx.companyId,
          eventType: `crypto.${tx.type.toLowerCase()}`,
          category: 'crypto',
          value: tx._sum.amountFiat || new Decimal(0),
          currency: 'EUR',
          metadata: {
            count: tx._count,
            transactionType: tx.type,
            period: 'daily',
          },
          timestamp: startDate,
        },
      });
    }

    this.logger.log(
      `Aggregated ${cryptoTransactions.length} daily crypto metrics`,
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
    // Calculate Monthly Recurring Revenue (MRR)
    const subscriptions = await this.prisma.subscription.groupBy({
      by: ['companyId'],
      _count: true,
      _sum: {
        amount: true,
      },
      where: {
        companyId: companyId,
        status: 'ACTIVE',
        createdAt: {
          lt: endDate,
        },
      },
    });

    for (const sub of subscriptions) {
      const mrr = sub._sum.amount || new Decimal(0);
      const arr = mrr.mul(12); // Annual Recurring Revenue

      // Create MRR event
      await this.prisma.analyticsEvent.create({
        data: {
          companyId: sub.companyId,
          eventType: 'subscription.mrr',
          category: 'revenue',
          value: mrr,
          currency: 'EUR',
          metadata: {
            arr: arr.toString(),
            activeSubscriptions: sub._count,
            period: 'monthly',
          },
          timestamp: startDate,
        },
      });
    }

    // Calculate churn rate
    const churnedSubscriptions = await this.prisma.subscription.count({
      where: {
        companyId: companyId,
        status: 'CANCELLED',
        cancelledAt: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    const totalSubscriptions = await this.prisma.subscription.count({
      where: {
        companyId: companyId,
        createdAt: {
          lt: startDate,
        },
      },
    });

    if (totalSubscriptions > 0) {
      const churnRate = (churnedSubscriptions / totalSubscriptions) * 100;

      await this.prisma.analyticsEvent.create({
        data: {
          companyId: companyId || '',
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
