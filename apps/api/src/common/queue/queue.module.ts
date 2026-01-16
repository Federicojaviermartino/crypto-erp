import { Module, DynamicModule, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

const QUEUE_NAMES = [
  'blockchain-sync',
  'price-update',
  'verifactu-send',
  'journal-entry',
  'email-send',
  'webhook-delivery',
  'ai-categorize',
];

@Module({})
export class QueueModule {
  private static readonly logger = new Logger('QueueModule');

  static forRoot(): DynamicModule {
    return {
      module: QueueModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: 'QUEUE_ENABLED',
          useFactory: (config: ConfigService) => {
            const redisHost = config.get<string>('REDIS_HOST');
            const enabled = !!redisHost && redisHost !== 'localhost';

            if (!enabled) {
              this.logger.warn(
                'Redis not configured (REDIS_HOST not set). Background job queues are disabled.',
              );
            }

            return enabled;
          },
          inject: [ConfigService],
        },
      ],
      exports: ['QUEUE_ENABLED'],
    };
  }

  static forRootAsync(): DynamicModule {
    const redisHost = process.env['REDIS_HOST'];
    const isRedisConfigured = !!redisHost && redisHost !== 'localhost';

    if (!isRedisConfigured) {
      this.logger.warn(
        'Redis not configured. Skipping BullMQ initialization. Background jobs will not work.',
      );
      return {
        module: QueueModule,
        providers: [
          {
            provide: 'QUEUE_ENABLED',
            useValue: false,
          },
        ],
        exports: ['QUEUE_ENABLED'],
      };
    }

    const useTls =
      process.env['REDIS_TLS'] === 'true' || redisHost.includes('upstash.io');

    return {
      module: QueueModule,
      imports: [
        BullModule.forRoot({
          connection: {
            host: redisHost,
            port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
            password: process.env['REDIS_PASSWORD'],
            db: parseInt(process.env['REDIS_DB'] || '0', 10),
            ...(useTls && { tls: {} }),
          },
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 500,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
        }),
        BullModule.registerQueue(
          ...QUEUE_NAMES.map((name) => ({ name })),
        ),
      ],
      providers: [
        {
          provide: 'QUEUE_ENABLED',
          useValue: true,
        },
      ],
      exports: ['QUEUE_ENABLED', BullModule],
    };
  }
}
