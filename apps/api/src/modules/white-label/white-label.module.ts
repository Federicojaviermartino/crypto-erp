import { Module } from '@nestjs/common';
import { WhiteLabelController } from './white-label.controller.js';
import { WhiteLabelService } from './white-label.service.js';
import { PrismaModule } from '@crypto-erp/database';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [WhiteLabelController],
  providers: [WhiteLabelService],
  exports: [WhiteLabelService],
})
export class WhiteLabelModule {}
