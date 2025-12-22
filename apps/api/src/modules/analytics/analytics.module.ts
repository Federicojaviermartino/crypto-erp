import { Module } from '@nestjs/common';
import { PrismaModule } from '@crypto-erp/database';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsController } from './analytics.controller.js';
import { AnalyticsGateway } from './analytics.gateway.js';
import { ReportsService } from './reports.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsGateway, ReportsService],
  exports: [AnalyticsService, AnalyticsGateway, ReportsService],
})
export class AnalyticsModule {}
