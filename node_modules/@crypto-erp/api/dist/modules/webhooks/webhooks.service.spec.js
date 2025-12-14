"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _testing = require("@nestjs/testing");
const _webhooksservice = require("./webhooks.service");
const _database = require("../../../../../libs/database/src");
const _bullmq = require("@nestjs/bullmq");
const _common = require("@nestjs/common");
describe('WebhooksService', ()=>{
    let service;
    let prisma;
    let webhookQueue;
    const mockPrisma = {
        webhookSubscription: {
            create: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            delete: jest.fn()
        },
        webhookDelivery: {
            create: jest.fn(),
            findMany: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn()
        },
        webhookEvent: {
            create: jest.fn()
        }
    };
    const mockQueue = {
        add: jest.fn()
    };
    beforeEach(async ()=>{
        const module = await _testing.Test.createTestingModule({
            providers: [
                _webhooksservice.WebhooksService,
                {
                    provide: _database.PrismaService,
                    useValue: mockPrisma
                },
                {
                    provide: (0, _bullmq.getQueueToken)('webhook-delivery'),
                    useValue: mockQueue
                }
            ]
        }).compile();
        service = module.get(_webhooksservice.WebhooksService);
        prisma = module.get(_database.PrismaService);
        webhookQueue = module.get((0, _bullmq.getQueueToken)('webhook-delivery'));
        jest.clearAllMocks();
    });
    it('should be defined', ()=>{
        expect(service).toBeDefined();
    });
    describe('createSubscription', ()=>{
        it('should create a webhook subscription with secret', async ()=>{
            const companyId = 'company-123';
            const dto = {
                url: 'https://example.com/webhook',
                events: [
                    'invoice.created',
                    'invoice.sent'
                ],
                description: 'Test webhook'
            };
            const mockSubscription = {
                id: 'sub-123',
                companyId,
                ...dto,
                secret: expect.any(String),
                isActive: true,
                retryCount: 3,
                timeout: 30000
            };
            mockPrisma.webhookSubscription.create.mockResolvedValue(mockSubscription);
            const result = await service.createSubscription(companyId, dto);
            expect(result).toHaveProperty('secret');
            expect(result.secret).toHaveLength(64);
            expect(mockPrisma.webhookSubscription.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    companyId,
                    url: dto.url,
                    events: dto.events,
                    secret: expect.any(String)
                })
            });
        });
    });
    describe('findAllByCompany', ()=>{
        it('should return all subscriptions for a company', async ()=>{
            const companyId = 'company-123';
            const mockSubscriptions = [
                {
                    id: 'sub-1',
                    url: 'https://example.com/webhook1'
                },
                {
                    id: 'sub-2',
                    url: 'https://example.com/webhook2'
                }
            ];
            mockPrisma.webhookSubscription.findMany.mockResolvedValue(mockSubscriptions);
            const result = await service.findAllByCompany(companyId);
            expect(result).toEqual(mockSubscriptions);
            expect(mockPrisma.webhookSubscription.findMany).toHaveBeenCalledWith({
                where: {
                    companyId
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
        });
    });
    describe('emitEvent', ()=>{
        it('should create event and queue deliveries for matching subscriptions', async ()=>{
            const companyId = 'company-123';
            const eventDto = {
                event: 'invoice.created',
                entityType: 'Invoice',
                entityId: 'inv-123',
                payload: {
                    id: 'inv-123',
                    amount: 1000
                }
            };
            const mockSubscriptions = [
                {
                    id: 'sub-1',
                    url: 'https://example.com/webhook',
                    secret: 'secret-123',
                    events: [
                        'invoice.created'
                    ],
                    isActive: true,
                    retryCount: 3,
                    timeout: 30000
                }
            ];
            mockPrisma.webhookEvent.create.mockResolvedValue({
                id: 'event-123'
            });
            mockPrisma.webhookSubscription.findMany.mockResolvedValue(mockSubscriptions);
            mockPrisma.webhookDelivery.findFirst.mockResolvedValue(null);
            mockPrisma.webhookDelivery.create.mockResolvedValue({
                id: 'delivery-123'
            });
            await service.emitEvent(companyId, eventDto);
            expect(mockPrisma.webhookEvent.create).toHaveBeenCalled();
            expect(mockPrisma.webhookSubscription.findMany).toHaveBeenCalledWith({
                where: {
                    companyId,
                    isActive: true
                }
            });
            expect(mockQueue.add).toHaveBeenCalled();
        });
        it('should not queue duplicate deliveries', async ()=>{
            const companyId = 'company-123';
            const eventDto = {
                event: 'invoice.created',
                entityType: 'Invoice',
                entityId: 'inv-123',
                payload: {
                    id: 'inv-123'
                }
            };
            const mockSubscriptions = [
                {
                    id: 'sub-1',
                    events: [
                        'invoice.created'
                    ],
                    isActive: true
                }
            ];
            mockPrisma.webhookEvent.create.mockResolvedValue({
                id: 'event-123'
            });
            mockPrisma.webhookSubscription.findMany.mockResolvedValue(mockSubscriptions);
            mockPrisma.webhookDelivery.findFirst.mockResolvedValue({
                id: 'existing-delivery'
            });
            await service.emitEvent(companyId, eventDto);
            expect(mockPrisma.webhookDelivery.create).not.toHaveBeenCalled();
            expect(mockQueue.add).not.toHaveBeenCalled();
        });
    });
    describe('generateSignature', ()=>{
        it('should generate consistent HMAC signature', ()=>{
            const payload = {
                test: 'data'
            };
            const secret = 'test-secret';
            const signature1 = _webhooksservice.WebhooksService.generateSignature(payload, secret);
            const signature2 = _webhooksservice.WebhooksService.generateSignature(payload, secret);
            expect(signature1).toBe(signature2);
            expect(signature1).toHaveLength(64);
        });
        it('should generate different signatures for different secrets', ()=>{
            const payload = {
                test: 'data'
            };
            const sig1 = _webhooksservice.WebhooksService.generateSignature(payload, 'secret1');
            const sig2 = _webhooksservice.WebhooksService.generateSignature(payload, 'secret2');
            expect(sig1).not.toBe(sig2);
        });
    });
    describe('testWebhook', ()=>{
        it('should send test webhook', async ()=>{
            const subscriptionId = 'sub-123';
            const mockSubscription = {
                id: subscriptionId,
                url: 'https://example.com/webhook',
                secret: 'secret-123',
                events: [
                    '*'
                ]
            };
            mockPrisma.webhookSubscription.findUnique.mockResolvedValue(mockSubscription);
            mockPrisma.webhookDelivery.findFirst.mockResolvedValue(null);
            mockPrisma.webhookDelivery.create.mockResolvedValue({
                id: 'delivery-123'
            });
            const result = await service.testWebhook(subscriptionId);
            expect(result).toHaveProperty('message');
            expect(mockQueue.add).toHaveBeenCalled();
        });
        it('should throw NotFoundException if subscription not found', async ()=>{
            mockPrisma.webhookSubscription.findUnique.mockResolvedValue(null);
            await expect(service.testWebhook('invalid-id')).rejects.toThrow(_common.NotFoundException);
        });
    });
});

//# sourceMappingURL=webhooks.service.spec.js.map