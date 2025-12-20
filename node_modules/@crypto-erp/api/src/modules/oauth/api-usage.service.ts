import { Injectable } from '@nestjs/common';
import { PrismaService } from '@crypto-erp/database';

/**
 * API Usage Tracking Service
 * Tracks API usage for rate limiting and analytics
 */
@Injectable()
export class ApiUsageService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record an API request for usage tracking
   */
  async recordRequest(data: {
    appId?: string;
    companyId: string;
    userId?: string;
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      await this.prisma.apiUsage.create({
        data: {
          appId: data.appId,
          companyId: data.companyId,
          userId: data.userId,
          endpoint: data.endpoint,
          method: data.method,
          statusCode: data.statusCode,
          responseTime: data.responseTime,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      // Don't fail the request if usage tracking fails
      console.error('Failed to record API usage:', error);
    }
  }

  /**
   * Get request count for an app in the last hour
   */
  async getHourlyRequestCount(appId: string): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const result = await this.prisma.apiUsage.count({
      where: {
        appId,
        timestamp: {
          gte: oneHourAgo,
        },
      },
    });

    return result;
  }

  /**
   * Get request count for an app in the last 24 hours
   */
  async getDailyRequestCount(appId: string): Promise<number> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await this.prisma.apiUsage.count({
      where: {
        appId,
        timestamp: {
          gte: oneDayAgo,
        },
      },
    });

    return result;
  }

  /**
   * Get usage statistics for an app
   */
  async getAppUsageStats(appId: string, startDate?: Date, endDate?: Date) {
    const where: any = {
      appId,
    };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const [totalRequests, avgResponseTime, statusCodeDistribution] =
      await Promise.all([
        // Total requests
        this.prisma.apiUsage.count({ where }),

        // Average response time
        this.prisma.apiUsage.aggregate({
          where,
          _avg: {
            responseTime: true,
          },
        }),

        // Status code distribution
        this.prisma.apiUsage.groupBy({
          by: ['statusCode'],
          where,
          _count: true,
          orderBy: {
            _count: {
              statusCode: 'desc',
            },
          },
        }),
      ]);

    // Get most used endpoints
    const topEndpoints = await this.prisma.apiUsage.groupBy({
      by: ['endpoint', 'method'],
      where,
      _count: true,
      orderBy: {
        _count: {
          endpoint: 'desc',
        },
      },
      take: 10,
    });

    return {
      totalRequests,
      averageResponseTime: avgResponseTime._avg.responseTime || 0,
      statusCodeDistribution: statusCodeDistribution.map(s => ({
        statusCode: s.statusCode,
        count: s._count,
      })),
      topEndpoints: topEndpoints.map(e => ({
        endpoint: e.endpoint,
        method: e.method,
        count: e._count,
      })),
    };
  }

  /**
   * Get company usage statistics
   */
  async getCompanyUsageStats(companyId: string, startDate?: Date, endDate?: Date) {
    const where: any = {
      companyId,
    };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const [totalRequests, avgResponseTime, requestsByApp] = await Promise.all([
      // Total requests
      this.prisma.apiUsage.count({ where }),

      // Average response time
      this.prisma.apiUsage.aggregate({
        where,
        _avg: {
          responseTime: true,
        },
      }),

      // Requests by app
      this.prisma.apiUsage.groupBy({
        by: ['appId'],
        where,
        _count: true,
        orderBy: {
          _count: {
            appId: 'desc',
          },
        },
      }),
    ]);

    // Get app details for requests by app
    const appIds = requestsByApp
      .map(r => r.appId)
      .filter((id): id is string => id !== null);

    const apps = await this.prisma.oAuthApp.findMany({
      where: {
        id: {
          in: appIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const appMap = new Map(apps.map(a => [a.id, a.name]));

    return {
      totalRequests,
      averageResponseTime: avgResponseTime._avg.responseTime || 0,
      requestsByApp: requestsByApp.map(r => ({
        appId: r.appId,
        appName: r.appId ? appMap.get(r.appId) || 'Unknown' : 'Direct API',
        count: r._count,
      })),
    };
  }

  /**
   * Clean up old usage data (older than 90 days)
   * Should be run periodically via a cron job
   */
  async cleanupOldData() {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const result = await this.prisma.apiUsage.deleteMany({
      where: {
        timestamp: {
          lt: ninetyDaysAgo,
        },
      },
    });

    return {
      deletedCount: result.count,
    };
  }
}
