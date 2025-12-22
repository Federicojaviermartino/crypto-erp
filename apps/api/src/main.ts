import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { AppModule } from './app.module.js';
import { SentryExceptionFilter } from './common/filters/sentry-exception.filter.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Initialize Sentry (FIRST, before anything else)
  const sentryDsn = configService.get<string>('SENTRY_DSN');
  const nodeEnv = configService.get<string>('nodeEnv');

  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: nodeEnv || 'development',
      integrations: [new ProfilingIntegration()],
      tracesSampleRate: nodeEnv === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
      profilesSampleRate: nodeEnv === 'production' ? 0.1 : 1.0,
      beforeSend(event) {
        // Filter out sensitive data
        if (event.request) {
          delete event.request.cookies;
          if (event.request.headers) {
            delete event.request.headers.authorization;
            delete event.request.headers.cookie;
          }
        }
        return event;
      },
    });

    console.log('Sentry initialized for error tracking');

    // Register global Sentry exception filter
    app.useGlobalFilters(new SentryExceptionFilter());
  } else {
    console.warn('SENTRY_DSN not configured - error tracking disabled');
  }

  // Security headers
  app.use(helmet());

  // Response compression (gzip/deflate)
  app.use(compression({
    threshold: 1024, // Only compress responses larger than 1KB
    level: 6, // Compression level (1-9, 6 is a good balance)
  }));

  // CORS configuration
  const frontendUrl = configService.get<string>('frontendUrl');

  const allowedOrigins = [
    'http://localhost:4200',
    'http://localhost:3000',
    frontendUrl,
  ].filter((origin): origin is string => Boolean(origin));

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Company-Id'],
  });

  // API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'api/v',
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation (only in development)
  const swaggerEnabled = nodeEnv !== 'production';
  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Crypto ERP API')
      .setDescription(
        'API for Crypto ERP - Spanish accounting with cryptocurrency support and Verifactu compliance',
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT access token',
          in: 'header',
        },
        'access-token',
      )
      .addApiKey(
        {
          type: 'apiKey',
          name: 'X-Company-Id',
          in: 'header',
          description: 'Company ID for multi-tenancy',
        },
        'company-id',
      )
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management')
      .addTag('companies', 'Company/tenant management')
      .addTag('accounting', 'Accounting operations')
      .addTag('invoicing', 'Invoice management and Verifactu')
      .addTag('crypto', 'Cryptocurrency wallets and transactions')
      .addTag('ai', 'AI assistant and automation')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    console.log(`Swagger documentation available at /api/docs`);
  }

  // Start server
  const port = configService.get<number>('port') || 3000;
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

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});