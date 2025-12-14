import { Module } from '@nestjs/common';
import { GDPRService } from './gdpr.service';
import { GDPRController } from './gdpr.controller';
import { PrismaService } from '@crypto-erp/database';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [GDPRController],
  providers: [GDPRService, PrismaService],
  exports: [GDPRService],
})
export class GDPRModule {}
