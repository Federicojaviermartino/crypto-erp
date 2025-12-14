import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@crypto-erp/database';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!apiKey) {
      this.logger.warn('STRIPE_SECRET_KEY not configured - payments disabled');
      return;
    }

    this.stripe = new Stripe(apiKey, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    });

    this.webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET') || '';
    this.logger.log('Stripe initialized successfully');
  }

  /**
   * Create or retrieve a Stripe customer for a company
   */
  async createOrGetCustomer(companyId: string): Promise<string> {
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
    });

    // Check if subscription already has a Stripe customer
    const subscription = await this.prisma.subscription.findUnique({
      where: { companyId },
    });

    if (subscription?.stripeCustomerId) {
      this.logger.log(`Using existing Stripe customer: ${subscription.stripeCustomerId}`);
      return subscription.stripeCustomerId;
    }

    // Create new Stripe customer
    const customer = await this.stripe.customers.create({
      name: company.name,
      email: company.email || undefined,
      metadata: {
        companyId,
        taxId: company.taxId,
      },
    });

    this.logger.log(`Created Stripe customer: ${customer.id} for company ${companyId}`);

    // Update subscription with customer ID
    if (subscription) {
      await this.prisma.subscription.update({
        where: { companyId },
        data: { stripeCustomerId: customer.id },
      });
    }

    return customer.id;
  }

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(params: {
    companyId: string;
    planId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<Stripe.Checkout.Session> {
    const { companyId, planId, successUrl, cancelUrl } = params;

    const plan = await this.prisma.subscriptionPlan.findUniqueOrThrow({
      where: { id: planId },
    });

    if (!plan.stripePriceId) {
      throw new BadRequestException('Plan does not have a Stripe price configured');
    }

    const customerId = await this.createOrGetCustomer(companyId);

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        companyId,
        planId,
      },
      subscription_data: {
        metadata: {
          companyId,
          planId,
        },
        trial_period_days: 14, // 14-day trial
      },
    });

    this.logger.log(`Created checkout session ${session.id} for company ${companyId}`);

    return session;
  }

  /**
   * Create customer portal session for managing subscription
   */
  async createPortalSession(params: {
    companyId: string;
    returnUrl: string;
  }): Promise<Stripe.BillingPortal.Session> {
    const { companyId, returnUrl } = params;

    const customerId = await this.createOrGetCustomer(companyId);

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    this.logger.log(`Created portal session for company ${companyId}`);

    return session;
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(payload: string | Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret,
      );
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Processing webhook event: ${event.type}`);

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(`Error processing webhook ${event.type}:`, error);
      throw error;
    }
  }

  /**
   * Handle checkout session completed
   */
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const companyId = session.metadata?.companyId;
    const planId = session.metadata?.planId;

    if (!companyId || !planId) {
      this.logger.warn('Checkout session missing metadata');
      return;
    }

    const stripeSubscriptionId = session.subscription as string;

    // Update or create subscription
    await this.prisma.subscription.upsert({
      where: { companyId },
      create: {
        companyId,
        planId,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId,
        status: 'TRIALING',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      },
      update: {
        planId,
        stripeSubscriptionId,
        status: 'TRIALING',
      },
    });

    this.logger.log(`Checkout completed for company ${companyId}`);
  }

  /**
   * Handle subscription created/updated
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const companyId = subscription.metadata?.companyId;

    if (!companyId) {
      this.logger.warn('Subscription missing companyId metadata');
      return;
    }

    const status = this.mapStripeStatus(subscription.status);

    await this.prisma.subscription.update({
      where: { companyId },
      data: {
        status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000)
          : null,
      },
    });

    this.logger.log(`Subscription updated for company ${companyId}: ${status}`);
  }

  /**
   * Handle subscription deleted
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const companyId = subscription.metadata?.companyId;

    if (!companyId) {
      this.logger.warn('Subscription missing companyId metadata');
      return;
    }

    await this.prisma.subscription.update({
      where: { companyId },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
      },
    });

    this.logger.log(`Subscription canceled for company ${companyId}`);
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = invoice.subscription as string;

    if (!subscriptionId) {
      this.logger.warn('Invoice missing subscription ID');
      return;
    }

    // Find subscription by Stripe subscription ID
    const subscription = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!subscription) {
      this.logger.warn(`Subscription not found for Stripe ID: ${subscriptionId}`);
      return;
    }

    // Create payment record
    await this.prisma.payment.create({
      data: {
        subscriptionId: subscription.id,
        stripePaymentIntentId: invoice.payment_intent as string,
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_paid / 100, // Convert cents to euros
        currency: invoice.currency.toUpperCase(),
        status: 'SUCCEEDED',
        description: invoice.description || `Payment for ${invoice.period_start}`,
        paidAt: new Date(invoice.status_transitions.paid_at! * 1000),
      },
    });

    this.logger.log(`Payment succeeded for subscription ${subscription.id}`);
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = invoice.subscription as string;

    if (!subscriptionId) {
      this.logger.warn('Invoice missing subscription ID');
      return;
    }

    const subscription = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!subscription) {
      this.logger.warn(`Subscription not found for Stripe ID: ${subscriptionId}`);
      return;
    }

    // Create failed payment record
    await this.prisma.payment.create({
      data: {
        subscriptionId: subscription.id,
        stripePaymentIntentId: invoice.payment_intent as string,
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_due / 100,
        currency: invoice.currency.toUpperCase(),
        status: 'FAILED',
        description: invoice.description || `Failed payment for ${invoice.period_start}`,
        failureReason: invoice.last_finalization_error?.message || 'Payment failed',
      },
    });

    this.logger.log(`Payment failed for subscription ${subscription.id}`);
  }

  /**
   * Map Stripe subscription status to internal status
   */
  private mapStripeStatus(stripeStatus: Stripe.Subscription.Status): string {
    const statusMap: Record<Stripe.Subscription.Status, string> = {
      trialing: 'TRIALING',
      active: 'ACTIVE',
      past_due: 'PAST_DUE',
      canceled: 'CANCELED',
      incomplete: 'INCOMPLETE',
      incomplete_expired: 'INCOMPLETE_EXPIRED',
      unpaid: 'UNPAID',
      paused: 'CANCELED',
    };

    return statusMap[stripeStatus] || 'CANCELED';
  }

  /**
   * Cancel subscription at period end
   */
  async cancelSubscription(companyId: string): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { companyId },
    });

    if (!subscription?.stripeSubscriptionId) {
      throw new BadRequestException('No active subscription found');
    }

    await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await this.prisma.subscription.update({
      where: { companyId },
      data: { cancelAtPeriodEnd: true },
    });

    this.logger.log(`Subscription canceled at period end for company ${companyId}`);
  }

  /**
   * Reactivate canceled subscription
   */
  async reactivateSubscription(companyId: string): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { companyId },
    });

    if (!subscription?.stripeSubscriptionId) {
      throw new BadRequestException('No subscription found');
    }

    await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    await this.prisma.subscription.update({
      where: { companyId },
      data: { cancelAtPeriodEnd: false },
    });

    this.logger.log(`Subscription reactivated for company ${companyId}`);
  }
}
