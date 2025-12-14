"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SubscriptionsService", {
    enumerable: true,
    get: function() {
        return SubscriptionsService;
    }
});
const _common = require("@nestjs/common");
const _database = require("../../../../../libs/database/src");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let SubscriptionsService = class SubscriptionsService {
    /**
   * Get all available subscription plans
   */ async getPlans() {
        return this.prisma.subscriptionPlan.findMany({
            where: {
                isActive: true
            },
            orderBy: {
                monthlyPrice: 'asc'
            }
        });
    }
    /**
   * Get company's current subscription
   */ async getSubscription(companyId) {
        const subscription = await this.prisma.subscription.findUnique({
            where: {
                companyId
            },
            include: {
                plan: true
            }
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
                status: 'ACTIVE',
                currentPeriodStart: null,
                currentPeriodEnd: null,
                cancelAtPeriodEnd: false,
                canceledAt: null,
                trialEndsAt: null,
                invoicesThisMonth: 0,
                aiMessagesThisMonth: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
                plan: freePlan
            };
        }
        return subscription;
    }
    /**
   * Create or get free plan
   */ async getOrCreateFreePlan() {
        let plan = await this.prisma.subscriptionPlan.findFirst({
            where: {
                name: 'Free'
            }
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
                    prioritySupport: false
                }
            });
        }
        return plan;
    }
    /**
   * Check if company can create an invoice (usage limit)
   */ async checkInvoiceLimit(companyId) {
        const subscription = await this.getSubscription(companyId);
        const limit = subscription.plan.maxInvoicesPerMonth;
        const current = subscription.invoicesThisMonth;
        if (current >= limit) {
            return {
                allowed: false,
                limit,
                current,
                message: `Monthly invoice limit reached (${limit}). Upgrade your plan to create more invoices.`
            };
        }
        return {
            allowed: true,
            limit,
            current
        };
    }
    /**
   * Check if company can send AI messages (usage limit)
   */ async checkAiMessageLimit(companyId) {
        const subscription = await this.getSubscription(companyId);
        if (!subscription.plan.aiChatEnabled) {
            return {
                allowed: false,
                limit: 0,
                current: 0,
                message: 'AI Chat not available in your plan. Upgrade to use this feature.'
            };
        }
        const limit = subscription.plan.maxAiMessagesPerMonth;
        const current = subscription.aiMessagesThisMonth;
        if (current >= limit) {
            return {
                allowed: false,
                limit,
                current,
                message: `Monthly AI message limit reached (${limit}). Upgrade your plan for more messages.`
            };
        }
        return {
            allowed: true,
            limit,
            current
        };
    }
    /**
   * Check if company has access to a feature
   */ async checkFeatureAccess(companyId, feature) {
        const subscription = await this.getSubscription(companyId);
        const featureValue = subscription.plan[feature];
        if (typeof featureValue === 'boolean') {
            return featureValue;
        }
        return false;
    }
    /**
   * Increment invoice usage counter
   */ async incrementInvoiceUsage(companyId) {
        const subscription = await this.prisma.subscription.findUnique({
            where: {
                companyId
            }
        });
        if (subscription) {
            await this.prisma.subscription.update({
                where: {
                    companyId
                },
                data: {
                    invoicesThisMonth: {
                        increment: 1
                    }
                }
            });
        }
    }
    /**
   * Increment AI message usage counter
   */ async incrementAiMessageUsage(companyId) {
        const subscription = await this.prisma.subscription.findUnique({
            where: {
                companyId
            }
        });
        if (subscription) {
            await this.prisma.subscription.update({
                where: {
                    companyId
                },
                data: {
                    aiMessagesThisMonth: {
                        increment: 1
                    }
                }
            });
        }
    }
    /**
   * Reset monthly usage counters (run via cron job on 1st of month)
   */ async resetMonthlyUsage() {
        await this.prisma.subscription.updateMany({
            data: {
                invoicesThisMonth: 0,
                aiMessagesThisMonth: 0
            }
        });
        this.logger.log('Monthly usage counters reset');
    }
    /**
   * Guard to enforce usage limits
   */ async enforceInvoiceLimit(companyId) {
        const check = await this.checkInvoiceLimit(companyId);
        if (!check.allowed) {
            throw new _common.ForbiddenException(check.message);
        }
    }
    /**
   * Guard to enforce AI message limits
   */ async enforceAiMessageLimit(companyId) {
        const check = await this.checkAiMessageLimit(companyId);
        if (!check.allowed) {
            throw new _common.ForbiddenException(check.message);
        }
    }
    /**
   * Guard to enforce feature access
   */ async enforceFeatureAccess(companyId, feature) {
        const hasAccess = await this.checkFeatureAccess(companyId, feature);
        if (!hasAccess) {
            throw new _common.ForbiddenException(`This feature is not available in your plan. Upgrade to access ${String(feature)}.`);
        }
    }
    /**
   * Get usage stats for company
   */ async getUsageStats(companyId) {
        const subscription = await this.getSubscription(companyId);
        return {
            plan: {
                name: subscription.plan.name,
                status: subscription.status,
                trialEndsAt: subscription.trialEndsAt,
                currentPeriodEnd: subscription.currentPeriodEnd
            },
            usage: {
                invoices: {
                    current: subscription.invoicesThisMonth,
                    limit: subscription.plan.maxInvoicesPerMonth,
                    percentage: Math.round(subscription.invoicesThisMonth / subscription.plan.maxInvoicesPerMonth * 100)
                },
                aiMessages: {
                    current: subscription.aiMessagesThisMonth,
                    limit: subscription.plan.maxAiMessagesPerMonth,
                    percentage: Math.round(subscription.aiMessagesThisMonth / subscription.plan.maxAiMessagesPerMonth * 100)
                }
            },
            features: {
                verifactu: subscription.plan.verifactuEnabled,
                sii: subscription.plan.siiEnabled,
                aiChat: subscription.plan.aiChatEnabled,
                aiOcr: subscription.plan.aiOcrEnabled,
                multiUser: subscription.plan.multiUserEnabled,
                prioritySupport: subscription.plan.prioritySupport
            }
        };
    }
    constructor(prisma){
        this.prisma = prisma;
        this.logger = new _common.Logger(SubscriptionsService.name);
    }
};
SubscriptionsService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService
    ])
], SubscriptionsService);

//# sourceMappingURL=subscriptions.service.js.map