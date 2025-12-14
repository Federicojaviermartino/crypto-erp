import { Module } from '@nestjs/common';
import { PrismaModule } from '@crypto-erp/database';
import { HealthController } from './controllers/health.controller.js';

@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
})
export class CommonModule {}
