"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AppModule", {
    enumerable: true,
    get: function() {
        return AppModule;
    }
});
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
const _throttler = require("@nestjs/throttler");
const _bullmq = require("@nestjs/bullmq");
const _core = require("@nestjs/core");
const _database = require("../../../libs/database/src");
const _configuration = /*#__PURE__*/ _interop_require_default(require("./config/configuration.js"));
const _httpexceptionfilter = require("./common/filters/http-exception.filter.js");
const _authmodule = require("./modules/auth/auth.module.js");
const _usersmodule = require("./modules/users/users.module.js");
const _companiesmodule = require("./modules/companies/companies.module.js");
const _accountingmodule = require("./modules/accounting/accounting.module.js");
const _invoicingmodule = require("./modules/invoicing/invoicing.module.js");
const _cryptomodule = require("./modules/crypto/crypto.module.js");
const _aimodule = require("./modules/ai/ai.module.js");
const _fiscalmodule = require("./modules/fiscal/fiscal.module.js");
const _analyticsmodule = require("./modules/analytics/analytics.module.js");
const _paymentsmodule = require("./modules/payments/payments.module.js");
const _monitoringmodule = require("./modules/monitoring/monitoring.module.js");
const _metricsinterceptor = require("./modules/monitoring/metrics.interceptor.js");
const _commonmodule = require("./common/common.module.js");
const _onboardingmodule = require("./modules/onboarding/onboarding.module.js");
const _cachemodule = require("./common/cache/cache.module.js");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let AppModule = class AppModule {
};
AppModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            // Configuration
            _config.ConfigModule.forRoot({
                isGlobal: true,
                load: [
                    _configuration.default
                ],
                envFilePath: [
                    '.env.local',
                    '.env'
                ]
            }),
            // Rate limiting
            _throttler.ThrottlerModule.forRoot([
                {
                    name: 'short',
                    ttl: 1000,
                    limit: 10
                },
                {
                    name: 'medium',
                    ttl: 10000,
                    limit: 50
                },
                {
                    name: 'long',
                    ttl: 60000,
                    limit: 100
                }
            ]),
            // BullMQ for background job queues
            _bullmq.BullModule.forRootAsync({
                imports: [
                    _config.ConfigModule
                ],
                inject: [
                    _config.ConfigService
                ],
                useFactory: (config)=>({
                        connection: {
                            host: config.get('REDIS_HOST', 'localhost'),
                            port: config.get('REDIS_PORT', 6379),
                            password: config.get('REDIS_PASSWORD', undefined),
                            db: config.get('REDIS_DB', 0)
                        },
                        defaultJobOptions: {
                            removeOnComplete: 100,
                            removeOnFail: 500,
                            attempts: 3,
                            backoff: {
                                type: 'exponential',
                                delay: 2000
                            }
                        }
                    })
            }),
            _bullmq.BullModule.registerQueue({
                name: 'blockchain-sync'
            }, {
                name: 'price-update'
            }, {
                name: 'verifactu-send'
            }, {
                name: 'journal-entry'
            }),
            // Database
            _database.PrismaModule,
            // Cache
            _cachemodule.CacheModule,
            // Common (health checks, etc.)
            _commonmodule.CommonModule,
            // Feature modules
            _authmodule.AuthModule,
            _usersmodule.UsersModule,
            _companiesmodule.CompaniesModule,
            _accountingmodule.AccountingModule,
            _invoicingmodule.InvoicingModule,
            _cryptomodule.CryptoModule,
            _aimodule.AiModule,
            _fiscalmodule.FiscalModule,
            _analyticsmodule.AnalyticsModule,
            _paymentsmodule.PaymentsModule,
            _monitoringmodule.MonitoringModule,
            _onboardingmodule.OnboardingModule
        ],
        providers: [
            // Global exception filter
            {
                provide: _core.APP_FILTER,
                useClass: _httpexceptionfilter.GlobalExceptionFilter
            },
            // Global rate limiting guard
            {
                provide: _core.APP_GUARD,
                useClass: _throttler.ThrottlerGuard
            },
            // Global metrics interceptor
            {
                provide: _core.APP_INTERCEPTOR,
                useClass: _metricsinterceptor.MetricsInterceptor
            }
        ]
    })
], AppModule);

//# sourceMappingURL=app.module.js.map