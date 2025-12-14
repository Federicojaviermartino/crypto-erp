"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "MetricsService", {
    enumerable: true,
    get: function() {
        return MetricsService;
    }
});
const _common = require("@nestjs/common");
const _nestjsprometheus = require("@willsoto/nestjs-prometheus");
const _promclient = require("prom-client");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
function _ts_param(paramIndex, decorator) {
    return function(target, key) {
        decorator(target, key, paramIndex);
    };
}
let MetricsService = class MetricsService {
    /**
   * Track HTTP request
   */ trackHttpRequest(method, route, statusCode, duration) {
        this.httpRequestsTotal.labels(method, route, statusCode.toString()).inc();
        this.httpRequestDuration.labels(method, route).observe(duration);
    }
    /**
   * Track database query
   */ trackDbQuery(operation, duration) {
        this.dbQueryDuration.labels(operation).observe(duration);
    }
    /**
   * Track invoice creation
   */ trackInvoiceCreated(companyId, type) {
        this.invoicesCreated.labels(companyId, type).inc();
    }
    /**
   * Track crypto transaction sync
   */ trackCryptoTransactionSynced(blockchain, type) {
        this.cryptoTransactionsSynced.labels(blockchain, type).inc();
    }
    /**
   * Track AI message
   */ trackAiMessage(companyId, provider) {
        this.aiMessages.labels(companyId, provider).inc();
    }
    /**
   * Track Verifactu submission
   */ trackVerifactuSubmission(companyId, status) {
        this.verifactuSubmissions.labels(companyId, status).inc();
    }
    /**
   * Track queue job
   */ trackQueueJob(queue, status) {
        this.queueJobsTotal.labels(queue, status).inc();
        if (status === 'failed') {
            this.queueJobsFailed.labels(queue).inc();
        }
    }
    /**
   * Update active jobs gauge
   */ setQueueJobsActive(queue, count) {
        this.queueJobsActive.labels(queue).set(count);
    }
    /**
   * Update subscription metrics
   */ updateSubscriptionMetrics(activeCount, mrr) {
        this.subscriptionsActive.set(activeCount);
        this.revenueMRR.set(mrr);
    }
    /**
   * Track subscription churn
   */ trackSubscriptionChurn(plan, reason) {
        this.subscriptionsChurned.labels(plan, reason).inc();
    }
    /**
   * Get all metrics as Prometheus text format
   */ async getMetrics() {
        return this.registry.metrics();
    }
    constructor(// HTTP Metrics
    httpRequestsTotal, httpRequestDuration, // Database Metrics
    dbQueryDuration, dbConnectionsActive, // Business Metrics
    invoicesCreated, cryptoTransactionsSynced, aiMessages, verifactuSubmissions, // Queue Metrics
    queueJobsTotal, queueJobsActive, queueJobsFailed, // Subscription Metrics
    subscriptionsActive, subscriptionsChurned, revenueMRR, registry){
        this.httpRequestsTotal = httpRequestsTotal;
        this.httpRequestDuration = httpRequestDuration;
        this.dbQueryDuration = dbQueryDuration;
        this.dbConnectionsActive = dbConnectionsActive;
        this.invoicesCreated = invoicesCreated;
        this.cryptoTransactionsSynced = cryptoTransactionsSynced;
        this.aiMessages = aiMessages;
        this.verifactuSubmissions = verifactuSubmissions;
        this.queueJobsTotal = queueJobsTotal;
        this.queueJobsActive = queueJobsActive;
        this.queueJobsFailed = queueJobsFailed;
        this.subscriptionsActive = subscriptionsActive;
        this.subscriptionsChurned = subscriptionsChurned;
        this.revenueMRR = revenueMRR;
        this.registry = registry;
    }
};
MetricsService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _nestjsprometheus.InjectMetric)('http_requests_total')),
    _ts_param(1, (0, _nestjsprometheus.InjectMetric)('http_request_duration_seconds')),
    _ts_param(2, (0, _nestjsprometheus.InjectMetric)('db_query_duration_seconds')),
    _ts_param(3, (0, _nestjsprometheus.InjectMetric)('db_connections_active')),
    _ts_param(4, (0, _nestjsprometheus.InjectMetric)('invoices_created_total')),
    _ts_param(5, (0, _nestjsprometheus.InjectMetric)('crypto_transactions_synced_total')),
    _ts_param(6, (0, _nestjsprometheus.InjectMetric)('ai_messages_total')),
    _ts_param(7, (0, _nestjsprometheus.InjectMetric)('verifactu_submissions_total')),
    _ts_param(8, (0, _nestjsprometheus.InjectMetric)('queue_jobs_total')),
    _ts_param(9, (0, _nestjsprometheus.InjectMetric)('queue_jobs_active')),
    _ts_param(10, (0, _nestjsprometheus.InjectMetric)('queue_jobs_failed_total')),
    _ts_param(11, (0, _nestjsprometheus.InjectMetric)('subscriptions_active')),
    _ts_param(12, (0, _nestjsprometheus.InjectMetric)('subscriptions_churned_total')),
    _ts_param(13, (0, _nestjsprometheus.InjectMetric)('revenue_mrr')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _promclient.Counter === "undefined" ? Object : _promclient.Counter,
        typeof _promclient.Histogram === "undefined" ? Object : _promclient.Histogram,
        typeof _promclient.Histogram === "undefined" ? Object : _promclient.Histogram,
        typeof _promclient.Gauge === "undefined" ? Object : _promclient.Gauge,
        typeof _promclient.Counter === "undefined" ? Object : _promclient.Counter,
        typeof _promclient.Counter === "undefined" ? Object : _promclient.Counter,
        typeof _promclient.Counter === "undefined" ? Object : _promclient.Counter,
        typeof _promclient.Counter === "undefined" ? Object : _promclient.Counter,
        typeof _promclient.Counter === "undefined" ? Object : _promclient.Counter,
        typeof _promclient.Gauge === "undefined" ? Object : _promclient.Gauge,
        typeof _promclient.Counter === "undefined" ? Object : _promclient.Counter,
        typeof _promclient.Gauge === "undefined" ? Object : _promclient.Gauge,
        typeof _promclient.Counter === "undefined" ? Object : _promclient.Counter,
        typeof _promclient.Gauge === "undefined" ? Object : _promclient.Gauge,
        typeof _promclient.Registry === "undefined" ? Object : _promclient.Registry
    ])
], MetricsService);

//# sourceMappingURL=metrics.service.js.map