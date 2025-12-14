"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "WebhooksService", {
    enumerable: true,
    get: function() {
        return WebhooksService;
    }
});
const _common = require("@nestjs/common");
const _database = require("../../../../../libs/database/src");
const _bull = require("@nestjs/bull");
const _bull1 = require("bull");
const _crypto = /*#__PURE__*/ _interop_require_wildcard(require("crypto"));
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {
        __proto__: null
    };
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
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
let WebhooksService = class WebhooksService {
    async createSubscription(companyId, dto) {
        const secret = this.generateSecret();
        const subscription = await this.prisma.webhookSubscription.create({
            data: {
                companyId,
                url: dto.url,
                secret,
                events: dto.events,
                description: dto.description,
                retryCount: dto.retryCount ?? 3,
                timeout: dto.timeout ?? 30000,
                metadata: dto.metadata ?? {}
            }
        });
        this.logger.log(`Created webhook subscription ${subscription.id}`);
        return {
            ...subscription,
            secret
        };
    }
    async findAllByCompany(companyId) {
        return this.prisma.webhookSubscription.findMany({
            where: {
                companyId
            },
            select: {
                id: true,
                url: true,
                isActive: true,
                events: true,
                description: true,
                retryCount: true,
                timeout: true,
                metadata: true,
                createdAt: true,
                updatedAt: true
            }
        });
    }
    async findOne(id, companyId) {
        const subscription = await this.prisma.webhookSubscription.findFirst({
            where: {
                id,
                companyId
            }
        });
        if (!subscription) {
            throw new _common.NotFoundException('Webhook subscription not found');
        }
        const { secret, ...rest } = subscription;
        return rest;
    }
    async updateSubscription(id, companyId, dto) {
        await this.findOne(id, companyId);
        const updated = await this.prisma.webhookSubscription.update({
            where: {
                id
            },
            data: {
                url: dto.url,
                isActive: dto.isActive,
                events: dto.events,
                description: dto.description,
                retryCount: dto.retryCount,
                timeout: dto.timeout,
                metadata: dto.metadata
            }
        });
        this.logger.log(`Updated webhook subscription ${id}`);
        const { secret, ...rest } = updated;
        return rest;
    }
    async deleteSubscription(id, companyId) {
        await this.findOne(id, companyId);
        await this.prisma.webhookSubscription.delete({
            where: {
                id
            }
        });
        this.logger.log(`Deleted webhook subscription ${id}`);
    }
    async emitEvent(companyId, eventDto) {
        await this.prisma.webhookEvent.create({
            data: {
                companyId,
                event: eventDto.event,
                entityType: eventDto.entityType,
                entityId: eventDto.entityId,
                payload: eventDto.payload
            }
        });
        const subscriptions = await this.prisma.webhookSubscription.findMany({
            where: {
                companyId,
                isActive: true
            }
        });
        const subscribedTo = subscriptions.filter((sub)=>{
            const events = sub.events;
            return events.includes(eventDto.event) || events.includes('*');
        });
        this.logger.log(`Emitting ${eventDto.event} to ${subscribedTo.length} subscriptions`);
        for (const subscription of subscribedTo){
            await this.queueDelivery(subscription, eventDto);
        }
    }
    async queueDelivery(subscription, eventDto) {
        const payloadHash = this.hashPayload(eventDto.payload);
        const existing = await this.prisma.webhookDelivery.findFirst({
            where: {
                subscriptionId: subscription.id,
                payloadHash,
                status: {
                    in: [
                        'PENDING',
                        'SENDING',
                        'DELIVERED'
                    ]
                }
            }
        });
        if (existing) {
            this.logger.debug(`Skipping duplicate delivery`);
            return;
        }
        const delivery = await this.prisma.webhookDelivery.create({
            data: {
                subscriptionId: subscription.id,
                event: eventDto.event,
                payload: eventDto.payload,
                payloadHash,
                maxAttempts: subscription.retryCount
            }
        });
        await this.webhookQueue.add('send-webhook', {
            deliveryId: delivery.id,
            subscriptionId: subscription.id,
            url: subscription.url,
            secret: subscription.secret,
            event: eventDto.event,
            payload: eventDto.payload,
            timeout: subscription.timeout
        }, {
            attempts: subscription.retryCount + 1,
            backoff: {
                type: 'exponential',
                delay: 5000
            }
        });
    }
    async getDeliveryHistory(subscriptionId, companyId, limit = 50) {
        await this.findOne(subscriptionId, companyId);
        return this.prisma.webhookDelivery.findMany({
            where: {
                subscriptionId
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: limit,
            select: {
                id: true,
                event: true,
                status: true,
                attemptCount: true,
                responseStatus: true,
                errorMessage: true,
                scheduledFor: true,
                lastAttemptAt: true,
                deliveredAt: true,
                createdAt: true
            }
        });
    }
    async testWebhook(id, companyId) {
        const subscription = await this.prisma.webhookSubscription.findFirst({
            where: {
                id,
                companyId
            }
        });
        if (!subscription) {
            throw new _common.NotFoundException('Webhook subscription not found');
        }
        await this.emitEvent(companyId, {
            event: 'webhook.test',
            entityType: 'WebhookSubscription',
            entityId: id,
            payload: {
                message: 'Test webhook',
                timestamp: new Date().toISOString()
            }
        });
        return {
            message: 'Test webhook queued'
        };
    }
    generateSecret() {
        return _crypto.randomBytes(32).toString('hex');
    }
    hashPayload(payload) {
        return _crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    }
    static generateSignature(payload, secret) {
        return _crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
    }
    constructor(prisma, webhookQueue){
        this.prisma = prisma;
        this.webhookQueue = webhookQueue;
        this.logger = new _common.Logger(WebhooksService.name);
    }
};
WebhooksService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(1, (0, _bull.InjectQueue)('webhook-delivery')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService,
        typeof _bull1.Queue === "undefined" ? Object : _bull1.Queue
    ])
], WebhooksService);

//# sourceMappingURL=webhooks.service.js.map