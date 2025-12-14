import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@crypto-erp/database';
import { SubscriptionPlan, Subscription, SubscriptionStatus } from '@prisma/client';

interface UsageCheck {
  allowed: boolean;
  limit: number;
  current: number;
  message?: string;
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all available subscription plans
   */
  async getPlans(): Promise<SubscriptionPlan[]> {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { monthlyPrice: 'asc' },
    });
  }

  /**
   * Get company's current subscription
   */
  async getSubscription(companyId: string): Promise<Subscription & { plan: SubscriptionPlan }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { companyId },
      include: { plan: true },
    });

    if (!subscription) {
      // Return free plan if no subscription exists
      const freePlan = await this.getOrCreateFreePlan();
      return {
        id: '',
        companyId,
        planId: freePlan.id,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        status: 'ACTIVE' as SubscriptionStatus,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialEndsAt: null,
        invoicesThisMonth: 0,
        aiMessagesThisMonth: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        plan: freePlan,
      } as any;
    }

    return subscription;
  }

  /**
   * Create or get free plan
   */
  private async getOrCreateFreePlan(): Promise<SubscriptionPlan> {
    let plan = await this.prisma.subscriptionPlan.findFirst({
      where: { name: 'Free' },
    });

    if (!plan) {
      plan = await this.prisma.subscriptionPlan.create({
        data: {
          name: 'Free',
          monthlyPrice: 0,
          yearlyPrice: 0,
          maxCompanies: 1,
          maxUsers: 1,
          maxInvoicesPerMonth: 10,
          maxWallets: 1,
          maxAiMessagesPerMonth: 10,
          verifactuEnabled: false,
          siiEnabled: false,
          aiChatEnabled: true,
          aiOcrEnabled: false,
          cryptoEnabled: true,
          multiUserEnabled: false,
          prioritySupport: false,
        },
      });
    }

    return plan;
  }

  /**
   * Check if company can create an invoice (usage limit)
   */
  async checkInvoiceLimit(companyId: string): Promise<UsageCheck> {
    const subscription = await this.getSubscription(companyId);

    const limit = subscription.plan.maxInvoicesPerMonth;
    const current = subscription.invoicesThisMonth;

    if (current >= limit) {
      return {
        allowed: false,
        limit,
        current,
        message: `Monthly invoice limit reached (${limit}). Upgrade your plan to create more invoices.`,
      };
    }

    return { allowed: true, limit, current };
  }

  /**
   * Check if company can send AI messages (usage limit)
   */
  async checkAiMessageLimit(companyId: string): Promise<UsageCheck> {
    const subscription = await this.getSubscription(companyId);

    if (!subscription.plan.aiChatEnabled) {
      return {
        allowed: false,
        limit: 0,
        current: 0,
        message: 'AI Chat not available in your plan. Upgrade to use this feature.',
      };
    }

    const limit = subscription.plan.maxAiMessagesPerMonth;
    const current = subscription.aiMessagesThisMonth;

    if (current >= limit) {
      return {
        allowed: false,
        limit,
        current,
        message: `Monthly AI message limit reached (${limit}). Upgrade your plan for more messages.`,
      };
    }

    return { allowed: true, limit, current };
  }

  /**
   * Check if company has access to a feature
   */
  async checkFeatureAccess(companyId: string, feature: keyof SubscriptionPlan): Promise<boolean> {
    const subscription = await this.getSubscription(companyId);
    const featureValue = subscription.plan[feature];

    if (typeof featureValue === 'boolean') {
      return featureValue;
    }

    return false;
  }

  /**
   * Increment invoice usage counter
   */
  async incrementInvoiceUsage(companyId: string): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { companyId },
    });

    if (subscription) {
      await this.prisma.subscription.update({
        where: { companyId },
        data: { invoicesThisMonth: { increment: 1 } },
      });
    }
  }

  /**
   * Increment AI message usage counter
   */
  async incrementAiMessageUsage(companyId: string): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { companyId },
    });

    if (subscription) {
      await this.prisma.subscription.update({
        where: { companyId },
        data: { aiMessagesThisMonth: { increment: 1 } },
      });
    }
  }

  /**
   * Reset monthly usage counters (run via cron job on 1st of month)
   */
  async resetMonthlyUsage(): Promise<void> {
    await this.prisma.subscription.updateMany({
      data: {
        invoicesThisMonth: 0,
        aiMessagesThisMonth: 0,
      },
    });

    this.logger.log('Monthly usage counters reset');
  }

  /**
   * Guard to enforce usage limits
   */
  async enforceInvoiceLimit(companyId: string): Promise<void> {
    const check = await this.checkInvoiceLimit(companyId);

    if (!check.allowed) {
      throw new ForbiddenException(check.message);
    }
  }

  /**
   * Guard to enforce AI message limits
   */
  async enforceAiMessageLimit(companyId: string): Promise<void> {
    const check = await this.checkAiMessageLimit(companyId);

    if (!check.allowed) {
      throw new ForbiddenException(check.message);
    }
  }

  /**
   * Guard to enforce feature access
   */
  async enforceFeatureAccess(companyId: string, feature: keyof SubscriptionPlan): Promise<void> {
    const hasAccess = await this.checkFeatureAccess(companyId, feature);

    if (!hasAccess) {
      throw new ForbiddenException(
        `This feature is not available in your plan. Upgrade to access ${String(feature)}.`,
      );
    }
  }

  /**
   * Get usage stats for company
   */
  async getUsageStats(companyId: string) {
    const subscription = await this.getSubscription(companyId);

    return {
      plan: {
        name: subscription.plan.name,
        status: subscription.status,
        trialEndsAt: subscription.trialEndsAt,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
      usage: {
        invoices: {
          current: subscription.invoicesThisMonth,
          limit: subscription.plan.maxInvoicesPerMonth,
          percentage: Math.round(
            (subscription.invoicesThisMonth / subscription.plan.maxInvoicesPerMonth) * 100,
          ),
        },
        aiMessages: {
          current: subscription.aiMessagesThisMonth,
          limit: subscription.plan.maxAiMessagesPerMonth,
          percentage: Math.round(
            (subscription.aiMessagesThisMonth / subscription.plan.maxAiMessagesPerMonth) * 100,
          ),
        },
      },
      features: {
        verifactu: subscription.plan.verifactuEnabled,
        sii: subscription.plan.siiEnabled,
        aiChat: subscription.plan.aiChatEnabled,
        aiOcr: subscription.plan.aiOcrEnabled,
        multiUser: subscription.plan.multiUserEnabled,
        prioritySupport: subscription.plan.prioritySupport,
      },
    };
  }
}
