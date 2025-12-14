"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "MonitoringModule", {
    enumerable: true,
    get: function() {
        return MonitoringModule;
    }
});
const _common = require("@nestjs/common");
const _nestjsprometheus = require("@willsoto/nestjs-prometheus");
const _metricsservice = require("./metrics.service.js");
const _metricsinterceptor = require("./metrics.interceptor.js");
const _metricscontroller = require("./metrics.controller.js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let MonitoringModule = class MonitoringModule {
};
MonitoringModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _nestjsprometheus.PrometheusModule.register({
                path: '/metrics',
                defaultMetrics: {
                    enabled: true,
                    config: {
                        prefix: 'crypto_erp_'
                    }
                }
            })
        ],
        controllers: [
            _metricscontroller.MetricsController
        ],
        providers: [
            // HTTP Metrics
            (0, _nestjsprometheus.makeCounterProvider)({
                name: 'http_requests_total',
                help: 'Total number of HTTP requests',
                labelNames: [
                    'method',
                    'route',
                    'status_code'
                ]
            }),
            (0, _nestjsprometheus.makeHistogramProvider)({
                name: 'http_request_duration_seconds',
                help: 'HTTP request duration in seconds',
                labelNames: [
                    'method',
                    'route'
                ],
                buckets: [
                    0.01,
                    0.05,
                    0.1,
                    0.5,
                    1,
                    2,
                    5
                ]
            }),
            // Database Metrics
            (0, _nestjsprometheus.makeHistogramProvider)({
                name: 'db_query_duration_seconds',
                help: 'Database query duration in seconds',
                labelNames: [
                    'operation'
                ],
                buckets: [
                    0.001,
                    0.005,
                    0.01,
                    0.05,
                    0.1,
                    0.5,
                    1
                ]
            }),
            (0, _nestjsprometheus.makeGaugeProvider)({
                name: 'db_connections_active',
                help: 'Number of active database connections',
                labelNames: [
                    'pool'
                ]
            }),
            // Business Metrics
            (0, _nestjsprometheus.makeCounterProvider)({
                name: 'invoices_created_total',
                help: 'Total number of invoices created',
                labelNames: [
                    'company_id',
                    'type'
                ]
            }),
            (0, _nestjsprometheus.makeCounterProvider)({
                name: 'crypto_transactions_synced_total',
                help: 'Total number of crypto transactions synced',
                labelNames: [
                    'blockchain',
                    'type'
                ]
            }),
            (0, _nestjsprometheus.makeCounterProvider)({
                name: 'ai_messages_total',
                help: 'Total number of AI messages processed',
                labelNames: [
                    'company_id',
                    'provider'
                ]
            }),
            (0, _nestjsprometheus.makeCounterProvider)({
                name: 'verifactu_submissions_total',
                help: 'Total number of Verifactu submissions',
                labelNames: [
                    'company_id',
                    'status'
                ]
            }),
            // Queue Metrics
            (0, _nestjsprometheus.makeCounterProvider)({
                name: 'queue_jobs_total',
                help: 'Total number of queue jobs processed',
                labelNames: [
                    'queue',
                    'status'
                ]
            }),
            (0, _nestjsprometheus.makeGaugeProvider)({
                name: 'queue_jobs_active',
                help: 'Number of active queue jobs',
                labelNames: [
                    'queue'
                ]
            }),
            (0, _nestjsprometheus.makeCounterProvider)({
                name: 'queue_jobs_failed_total',
                help: 'Total number of failed queue jobs',
                labelNames: [
                    'queue'
                ]
            }),
            // Subscription Metrics
            (0, _nestjsprometheus.makeGaugeProvider)({
                name: 'subscriptions_active',
                help: 'Number of active subscriptions'
            }),
            (0, _nestjsprometheus.makeCounterProvider)({
                name: 'subscriptions_churned_total',
                help: 'Total number of churned subscriptions',
                labelNames: [
                    'plan',
                    'reason'
                ]
            }),
            (0, _nestjsprometheus.makeGaugeProvider)({
                name: 'revenue_mrr',
                help: 'Monthly Recurring Revenue in EUR'
            }),
            _metricsservice.MetricsService,
            _metricsinterceptor.MetricsInterceptor
        ],
        exports: [
            _metricsservice.MetricsService,
            _metricsinterceptor.MetricsInterceptor
        ]
    })
], MonitoringModule);

//# sourceMappingURL=monitoring.module.js.map