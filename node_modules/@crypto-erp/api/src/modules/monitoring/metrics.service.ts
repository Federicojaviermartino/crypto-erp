import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram, Gauge, Registry } from 'prom-client';

/**
 * Metrics Service for Prometheus
 * Tracks critical business and technical metrics
 */
@Injectable()
export class MetricsService {
  constructor(
    // HTTP Metrics
    @InjectMetric('http_requests_total') public httpRequestsTotal: Counter<string>,
    @InjectMetric('http_request_duration_seconds') public httpRequestDuration: Histogram<string>,

    // Database Metrics
    @InjectMetric('db_query_duration_seconds') public dbQueryDuration: Histogram<string>,
    @InjectMetric('db_connections_active') public dbConnectionsActive: Gauge<string>,

    // Business Metrics
    @InjectMetric('invoices_created_total') public invoicesCreated: Counter<string>,
    @InjectMetric('crypto_transactions_synced_total') public cryptoTransactionsSynced: Counter<string>,
    @InjectMetric('ai_messages_total') public aiMessages: Counter<string>,
    @InjectMetric('verifactu_submissions_total') public verifactuSubmissions: Counter<string>,

    // Queue Metrics
    @InjectMetric('queue_jobs_total') public queueJobsTotal: Counter<string>,
    @InjectMetric('queue_jobs_active') public queueJobsActive: Gauge<string>,
    @InjectMetric('queue_jobs_failed_total') public queueJobsFailed: Counter<string>,

    // Subscription Metrics
    @InjectMetric('subscriptions_active') public subscriptionsActive: Gauge<string>,
    @InjectMetric('subscriptions_churned_total') public subscriptionsChurned: Counter<string>,
    @InjectMetric('revenue_mrr') public revenueMRR: Gauge<string>,

    private readonly registry: Registry,
  ) {}

  /**
   * Track HTTP request
   */
  trackHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    this.httpRequestsTotal.labels(method, route, statusCode.toString()).inc();
    this.httpRequestDuration.labels(method, route).observe(duration);
  }

  /**
   * Track database query
   */
  trackDbQuery(operation: string, duration: number): void {
    this.dbQueryDuration.labels(operation).observe(duration);
  }

  /**
   * Track invoice creation
   */
  trackInvoiceCreated(companyId: string, type: string): void {
    this.invoicesCreated.labels(companyId, type).inc();
  }

  /**
   * Track crypto transaction sync
   */
  trackCryptoTransactionSynced(blockchain: string, type: string): void {
    this.cryptoTransactionsSynced.labels(blockchain, type).inc();
  }

  /**
   * Track AI message
   */
  trackAiMessage(companyId: string, provider: string): void {
    this.aiMessages.labels(companyId, provider).inc();
  }

  /**
   * Track Verifactu submission
   */
  trackVerifactuSubmission(companyId: string, status: 'success' | 'error'): void {
    this.verifactuSubmissions.labels(companyId, status).inc();
  }

  /**
   * Track queue job
   */
  trackQueueJob(queue: string, status: 'completed' | 'failed'): void {
    this.queueJobsTotal.labels(queue, status).inc();
    if (status === 'failed') {
      this.queueJobsFailed.labels(queue).inc();
    }
  }

  /**
   * Update active jobs gauge
   */
  setQueueJobsActive(queue: string, count: number): void {
    this.queueJobsActive.labels(queue).set(count);
  }

  /**
   * Update subscription metrics
   */
  updateSubscriptionMetrics(activeCount: number, mrr: number): void {
    this.subscriptionsActive.set(activeCount);
    this.revenueMRR.set(mrr);
  }

  /**
   * Track subscription churn
   */
  trackSubscriptionChurn(plan: string, reason: string): void {
    this.subscriptionsChurned.labels(plan, reason).inc();
  }

  /**
   * Get all metrics as Prometheus text format
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
