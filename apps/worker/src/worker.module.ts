import { Module, Logger, DynamicModule } from '@nestjs/common';
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

// Check if Redis is configured
const redisHost = process.env['REDIS_HOST'];
const isRedisConfigured = !!redisHost && redisHost !== 'localhost';

// Helper function to get BullMQ modules conditionally
function getBullModules(): DynamicModule[] {
  if (!isRedisConfigured) {
    console.warn('[WorkerModule] REDIS_HOST not configured. Worker will start without job processing capabilities.');
    return [];
  }

  const useTls = process.env['REDIS_TLS'] === 'true' || redisHost!.includes('upstash.io');

  return [
    BullModule.forRoot({
      connection: {
        host: redisHost!,
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
      { name: QUEUE_NAMES.BLOCKCHAIN_SYNC },
      { name: QUEUE_NAMES.PRICE_UPDATE },
      { name: QUEUE_NAMES.VERIFACTU_SEND },
      { name: QUEUE_NAMES.JOURNAL_ENTRY },
      { name: QUEUE_NAMES.AI_CATEGORIZE },
      { name: QUEUE_NAMES.EMAIL_SEND },
    ),
  ];
}

// Helper function to get processors conditionally
function getProcessors(): any[] {
  if (!isRedisConfigured) {
    return [];
  }

  return [
    BlockchainSyncProcessor,
    PriceUpdateProcessor,
    VerifactuSendProcessor,
    JournalEntryProcessor,
    AiCategorizeProcessor,
    EmailSendProcessor,
  ];
}

@Module({
  imports: [
    // Environment configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),

    // Schedule module for cron jobs
    ScheduleModule.forRoot(),

    // BullMQ configuration (conditional - only if Redis is configured)
    ...getBullModules(),
  ],
  providers: [
    PrismaService,
    Logger,
    // Processors (conditional - only if Redis is configured)
    ...getProcessors(),
  ],
})
export class WorkerModule {}
