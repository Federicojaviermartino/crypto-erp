import { Module } from '@nestjs/common';
import { PrometheusModule, makeCounterProvider, makeHistogramProvider, makeGaugeProvider } from '@willsoto/nestjs-prometheus';
import { MetricsService } from './metrics.service.js';
import { MetricsInterceptor } from './metrics.interceptor.js';
import { MetricsController } from './metrics.controller.js';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
        config: {
          prefix: 'crypto_erp_',
        },
      },
    }),
  ],
  controllers: [MetricsController],
  providers: [
    // HTTP Metrics
    makeCounterProvider({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    }),
    makeHistogramProvider({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    }),

    // Database Metrics
    makeHistogramProvider({
      name: 'db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    }),
    makeGaugeProvider({
      name: 'db_connections_active',
      help: 'Number of active database connections',
      labelNames: ['pool'],
    }),

    // Business Metrics
    makeCounterProvider({
      name: 'invoices_created_total',
      help: 'Total number of invoices created',
      labelNames: ['company_id', 'type'],
    }),
    makeCounterProvider({
      name: 'crypto_transactions_synced_total',
      help: 'Total number of crypto transactions synced',
      labelNames: ['blockchain', 'type'],
    }),
    makeCounterProvider({
      name: 'ai_messages_total',
      help: 'Total number of AI messages processed',
      labelNames: ['company_id', 'provider'],
    }),
    makeCounterProvider({
      name: 'verifactu_submissions_total',
      help: 'Total number of Verifactu submissions',
      labelNames: ['company_id', 'status'],
    }),

    // Queue Metrics
    makeCounterProvider({
      name: 'queue_jobs_total',
      help: 'Total number of queue jobs processed',
      labelNames: ['queue', 'status'],
    }),
    makeGaugeProvider({
      name: 'queue_jobs_active',
      help: 'Number of active queue jobs',
      labelNames: ['queue'],
    }),
    makeCounterProvider({
      name: 'queue_jobs_failed_total',
      help: 'Total number of failed queue jobs',
      labelNames: ['queue'],
    }),

    // Subscription Metrics
    makeGaugeProvider({
      name: 'subscriptions_active',
      help: 'Number of active subscriptions',
    }),
    makeCounterProvider({
      name: 'subscriptions_churned_total',
      help: 'Total number of churned subscriptions',
      labelNames: ['plan', 'reason'],
    }),
    makeGaugeProvider({
      name: 'revenue_mrr',
      help: 'Monthly Recurring Revenue in EUR',
    }),

    MetricsService,
    MetricsInterceptor,
  ],
  exports: [MetricsService, MetricsInterceptor],
})
export class MonitoringModule {}
