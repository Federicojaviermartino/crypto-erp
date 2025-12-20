import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '@crypto-erp/database';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: Date;
  services: {
    database: 'healthy' | 'unhealthy';
    redis: 'healthy' | 'unhealthy';
  };
  uptime: number;
}

export interface RegionalHealthStatus {
  status: 'ok' | 'degraded' | 'error';
  timestamp: Date;
  region: string;
  services: {
    primaryDatabase: 'healthy' | 'unhealthy';
    readReplicas: {
      region: string;
      status: 'healthy' | 'unhealthy';
      latency: number;
    }[];
    redis: 'healthy' | 'unhealthy';
  };
  replicaCount: number;
  uptime: number;
}

@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('email-send') private emailQueue: Queue,
  ) {}

  @Get()
  async check(): Promise<HealthStatus> {
    const [dbOk, redisOk] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    return {
      status: dbOk && redisOk ? 'ok' : 'error',
      timestamp: new Date(),
      services: {
        database: dbOk ? 'healthy' : 'unhealthy',
        redis: redisOk ? 'healthy' : 'unhealthy',
      },
      uptime: process.uptime(),
    };
  }

  @Get('liveness')
  async liveness() {
    return { status: 'ok', timestamp: new Date() };
  }

  @Get('readiness')
  async readiness(): Promise<HealthStatus> {
    return this.check();
  }

  @Get('regional')
  async regionalHealth(): Promise<RegionalHealthStatus> {
    const primaryRegion = process.env['DATABASE_PRIMARY_REGION'] || 'eu';
    const [primaryOk, replicaStatuses, redisOk] = await Promise.all([
      this.checkDatabase(),
      this.checkReadReplicas(),
      this.checkRedis(),
    ]);

    const replicaCount = this.prisma.getReplicaCount();
    const allHealthy = primaryOk && redisOk && replicaStatuses.every(r => r.status === 'healthy');
    const anyUnhealthy = !primaryOk || !redisOk || replicaStatuses.some(r => r.status === 'unhealthy');

    return {
      status: allHealthy ? 'ok' : anyUnhealthy ? 'error' : 'degraded',
      timestamp: new Date(),
      region: primaryRegion,
      services: {
        primaryDatabase: primaryOk ? 'healthy' : 'unhealthy',
        readReplicas: replicaStatuses,
        redis: redisOk ? 'healthy' : 'unhealthy',
      },
      replicaCount,
      uptime: process.uptime(),
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      await this.emailQueue.client.ping();
      return true;
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  private async checkReadReplicas(): Promise<
    Array<{ region: string; status: 'healthy' | 'unhealthy'; latency: number }>
  > {
    const regions = this.prisma.getAvailableRegions();
    const results = await Promise.all(
      regions.map(async (region) => {
        const startTime = Date.now();
        try {
          const replica = this.prisma.getReadReplica(region);
          await replica.$queryRaw`SELECT 1`;
          const latency = Date.now() - startTime;
          return { region, status: 'healthy' as const, latency };
        } catch (error) {
          console.error(`Read replica health check failed for ${region}:`, error);
          return { region, status: 'unhealthy' as const, latency: -1 };
        }
      }),
    );
    return results;
  }
}
