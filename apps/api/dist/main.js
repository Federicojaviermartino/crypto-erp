"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _core = require("@nestjs/core");
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
const _swagger = require("@nestjs/swagger");
const _helmet = /*#__PURE__*/ _interop_require_default(require("helmet"));
const _node = /*#__PURE__*/ _interop_require_wildcard(require("@sentry/node"));
const _profilingnode = require("@sentry/profiling-node");
const _appmodule = require("./app.module.js");
const _sentryexceptionfilter = require("./common/filters/sentry-exception.filter.js");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {
        __proto__: null
    };
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
async function bootstrap() {
    const app = await _core.NestFactory.create(_appmodule.AppModule);
    const configService = app.get(_config.ConfigService);
    // Initialize Sentry (FIRST, before anything else)
    const sentryDsn = configService.get('SENTRY_DSN');
    const nodeEnv = configService.get('nodeEnv');
    if (sentryDsn) {
        _node.init({
            dsn: sentryDsn,
            environment: nodeEnv || 'development',
            integrations: [
                new _profilingnode.ProfilingIntegration()
            ],
            tracesSampleRate: nodeEnv === 'production' ? 0.1 : 1.0,
            profilesSampleRate: nodeEnv === 'production' ? 0.1 : 1.0,
            beforeSend (event) {
                // Filter out sensitive data
                if (event.request) {
                    delete event.request.cookies;
                    if (event.request.headers) {
                        delete event.request.headers.authorization;
                        delete event.request.headers.cookie;
                    }
                }
                return event;
            }
        });
        console.log('Sentry initialized for error tracking');
        // Register global Sentry exception filter
        app.useGlobalFilters(new _sentryexceptionfilter.SentryExceptionFilter());
    } else {
        console.warn('SENTRY_DSN not configured - error tracking disabled');
    }
    // Security headers
    app.use((0, _helmet.default)());
    // CORS configuration
    const frontendUrl = configService.get('frontendUrl');
    const nodeEnv = configService.get('nodeEnv');
    const allowedOrigins = [
        'http://localhost:4200',
        'http://localhost:3000',
        frontendUrl
    ].filter((origin)=>Boolean(origin));
    app.enableCors({
        origin: allowedOrigins,
        credentials: true,
        methods: [
            'GET',
            'POST',
            'PUT',
            'PATCH',
            'DELETE',
            'OPTIONS'
        ],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Company-Id'
        ]
    });
    // API versioning
    app.enableVersioning({
        type: _common.VersioningType.URI,
        defaultVersion: '1',
        prefix: 'api/v'
    });
    // Global validation pipe
    app.useGlobalPipes(new _common.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true
        }
    }));
    // Swagger documentation (only in development)
    const swaggerEnabled = nodeEnv !== 'production';
    if (swaggerEnabled) {
        const swaggerConfig = new _swagger.DocumentBuilder().setTitle('Crypto ERP API').setDescription('API for Crypto ERP - Spanish accounting with cryptocurrency support and Verifactu compliance').setVersion('1.0').addBearerAuth({
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            name: 'Authorization',
            description: 'Enter JWT access token',
            in: 'header'
        }, 'access-token').addApiKey({
            type: 'apiKey',
            name: 'X-Company-Id',
            in: 'header',
            description: 'Company ID for multi-tenancy'
        }, 'company-id').addTag('auth', 'Authentication endpoints').addTag('users', 'User management').addTag('companies', 'Company/tenant management').addTag('accounting', 'Accounting operations').addTag('invoicing', 'Invoice management and Verifactu').addTag('crypto', 'Cryptocurrency wallets and transactions').addTag('ai', 'AI assistant and automation').build();
        const document = _swagger.SwaggerModule.createDocument(app, swaggerConfig);
        _swagger.SwaggerModule.setup('api/docs', app, document, {
            swaggerOptions: {
                persistAuthorization: true
            }
        });
        console.log(`Swagger documentation available at /api/docs`);
    }
    // Start server
    const port = configService.get('port') || 3000;
    await app.listen(port);
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                     CRYPTO ERP API                            ║
╠══════════════════════════════════════════════════════════════╣
║  Environment: ${nodeEnv?.padEnd(46)}║
║  Port:        ${String(port).padEnd(46)}║
║  Frontend:    ${(frontendUrl || 'N/A').padEnd(46)}║
╚══════════════════════════════════════════════════════════════╝
  `);
}
bootstrap().catch((err)=>{
    console.error('Failed to start application:', err);
    process.exit(1);
});

//# sourceMappingURL=main.js.map