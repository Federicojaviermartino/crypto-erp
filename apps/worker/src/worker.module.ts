import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from '@crypto-erp/database';

// Processors
import { BlockchainSyncProcessor } from './processors/blockchain-sync.processor.js';
import { PriceUpdateProcessor } from './processors/price-update.processor.js';
import { VerifactuSendProcessor } from './processors/verifactu-send.processor.js';
import { JournalEntryProcessor } from './processors/journal-entry.processor.js';
import { AiCategorizeProcessor } from './processors/ai-categorize.processor.js';
import { EmailSendProcessor } from './processors/email-send.processor.js';

// Queue names - exported for use in API
export const QUEUE_NAMES = {
  BLOCKCHAIN_SYNC: 'blockchain-sync',
  PRICE_UPDATE: 'price-update',
  VERIFACTU_SEND: 'verifactu-send',
  JOURNAL_ENTRY: 'journal-entry',
  AI_CATEGORIZE: 'ai-categorize',
  EMAIL_SEND: 'email-send',
} as const;

@Module({
  imports: [
    // Environment configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),

    // Schedule module for cron jobs
    ScheduleModule.forRoot(),

    // BullMQ configuration with Redis connection
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD', undefined),
          db: config.get<number>('REDIS_DB', 0),
        },
        defaultJobOptions: {
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: 500,     // Keep last 500 failed jobs
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }),
    }),

    // Register queues
    BullModule.registerQueue(
      { name: QUEUE_NAMES.BLOCKCHAIN_SYNC },
      { name: QUEUE_NAMES.PRICE_UPDATE },
      { name: QUEUE_NAMES.VERIFACTU_SEND },
      { name: QUEUE_NAMES.JOURNAL_ENTRY },
      { name: QUEUE_NAMES.AI_CATEGORIZE },
      { name: QUEUE_NAMES.EMAIL_SEND },
    ),
  ],
  providers: [
    PrismaService,
    Logger,
    // Processors
    BlockchainSyncProcessor,
    PriceUpdateProcessor,
    VerifactuSendProcessor,
    JournalEntryProcessor,
    AiCategorizeProcessor,
    EmailSendProcessor,
  ],
})
export class WorkerModule {}
