import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

describe('WebhooksController', () => {
  let controller: WebhooksController;
  let service: WebhooksService;

  const mockWebhooksService = {
    createSubscription: jest.fn(),
    findAllByCompany: jest.fn(),
    findOne: jest.fn(),
    updateSubscription: jest.fn(),
    deleteSubscription: jest.fn(),
    testWebhook: jest.fn(),
    getDeliveryHistory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        {
          provide: WebhooksService,
          useValue: mockWebhooksService,
        },
      ],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
    service = module.get<WebhooksService>(WebhooksService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a webhook subscription', async () => {
      const companyId = 'company-123';
      const dto = {
        url: 'https://example.com/webhook',
        events: ['invoice.created'],
      };
      const mockResult = { id: 'sub-123', ...dto, secret: 'secret-123' };

      mockWebhooksService.createSubscription.mockResolvedValue(mockResult);

      const result = await controller.create(companyId, dto);

      expect(result).toEqual(mockResult);
      expect(service.createSubscription).toHaveBeenCalledWith(companyId, dto);
    });
  });

  describe('findAll', () => {
    it('should return all subscriptions for a company', async () => {
      const companyId = 'company-123';
      const mockSubscriptions = [
        { id: 'sub-1', url: 'https://example.com/webhook1' },
        { id: 'sub-2', url: 'https://example.com/webhook2' },
      ];

      mockWebhooksService.findAllByCompany.mockResolvedValue(mockSubscriptions);

      const result = await controller.findAll(companyId);

      expect(result).toEqual(mockSubscriptions);
      expect(service.findAllByCompany).toHaveBeenCalledWith(companyId);
    });
  });

  describe('findOne', () => {
    it('should return a single subscription', async () => {
      const id = 'sub-123';
      const companyId = 'company-123';
      const mockSubscription = { id, url: 'https://example.com/webhook' };

      mockWebhooksService.findOne.mockResolvedValue(mockSubscription);

      const result = await controller.findOne(id, companyId);

      expect(result).toEqual(mockSubscription);
      expect(service.findOne).toHaveBeenCalledWith(id, companyId);
    });
  });

  describe('update', () => {
    it('should update a subscription', async () => {
      const id = 'sub-123';
      const companyId = 'company-123';
      const dto = { isActive: false };
      const mockUpdated = { id, isActive: false };

      mockWebhooksService.updateSubscription.mockResolvedValue(mockUpdated);

      const result = await controller.update(id, companyId, dto);

      expect(result).toEqual(mockUpdated);
      expect(service.updateSubscription).toHaveBeenCalledWith(id, companyId, dto);
    });
  });

  describe('remove', () => {
    it('should delete a subscription', async () => {
      const id = 'sub-123';
      const companyId = 'company-123';

      mockWebhooksService.deleteSubscription.mockResolvedValue({ message: 'Deleted' });

      const result = await controller.remove(id, companyId);

      expect(result).toHaveProperty('message');
      expect(service.deleteSubscription).toHaveBeenCalledWith(id, companyId);
    });
  });

  describe('test', () => {
    it('should send a test webhook', async () => {
      const id = 'sub-123';
      const companyId = 'company-123';
      const mockResult = { message: 'Test webhook queued' };

      mockWebhooksService.testWebhook.mockResolvedValue(mockResult);

      const result = await controller.test(id, companyId);

      expect(result).toEqual(mockResult);
      expect(service.testWebhook).toHaveBeenCalledWith(id, companyId);
    });
  });

  describe('getDeliveries', () => {
    it('should return delivery history', async () => {
      const id = 'sub-123';
      const companyId = 'company-123';
      const mockDeliveries = [
        { id: 'del-1', status: 'DELIVERED' },
        { id: 'del-2', status: 'PENDING' },
      ];

      mockWebhooksService.getDeliveryHistory.mockResolvedValue(mockDeliveries);

      const result = await controller.getDeliveries(id, companyId);

      expect(result).toEqual(mockDeliveries);
      expect(service.getDeliveryHistory).toHaveBeenCalledWith(id, companyId, undefined);
    });
  });
});
