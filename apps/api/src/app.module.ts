import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from '@crypto-erp/database';
import configuration from './config/configuration.js';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { CompaniesModule } from './modules/companies/companies.module.js';
import { AccountingModule } from './modules/accounting/accounting.module.js';
import { InvoicingModule } from './modules/invoicing/invoicing.module.js';
import { CryptoModule } from './modules/crypto/crypto.module.js';
import { AiModule } from './modules/ai/ai.module.js';
import { FiscalModule } from './modules/fiscal/fiscal.module.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { MonitoringModule } from './modules/monitoring/monitoring.module.js';
import { MetricsInterceptor } from './modules/monitoring/metrics.interceptor.js';
import { CommonModule } from './common/common.module.js';
import { OnboardingModule } from './modules/onboarding/onboarding.module.js';
import { CacheModule } from './common/cache/cache.module.js';
import { OAuthModule } from './modules/oauth/oauth.module.js';
import { IntegrationsModule } from './modules/integrations/integrations.module.js';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 50,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),

    // BullMQ for background job queues
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
          removeOnComplete: 100,
          removeOnFail: 500,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }),
    }),
    BullModule.registerQueue(
      { name: 'blockchain-sync' },
      { name: 'price-update' },
      { name: 'verifactu-send' },
      { name: 'journal-entry' },
    ),

    // Database
    PrismaModule,

    // Cache
    CacheModule,

    // Common (health checks, etc.)
    CommonModule,

    // Feature modules
    AuthModule,
    UsersModule,
    CompaniesModule,
    AccountingModule,
    InvoicingModule,
    CryptoModule,
    AiModule,
    FiscalModule,
    AnalyticsModule,
    PaymentsModule,
    MonitoringModule,
    OnboardingModule,
    OAuthModule,
    IntegrationsModule,
  ],
  providers: [
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    // Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Global metrics interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {}