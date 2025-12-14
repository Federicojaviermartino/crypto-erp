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
}
