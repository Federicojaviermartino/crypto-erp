"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "PaymentsController", {
    enumerable: true,
    get: function() {
        return PaymentsController;
    }
});
const _common = require("@nestjs/common");
const _swagger = require("@nestjs/swagger");
const _jwtauthguard = require("../auth/guards/jwt-auth.guard.js");
const _rolesguard = require("../auth/guards/roles.guard.js");
const _rolesdecorator = require("../auth/decorators/roles.decorator.js");
const _getcompanydecorator = require("../auth/decorators/get-company.decorator.js");
const _client = require("@prisma/client");
const _stripeservice = require("./stripe.service.js");
const _subscriptionsservice = require("./subscriptions.service.js");
const _createcheckoutdto = require("./dto/create-checkout.dto.js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
function _ts_param(paramIndex, decorator) {
    return function(target, key) {
        decorator(target, key, paramIndex);
    };
}
let PaymentsController = class PaymentsController {
    /**
   * Get available subscription plans
   */ async getPlans() {
        return this.subscriptions.getPlans();
    }
    /**
   * Get current subscription
   */ async getSubscription(companyId) {
        return this.subscriptions.getSubscription(companyId);
    }
    /**
   * Get usage statistics
   */ async getUsageStats(companyId) {
        return this.subscriptions.getUsageStats(companyId);
    }
    /**
   * Create Stripe checkout session
   */ async createCheckout(companyId, dto) {
        const session = await this.stripe.createCheckoutSession({
            companyId,
            planId: dto.planId,
            successUrl: dto.successUrl,
            cancelUrl: dto.cancelUrl
        });
        return {
            sessionId: session.id,
            url: session.url
        };
    }
    /**
   * Create customer portal session
   */ async createPortal(companyId, body) {
        const session = await this.stripe.createPortalSession({
            companyId,
            returnUrl: body.returnUrl
        });
        return {
            url: session.url
        };
    }
    /**
   * Cancel subscription
   */ async cancelSubscription(companyId) {
        await this.stripe.cancelSubscription(companyId);
        return {
            message: 'Subscription will be canceled at the end of the current period'
        };
    }
    /**
   * Reactivate subscription
   */ async reactivateSubscription(companyId) {
        await this.stripe.reactivateSubscription(companyId);
        return {
            message: 'Subscription reactivated successfully'
        };
    }
    /**
   * Stripe webhook endpoint
   */ async handleWebhook(req, signature) {
        const payload = req.rawBody || req.body;
        await this.stripe.handleWebhook(payload, signature);
        return {
            received: true
        };
    }
    constructor(stripe, subscriptions){
        this.stripe = stripe;
        this.subscriptions = subscriptions;
    }
};
_ts_decorate([
    (0, _common.Get)('plans'),
    (0, _swagger.ApiOperation)({
        summary: 'Get available subscription plans',
        description: 'Returns all active subscription plans with features and pricing'
    }),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PaymentsController.prototype, "getPlans", null);
_ts_decorate([
    (0, _common.Get)('subscription'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard, _rolesguard.RolesGuard),
    (0, _swagger.ApiBearerAuth)(),
    (0, _rolesdecorator.Roles)(_client.UserRole.ADMIN, _client.UserRole.OWNER),
    (0, _swagger.ApiOperation)({
        summary: 'Get current subscription',
        description: 'Returns the company subscription with plan details'
    }),
    _ts_param(0, (0, _getcompanydecorator.GetCompany)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], PaymentsController.prototype, "getSubscription", null);
_ts_decorate([
    (0, _common.Get)('usage'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard, _rolesguard.RolesGuard),
    (0, _swagger.ApiBearerAuth)(),
    (0, _rolesdecorator.Roles)(_client.UserRole.ADMIN, _client.UserRole.OWNER),
    (0, _swagger.ApiOperation)({
        summary: 'Get usage statistics',
        description: 'Returns current usage stats and limits for the company'
    }),
    _ts_param(0, (0, _getcompanydecorator.GetCompany)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], PaymentsController.prototype, "getUsageStats", null);
_ts_decorate([
    (0, _common.Post)('checkout'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard, _rolesguard.RolesGuard),
    (0, _swagger.ApiBearerAuth)(),
    (0, _rolesdecorator.Roles)(_client.UserRole.ADMIN, _client.UserRole.OWNER),
    (0, _swagger.ApiOperation)({
        summary: 'Create checkout session',
        description: 'Creates a Stripe checkout session for subscription'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Checkout session created successfully'
    }),
    _ts_param(0, (0, _getcompanydecorator.GetCompany)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _createcheckoutdto.CreateCheckoutDto === "undefined" ? Object : _createcheckoutdto.CreateCheckoutDto
    ]),
    _ts_metadata("design:returntype", Promise)
], PaymentsController.prototype, "createCheckout", null);
_ts_decorate([
    (0, _common.Post)('portal'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard, _rolesguard.RolesGuard),
    (0, _swagger.ApiBearerAuth)(),
    (0, _rolesdecorator.Roles)(_client.UserRole.ADMIN, _client.UserRole.OWNER),
    (0, _swagger.ApiOperation)({
        summary: 'Create customer portal session',
        description: 'Creates a Stripe customer portal session for managing subscription'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Portal session created successfully'
    }),
    _ts_param(0, (0, _getcompanydecorator.GetCompany)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], PaymentsController.prototype, "createPortal", null);
_ts_decorate([
    (0, _common.Post)('cancel'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard, _rolesguard.RolesGuard),
    (0, _swagger.ApiBearerAuth)(),
    (0, _rolesdecorator.Roles)(_client.UserRole.ADMIN, _client.UserRole.OWNER),
    (0, _swagger.ApiOperation)({
        summary: 'Cancel subscription',
        description: 'Cancels subscription at the end of the current period'
    }),
    _ts_param(0, (0, _getcompanydecorator.GetCompany)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], PaymentsController.prototype, "cancelSubscription", null);
_ts_decorate([
    (0, _common.Post)('reactivate'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard, _rolesguard.RolesGuard),
    (0, _swagger.ApiBearerAuth)(),
    (0, _rolesdecorator.Roles)(_client.UserRole.ADMIN, _client.UserRole.OWNER),
    (0, _swagger.ApiOperation)({
        summary: 'Reactivate subscription',
        description: 'Reactivates a canceled subscription'
    }),
    _ts_param(0, (0, _getcompanydecorator.GetCompany)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], PaymentsController.prototype, "reactivateSubscription", null);
_ts_decorate([
    (0, _common.Post)('webhook'),
    (0, _swagger.ApiOperation)({
        summary: 'Stripe webhook',
        description: 'Handles Stripe webhook events'
    }),
    _ts_param(0, (0, _common.Req)()),
    _ts_param(1, (0, _common.Headers)('stripe-signature')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _common.RawBodyRequest === "undefined" ? Object : _common.RawBodyRequest,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], PaymentsController.prototype, "handleWebhook", null);
PaymentsController = _ts_decorate([
    (0, _swagger.ApiTags)('payments'),
    (0, _common.Controller)('payments'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _stripeservice.StripeService === "undefined" ? Object : _stripeservice.StripeService,
        typeof _subscriptionsservice.SubscriptionsService === "undefined" ? Object : _subscriptionsservice.SubscriptionsService
    ])
], PaymentsController);

//# sourceMappingURL=payments.controller.js.map