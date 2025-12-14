import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@crypto-erp/database';
import { PaymentsController } from './payments.controller.js';
import { StripeService } from './stripe.service.js';
import { SubscriptionsService } from './subscriptions.service.js';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [PaymentsController],
  providers: [StripeService, SubscriptionsService],
  exports: [StripeService, SubscriptionsService],
})
export class PaymentsModule {}
