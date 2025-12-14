import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Headers,
  RawBodyRequest,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { GetCompany } from '../auth/decorators/get-company.decorator.js';
import { UserRole } from '@prisma/client';
import { StripeService } from './stripe.service.js';
import { SubscriptionsService } from './subscriptions.service.js';
import { CreateCheckoutDto } from './dto/create-checkout.dto.js';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly stripe: StripeService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  /**
   * Get available subscription plans
   */
  @Get('plans')
  @ApiOperation({
    summary: 'Get available subscription plans',
    description: 'Returns all active subscription plans with features and pricing',
  })
  async getPlans() {
    return this.subscriptions.getPlans();
  }

  /**
   * Get current subscription
   */
  @Get('subscription')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({
    summary: 'Get current subscription',
    description: 'Returns the company subscription with plan details',
  })
  async getSubscription(@GetCompany() companyId: string) {
    return this.subscriptions.getSubscription(companyId);
  }

  /**
   * Get usage statistics
   */
  @Get('usage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({
    summary: 'Get usage statistics',
    description: 'Returns current usage stats and limits for the company',
  })
  async getUsageStats(@GetCompany() companyId: string) {
    return this.subscriptions.getUsageStats(companyId);
  }

  /**
   * Create Stripe checkout session
   */
  @Post('checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({
    summary: 'Create checkout session',
    description: 'Creates a Stripe checkout session for subscription',
  })
  @ApiResponse({
    status: 200,
    description: 'Checkout session created successfully',
  })
  async createCheckout(
    @GetCompany() companyId: string,
    @Body() dto: CreateCheckoutDto,
  ) {
    const session = await this.stripe.createCheckoutSession({
      companyId,
      planId: dto.planId,
      successUrl: dto.successUrl,
      cancelUrl: dto.cancelUrl,
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  /**
   * Create customer portal session
   */
  @Post('portal')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({
    summary: 'Create customer portal session',
    description: 'Creates a Stripe customer portal session for managing subscription',
  })
  @ApiResponse({
    status: 200,
    description: 'Portal session created successfully',
  })
  async createPortal(
    @GetCompany() companyId: string,
    @Body() body: { returnUrl: string },
  ) {
    const session = await this.stripe.createPortalSession({
      companyId,
      returnUrl: body.returnUrl,
    });

    return {
      url: session.url,
    };
  }

  /**
   * Cancel subscription
   */
  @Post('cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({
    summary: 'Cancel subscription',
    description: 'Cancels subscription at the end of the current period',
  })
  async cancelSubscription(@GetCompany() companyId: string) {
    await this.stripe.cancelSubscription(companyId);
    return { message: 'Subscription will be canceled at the end of the current period' };
  }

  /**
   * Reactivate subscription
   */
  @Post('reactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({
    summary: 'Reactivate subscription',
    description: 'Reactivates a canceled subscription',
  })
  async reactivateSubscription(@GetCompany() companyId: string) {
    await this.stripe.reactivateSubscription(companyId);
    return { message: 'Subscription reactivated successfully' };
  }

  /**
   * Stripe webhook endpoint
   */
  @Post('webhook')
  @ApiOperation({
    summary: 'Stripe webhook',
    description: 'Handles Stripe webhook events',
  })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const payload = req.rawBody || req.body;
    await this.stripe.handleWebhook(payload, signature);
    return { received: true };
  }
}
