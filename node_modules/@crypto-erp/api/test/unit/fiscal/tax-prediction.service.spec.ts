import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TaxPredictionService } from '../../../src/modules/fiscal/tax-prediction.service';
import { PrismaService } from '@crypto-erp/database';
import { PredictTaxImpactDto, ProspectiveTransactionType } from '../../../src/modules/fiscal/dto/predict-tax.dto';

describe('TaxPredictionService', () => {
  let service: TaxPredictionService;
  let prisma: PrismaService;

  const mockPrismaService = {
    cryptoAsset: {
      findFirst: jest.fn(),
    },
    wallet: {
      findMany: jest.fn(),
    },
    cryptoTransaction: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxPredictionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TaxPredictionService>(TaxPredictionService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('predictTaxImpact', () => {
    const companyId = 'company-1';
    const walletId = 'wallet-1';

    it('should predict tax impact for a sell transaction', async () => {
      const dto: PredictTaxImpactDto = {
        transactionType: ProspectiveTransactionType.SELL,
        asset: 'BTC',
        amount: 0.5,
        priceEur: 45000,
        dateOfSale: '2025-01-15',
      };

      // Mock crypto asset exists
      mockPrismaService.cryptoAsset.findFirst.mockResolvedValue({
        id: 'asset-1',
        symbol: 'BTC',
        name: 'Bitcoin',
        companyId,
      });

      // Mock wallet
      mockPrismaService.wallet.findMany.mockResolvedValue([{ id: walletId }]);

      // Mock buy transactions (cost lots)
      mockPrismaService.cryptoTransaction.findMany
        .mockResolvedValueOnce([
          // Buy 1 BTC at 30,000 EUR on 2024-01-01
          {
            id: 'tx-buy-1',
            walletId,
            type: 'TRANSFER_IN',
            assetIn: 'BTC',
            amountIn: { toNumber: () => 1.0 },
            priceInEur: { toNumber: () => 30000 },
            blockTimestamp: new Date('2024-01-01'),
          },
        ])
        // Mock sell transactions (none yet)
        .mockResolvedValueOnce([]);

      const result = await service.predictTaxImpact(companyId, dto);

      // Sell 0.5 BTC at 45,000 EUR = 22,500 EUR proceeds
      // Cost basis: 0.5 BTC * 30,000 EUR = 15,000 EUR
      // Capital gain: 22,500 - 15,000 = 7,500 EUR
      // Tax: First 6,000 at 19% = 1,140, remaining 1,500 at 21% = 315
      // Total tax: 1,455 EUR
      expect(result.capitalGain).toBe(7500);
      expect(result.taxOwed).toBeCloseTo(1455, 0);
      expect(result.effectiveTaxRate).toBe(21); // Marginal rate for 7,500
      expect(result.totalProceeds).toBe(22500);
      expect(result.totalAcquisitionCost).toBe(15000);
      expect(result.lotsConsumed).toHaveLength(1);
      expect(result.lotsConsumed[0].quantity).toBe(0.5);
      expect(result.lotsConsumed[0].costBasisPerUnit).toBe(30000);
      expect(result.lotsConsumed[0].gainLoss).toBe(7500);
    });

    it('should handle multiple cost lots with FIFO', async () => {
      const dto: PredictTaxImpactDto = {
        transactionType: ProspectiveTransactionType.SELL,
        asset: 'ETH',
        amount: 3.0,
        priceEur: 3000,
      };

      mockPrismaService.cryptoAsset.findFirst.mockResolvedValue({
        id: 'asset-2',
        symbol: 'ETH',
        companyId,
      });

      mockPrismaService.wallet.findMany.mockResolvedValue([{ id: walletId }]);

      // Mock buy transactions - 3 lots
      mockPrismaService.cryptoTransaction.findMany
        .mockResolvedValueOnce([
          // Lot 1: 1 ETH at 2,000 EUR
          {
            id: 'tx-buy-1',
            type: 'TRANSFER_IN',
            assetIn: 'ETH',
            amountIn: { toNumber: () => 1.0 },
            priceInEur: { toNumber: () => 2000 },
            blockTimestamp: new Date('2024-01-01'),
          },
          // Lot 2: 1 ETH at 2,500 EUR
          {
            id: 'tx-buy-2',
            type: 'TRANSFER_IN',
            assetIn: 'ETH',
            amountIn: { toNumber: () => 1.0 },
            priceInEur: { toNumber: () => 2500 },
            blockTimestamp: new Date('2024-06-01'),
          },
          // Lot 3: 1 ETH at 2,800 EUR
          {
            id: 'tx-buy-3',
            type: 'TRANSFER_IN',
            assetIn: 'ETH',
            amountIn: { toNumber: () => 1.0 },
            priceInEur: { toNumber: () => 2800 },
            blockTimestamp: new Date('2024-09-01'),
          },
        ])
        // No previous sells
        .mockResolvedValueOnce([]);

      const result = await service.predictTaxImpact(companyId, dto);

      // Sell 3 ETH at 3,000 EUR = 9,000 EUR proceeds
      // FIFO: Lot 1 (2,000) + Lot 2 (2,500) + Lot 3 (2,800) = 7,300 EUR cost
      // Capital gain: 9,000 - 7,300 = 1,700 EUR
      expect(result.capitalGain).toBe(1700);
      expect(result.totalProceeds).toBe(9000);
      expect(result.totalAcquisitionCost).toBe(7300);
      expect(result.lotsConsumed).toHaveLength(3);
    });

    it('should handle partial lot consumption', async () => {
      const dto: PredictTaxImpactDto = {
        transactionType: ProspectiveTransactionType.SELL,
        asset: 'BTC',
        amount: 0.3,
        priceEur: 50000,
      };

      mockPrismaService.cryptoAsset.findFirst.mockResolvedValue({
        id: 'asset-1',
        symbol: 'BTC',
        companyId,
      });

      mockPrismaService.wallet.findMany.mockResolvedValue([{ id: walletId }]);

      mockPrismaService.cryptoTransaction.findMany
        .mockResolvedValueOnce([
          // Buy 1 BTC
          {
            id: 'tx-buy-1',
            type: 'TRANSFER_IN',
            assetIn: 'BTC',
            amountIn: { toNumber: () => 1.0 },
            priceInEur: { toNumber: () => 40000 },
            blockTimestamp: new Date('2024-01-01'),
          },
        ])
        .mockResolvedValueOnce([]);

      const result = await service.predictTaxImpact(companyId, dto);

      // Sell 0.3 BTC at 50,000 EUR = 15,000 EUR proceeds
      // Cost: 0.3 * 40,000 = 12,000 EUR
      // Gain: 3,000 EUR
      expect(result.capitalGain).toBe(3000);
      expect(result.lotsConsumed).toHaveLength(1);
      expect(result.lotsConsumed[0].quantity).toBe(0.3);
    });

    it('should handle buy transactions (no tax impact)', async () => {
      const dto: PredictTaxImpactDto = {
        transactionType: ProspectiveTransactionType.BUY,
        asset: 'BTC',
        amount: 1.0,
        priceEur: 45000,
      };

      const result = await service.predictTaxImpact(companyId, dto);

      expect(result.capitalGain).toBe(0);
      expect(result.taxOwed).toBe(0);
      expect(result.effectiveTaxRate).toBe(0);
      expect(result.lotsConsumed).toHaveLength(0);
      expect(result.recommendation).toContain('No immediate tax impact');
    });

    it('should throw NotFoundException for non-existent asset', async () => {
      const dto: PredictTaxImpactDto = {
        transactionType: ProspectiveTransactionType.SELL,
        asset: 'UNKNOWN',
        amount: 1.0,
        priceEur: 100,
      };

      mockPrismaService.cryptoAsset.findFirst.mockResolvedValue(null);

      await expect(service.predictTaxImpact(companyId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when no wallets exist', async () => {
      const dto: PredictTaxImpactDto = {
        transactionType: ProspectiveTransactionType.SELL,
        asset: 'BTC',
        amount: 1.0,
        priceEur: 45000,
      };

      mockPrismaService.cryptoAsset.findFirst.mockResolvedValue({
        id: 'asset-1',
        symbol: 'BTC',
        companyId,
      });

      mockPrismaService.wallet.findMany.mockResolvedValue([]);

      await expect(service.predictTaxImpact(companyId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle capital loss scenario', async () => {
      const dto: PredictTaxImpactDto = {
        transactionType: ProspectiveTransactionType.SELL,
        asset: 'BTC',
        amount: 1.0,
        priceEur: 25000, // Selling at loss
      };

      mockPrismaService.cryptoAsset.findFirst.mockResolvedValue({
        id: 'asset-1',
        symbol: 'BTC',
        companyId,
      });

      mockPrismaService.wallet.findMany.mockResolvedValue([{ id: walletId }]);

      mockPrismaService.cryptoTransaction.findMany
        .mockResolvedValueOnce([
          {
            id: 'tx-buy-1',
            type: 'TRANSFER_IN',
            assetIn: 'BTC',
            amountIn: { toNumber: () => 1.0 },
            priceInEur: { toNumber: () => 40000 }, // Bought at 40,000
            blockTimestamp: new Date('2024-01-01'),
          },
        ])
        .mockResolvedValueOnce([]);

      const result = await service.predictTaxImpact(companyId, dto);

      // Loss: 25,000 - 40,000 = -15,000 EUR
      expect(result.capitalGain).toBe(-15000);
      expect(result.taxOwed).toBe(0); // No tax on losses
      expect(result.recommendation).toContain('capital loss');
    });

    it('should account for previous sells when calculating remaining lots', async () => {
      const dto: PredictTaxImpactDto = {
        transactionType: ProspectiveTransactionType.SELL,
        asset: 'BTC',
        amount: 0.5,
        priceEur: 50000,
      };

      mockPrismaService.cryptoAsset.findFirst.mockResolvedValue({
        id: 'asset-1',
        symbol: 'BTC',
        companyId,
      });

      mockPrismaService.wallet.findMany.mockResolvedValue([{ id: walletId }]);

      mockPrismaService.cryptoTransaction.findMany
        .mockResolvedValueOnce([
          // Bought 1 BTC
          {
            id: 'tx-buy-1',
            type: 'TRANSFER_IN',
            assetIn: 'BTC',
            amountIn: { toNumber: () => 1.0 },
            priceInEur: { toNumber: () => 40000 },
            blockTimestamp: new Date('2024-01-01'),
          },
        ])
        .mockResolvedValueOnce([
          // Previously sold 0.3 BTC
          {
            id: 'tx-sell-1',
            type: 'TRANSFER_OUT',
            assetOut: 'BTC',
            amountOut: { toNumber: () => 0.3 },
            blockTimestamp: new Date('2024-06-01'),
          },
        ]);

      const result = await service.predictTaxImpact(companyId, dto);

      // Remaining after previous sell: 1.0 - 0.3 = 0.7 BTC
      // Selling 0.5 BTC from remaining 0.7
      expect(result.lotsConsumed).toHaveLength(1);
      expect(result.lotsConsumed[0].quantity).toBe(0.5);
    });
  });
});
