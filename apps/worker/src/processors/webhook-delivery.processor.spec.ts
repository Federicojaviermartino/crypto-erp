import { Test, TestingModule } from '@nestjs/testing';
import { WebhookDeliveryProcessor } from './webhook-delivery.processor';
import { PrismaService } from '@crypto-erp/database';
import { Job } from 'bullmq';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WebhookDeliveryProcessor', () => {
  let processor: WebhookDeliveryProcessor;
  let prisma: PrismaService;

  const mockPrisma = {
    webhookDelivery: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookDeliveryProcessor,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    processor = module.get<WebhookDeliveryProcessor>(WebhookDeliveryProcessor);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('handleWebhookDelivery', () => {
    it('should successfully deliver webhook', async () => {
      const jobData = {
        deliveryId: 'delivery-123',
        url: 'https://example.com/webhook',
        secret: 'secret-123',
        event: 'invoice.created',
        payload: { id: 'inv-123', amount: 1000 },
        timeout: 30000,
      };

      const job = {
        data: jobData,
        attemptsMade: 1,
      } as Job;

      mockPrisma.webhookDelivery.update.mockResolvedValue({ id: 'delivery-123' });
      mockedAxios.post.mockResolvedValue({ status: 200, data: { success: true } });

      await processor.handleWebhookDelivery(job);

      expect(mockPrisma.webhookDelivery.update).toHaveBeenCalledWith({
        where: { id: jobData.deliveryId },
        data: { status: 'SENDING', attemptCount: { increment: 1 }, lastAttemptAt: expect.any(Date) },
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        jobData.url,
        jobData.payload,
        expect.objectContaining({
          timeout: jobData.timeout,
          headers: expect.objectContaining({
            'X-Webhook-Signature': expect.stringContaining('sha256='),
            'X-Webhook-Event': jobData.event,
          }),
        }),
      );

      expect(mockPrisma.webhookDelivery.update).toHaveBeenCalledWith({
        where: { id: jobData.deliveryId },
        data: expect.objectContaining({
          status: 'DELIVERED',
          responseStatus: 200,
          deliveredAt: expect.any(Date),
        }),
      });
    });

    it('should handle delivery failure and retry', async () => {
      const jobData = {
        deliveryId: 'delivery-123',
        url: 'https://example.com/webhook',
        secret: 'secret-123',
        event: 'invoice.created',
        payload: { id: 'inv-123' },
        timeout: 30000,
      };

      const job = {
        data: jobData,
        attemptsMade: 1,
      } as Job;

      const error = new Error('Network error');
      mockPrisma.webhookDelivery.update.mockResolvedValue({ id: 'delivery-123' });
      mockPrisma.webhookDelivery.findUnique.mockResolvedValue({
        id: 'delivery-123',
        maxAttempts: 3,
      });
      mockedAxios.post.mockRejectedValue(error);

      await expect(processor.handleWebhookDelivery(job)).rejects.toThrow();

      expect(mockPrisma.webhookDelivery.update).toHaveBeenCalledWith({
        where: { id: jobData.deliveryId },
        data: expect.objectContaining({
          errorMessage: error.message,
        }),
      });
    });

    it('should mark as failed after max attempts', async () => {
      const jobData = {
        deliveryId: 'delivery-123',
        url: 'https://example.com/webhook',
        secret: 'secret-123',
        event: 'invoice.created',
        payload: { id: 'inv-123' },
        timeout: 30000,
      };

      const job = {
        data: jobData,
        attemptsMade: 3,
      } as Job;

      mockPrisma.webhookDelivery.update.mockResolvedValue({ id: 'delivery-123' });
      mockPrisma.webhookDelivery.findUnique.mockResolvedValue({
        id: 'delivery-123',
        maxAttempts: 3,
      });
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      await expect(processor.handleWebhookDelivery(job)).rejects.toThrow();

      expect(mockPrisma.webhookDelivery.update).toHaveBeenCalledWith({
        where: { id: jobData.deliveryId },
        data: expect.objectContaining({
          status: 'FAILED',
        }),
      });
    });

    it('should include correct HMAC signature in headers', async () => {
      const jobData = {
        deliveryId: 'delivery-123',
        url: 'https://example.com/webhook',
        secret: 'test-secret',
        event: 'invoice.created',
        payload: { test: 'data' },
        timeout: 30000,
      };

      const job = {
        data: jobData,
        attemptsMade: 1,
      } as Job;

      mockPrisma.webhookDelivery.update.mockResolvedValue({ id: 'delivery-123' });
      mockedAxios.post.mockResolvedValue({ status: 200 });

      await processor.handleWebhookDelivery(job);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        jobData.url,
        jobData.payload,
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Webhook-Signature': expect.stringMatching(/^sha256=[a-f0-9]{64}$/),
          }),
        }),
      );
    });
  });
});
