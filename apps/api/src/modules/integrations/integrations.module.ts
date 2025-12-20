import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller.js';
import { BaseIntegrationService } from './base/base-integration.service.js';
import { QuickBooksService } from './quickbooks/quickbooks.service.js';
import { XeroService } from './xero/xero.service.js';
import { PrismaModule } from '@crypto-erp/database';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [IntegrationsController],
  providers: [
    BaseIntegrationService,
    QuickBooksService,
    XeroService,
  ],
  exports: [BaseIntegrationService, QuickBooksService, XeroService],
})
export class IntegrationsModule {}
