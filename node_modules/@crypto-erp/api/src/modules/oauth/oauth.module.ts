import { Module } from '@nestjs/common';
import { OAuthController } from './oauth.controller.js';
import { OAuthService } from './oauth.service.js';
import { ApiUsageService } from './api-usage.service.js';
import { PrismaModule } from '@crypto-erp/database';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ApiUsageInterceptor } from './interceptors/api-usage.interceptor.js';

@Module({
  imports: [PrismaModule],
  controllers: [OAuthController],
  providers: [
    OAuthService,
    ApiUsageService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiUsageInterceptor,
    },
  ],
  exports: [OAuthService, ApiUsageService],
})
export class OAuthModule {}
