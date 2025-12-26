import { Module } from '@nestjs/common';
import { OnboardingService } from './onboarding.service.js';
import { OnboardingController } from './onboarding.controller.js';
import { PrismaModule } from '@crypto-erp/database';

@Module({
  imports: [PrismaModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
