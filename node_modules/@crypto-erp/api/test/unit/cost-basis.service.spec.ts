import { Test, TestingModule } from '@nestjs/testing';
import { CostBasisService, TaxReportEntry } from '../../src/modules/crypto/services/cost-basis.service';
import { PrismaService } from '@crypto-erp/database';
import Decimal from 'decimal.js';

// Mock type
type MockPrismaService = {
  cryptoLot: {
    create: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    deleteMany: jest.Mock;
  };
  cryptoAsset: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
  };
  cryptoTransaction: {
    findMany: jest.Mock;
    update: jest.Mock;
  };
  wallet: {
    findMany: jest.Mock;
  };
};

describe('CostBasisService', () => {
  let service: CostBasisService;
  let prismaService: MockPrismaService;

  const mockCompanyId = 'company-uuid-1234';
  const mockAssetId = 'asset-uuid-btc';

  beforeEach(async () => {
    prismaService = {
      cryptoLot: {
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
      cryptoAsset: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      cryptoTransaction: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      wallet: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CostBasisService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<CostBasisService>(CostBasisService);
  });

  describe('createLot', () => {
    it('should create a new cost basis lot', async () => {
      const mockLot = {
        id: 'lot-uuid-1',
        companyId: mockCompanyId,
        cryptoAssetId: mockAssetId,
        sourceTxId: 'tx-123',
        sourceType: 'purchase',
        acquiredAmount: 1.5,
        remainingAmount: 1.5,
        costBasisEur: 45000,
        costPerUnit: 30000,
        acquiredAt: new Date('2024-01-15'),
      };

      prismaService.cryptoLot.create.mockResolvedValue(mockLot as any);

      const result = await service.createLot(
        mockCompanyId,
        'tx-123',
        mockAssetId,
        1.5,
        45000,
        new Date('2024-01-15'),
      );

      expect(result).toBeDefined();
      expect(prismaService.cryptoLot.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: mockCompanyId,
          cryptoAssetId: mockAssetId,
          acquiredAmount: 1.5,
          remainingAmount: 1.5,
          costBasisEur: 45000,
          costPerUnit: 30000, // 45000 / 1.5
        }),
      });
    });

    it('should handle zero amount gracefully', async () => {
      prismaService.cryptoLot.create.mockResolvedValue({} as any);

      await service.createLot(mockCompanyId, 'tx-123', mockAssetId, 0, 0, new Date());

      expect(prismaService.cryptoLot.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          acquiredAmount: 0,
          costPerUnit: 0,
        }),
      });
    });
  });

  describe('calculateFIFO', () => {
    it('should calculate FIFO cost basis from single lot', async () => {
      const mockLots = [
        {
          id: 'lot-1',
          remainingAmount: new Decimal(2),
          costPerUnit: new Decimal(30000),
          acquiredAt: new Date('2024-01-01'),
        },
      ];

      prismaService.cryptoLot.findMany.mockResolvedValue(mockLots as any);
      prismaService.cryptoLot.update.mockResolvedValue({} as any);

      const result = await service.calculateFIFO(
        mockCompanyId,
        mockAssetId,
        1, // Sell 1 BTC
        new Date('2024-06-01'),
        50000, // Sale proceeds
      );

      expect(result.costBasis).toBe(30000); // 1 BTC * 30000
      expect(result.realizedGain).toBe(20000); // 50000 - 30000
      expect(result.lotsUsed).toHaveLength(1);
      expect(result.lotsUsed[0].amountUsed).toBe(1);
    });

    it('should calculate FIFO across multiple lots', async () => {
      const mockLots = [
        {
          id: 'lot-1',
          remainingAmount: new Decimal(0.5),
          costPerUnit: new Decimal(20000), // Older, cheaper
          acquiredAt: new Date('2024-01-01'),
        },
        {
          id: 'lot-2',
          remainingAmount: new Decimal(1),
          costPerUnit: new Decimal(35000), // Newer, more expensive
          acquiredAt: new Date('2024-02-01'),
        },
        {
          id: 'lot-3',
          remainingAmount: new Decimal(2),
          costPerUnit: new Decimal(40000), // Newest
          acquiredAt: new Date('2024-03-01'),
        },
      ];

      prismaService.cryptoLot.findMany.mockResolvedValue(mockLots as any);
      prismaService.cryptoLot.update.mockResolvedValue({} as any);

      const result = await service.calculateFIFO(
        mockCompanyId,
        mockAssetId,
        1.5, // Sell 1.5 BTC
        new Date('2024-06-01'),
        75000, // Sale proceeds
      );

      // Expected: 0.5 @ 20000 + 1.0 @ 35000 = 10000 + 35000 = 45000
      expect(result.costBasis).toBe(45000);
      expect(result.realizedGain).toBe(30000); // 75000 - 45000
      expect(result.lotsUsed).toHaveLength(2);

      // First lot should be fully exhausted
      expect(result.lotsUsed[0].lotId).toBe('lot-1');
      expect(result.lotsUsed[0].amountUsed).toBe(0.5);

      // Second lot partially used
      expect(result.lotsUsed[1].lotId).toBe('lot-2');
      expect(result.lotsUsed[1].amountUsed).toBe(1);
    });

    it('should calculate holding period correctly', async () => {
      const acquireDate = new Date('2024-01-01');
      const saleDate = new Date('2024-06-01');
      const expectedDays = 152; // Days between Jan 1 and June 1

      const mockLots = [
        {
          id: 'lot-1',
          remainingAmount: new Decimal(1),
          costPerUnit: new Decimal(30000),
          acquiredAt: acquireDate,
        },
      ];

      prismaService.cryptoLot.findMany.mockResolvedValue(mockLots as any);
      prismaService.cryptoLot.update.mockResolvedValue({} as any);

      const result = await service.calculateFIFO(
        mockCompanyId,
        mockAssetId,
        1,
        saleDate,
        50000,
      );

      expect(result.lotsUsed[0].holdingPeriod).toBe(expectedDays);
    });

    it('should handle insufficient lots gracefully', async () => {
      const mockLots = [
        {
          id: 'lot-1',
          remainingAmount: new Decimal(0.5),
          costPerUnit: new Decimal(30000),
          acquiredAt: new Date('2024-01-01'),
        },
      ];

      prismaService.cryptoLot.findMany.mockResolvedValue(mockLots as any);
      prismaService.cryptoLot.update.mockResolvedValue({} as any);

      const result = await service.calculateFIFO(
        mockCompanyId,
        mockAssetId,
        2, // Try to sell more than available
        new Date('2024-06-01'),
        60000,
      );

      // Should use what's available
      expect(result.costBasis).toBe(15000); // 0.5 * 30000
      expect(result.lotsUsed).toHaveLength(1);
    });

    it('should update lot remaining amounts after sale', async () => {
      const mockLots = [
        {
          id: 'lot-1',
          remainingAmount: new Decimal(2),
          costPerUnit: new Decimal(30000),
          acquiredAt: new Date('2024-01-01'),
        },
      ];

      prismaService.cryptoLot.findMany.mockResolvedValue(mockLots as any);
      prismaService.cryptoLot.update.mockResolvedValue({} as any);

      await service.calculateFIFO(
        mockCompanyId,
        mockAssetId,
        0.5,
        new Date('2024-06-01'),
        25000,
      );

      expect(prismaService.cryptoLot.update).toHaveBeenCalledWith({
        where: { id: 'lot-1' },
        data: { remainingAmount: 1.5 }, // 2 - 0.5
      });
    });
  });

  describe('getPortfolioPositions', () => {
    it('should aggregate positions correctly', async () => {
      const mockAssets = [
        { id: 'asset-1', symbol: 'BTC', name: 'Bitcoin', isActive: true },
        { id: 'asset-2', symbol: 'ETH', name: 'Ethereum', isActive: true },
      ];

      const mockBtcLots = [
        { remainingAmount: new Decimal(1), costPerUnit: new Decimal(30000) },
        { remainingAmount: new Decimal(0.5), costPerUnit: new Decimal(40000) },
      ];

      const mockEthLots = [
        { remainingAmount: new Decimal(10), costPerUnit: new Decimal(2000) },
      ];

      prismaService.cryptoAsset.findMany.mockResolvedValue(mockAssets as any);
      prismaService.cryptoLot.findMany
        .mockResolvedValueOnce(mockBtcLots as any)
        .mockResolvedValueOnce(mockEthLots as any);

      const positions = await service.getPortfolioPositions(mockCompanyId);

      expect(positions).toHaveLength(2);

      // BTC position
      const btcPosition = positions.find(p => p.symbol === 'BTC');
      expect(btcPosition).toBeDefined();
      expect(btcPosition!.totalAmount).toBe(1.5); // 1 + 0.5
      expect(btcPosition!.totalCostBasis).toBe(50000); // 1*30000 + 0.5*40000
      expect(btcPosition!.averageCostBasis).toBeCloseTo(33333.33, 0); // 50000 / 1.5

      // ETH position
      const ethPosition = positions.find(p => p.symbol === 'ETH');
      expect(ethPosition).toBeDefined();
      expect(ethPosition!.totalAmount).toBe(10);
      expect(ethPosition!.totalCostBasis).toBe(20000);
    });

    it('should exclude assets with no remaining lots', async () => {
      const mockAssets = [
        { id: 'asset-1', symbol: 'BTC', name: 'Bitcoin', isActive: true },
      ];

      prismaService.cryptoAsset.findMany.mockResolvedValue(mockAssets as any);
      prismaService.cryptoLot.findMany.mockResolvedValue([]);

      const positions = await service.getPortfolioPositions(mockCompanyId);

      expect(positions).toHaveLength(0);
    });
  });

  describe('getLotsForAsset', () => {
    it('should return only non-exhausted lots by default', async () => {
      const mockLots = [
        { id: 'lot-1', remainingAmount: new Decimal(1), acquiredAt: new Date('2024-01-01') },
        { id: 'lot-2', remainingAmount: new Decimal(0.5), acquiredAt: new Date('2024-02-01') },
      ];

      prismaService.cryptoLot.findMany.mockResolvedValue(mockLots as any);

      await service.getLotsForAsset(mockCompanyId, mockAssetId);

      expect(prismaService.cryptoLot.findMany).toHaveBeenCalledWith({
        where: {
          companyId: mockCompanyId,
          cryptoAssetId: mockAssetId,
          remainingAmount: { gt: 0 },
        },
        orderBy: { acquiredAt: 'asc' },
      });
    });

    it('should include exhausted lots when requested', async () => {
      prismaService.cryptoLot.findMany.mockResolvedValue([]);

      await service.getLotsForAsset(mockCompanyId, mockAssetId, true);

      expect(prismaService.cryptoLot.findMany).toHaveBeenCalledWith({
        where: {
          companyId: mockCompanyId,
          cryptoAssetId: mockAssetId,
        },
        orderBy: { acquiredAt: 'asc' },
      });
    });
  });

  describe('generateTaxReport', () => {
    it('should generate tax report for disposal transactions', async () => {
      const mockWallets = [{ id: 'wallet-1' }];
      const mockTransactions = [
        {
          id: 'tx-1',
          type: 'SWAP',
          blockTimestamp: new Date('2024-03-15'),
          assetOut: 'BTC',
          amountOut: new Decimal(0.5),
          priceOutEur: new Decimal(25000),
          costBasis: new Decimal(15000),
          realizedGain: new Decimal(10000),
        },
        {
          id: 'tx-2',
          type: 'TRANSFER_OUT',
          blockTimestamp: new Date('2024-06-20'),
          assetOut: 'ETH',
          amountOut: new Decimal(5),
          priceOutEur: new Decimal(12500),
          costBasis: new Decimal(10000),
          realizedGain: new Decimal(2500),
        },
      ];

      prismaService.wallet.findMany.mockResolvedValue(mockWallets as any);
      prismaService.cryptoTransaction.findMany.mockResolvedValue(mockTransactions as any);

      const report = await service.generateTaxReport(
        mockCompanyId,
        new Date('2024-01-01'),
        new Date('2024-12-31'),
      );

      expect(report.entries).toHaveLength(2);
      expect(report.summary.totalProceeds).toBe(37500); // 25000 + 12500
      expect(report.summary.totalCostBasis).toBe(25000); // 15000 + 10000
      expect(report.summary.totalGainLoss).toBe(12500); // 10000 + 2500
    });

    it('should correctly categorize holding periods', async () => {
      prismaService.wallet.findMany.mockResolvedValue([{ id: 'wallet-1' }] as any);
      prismaService.cryptoTransaction.findMany.mockResolvedValue([
        {
          id: 'tx-1',
          type: 'TRANSFER_OUT',
          blockTimestamp: new Date('2024-06-01'),
          assetOut: 'BTC',
          amountOut: new Decimal(1),
          priceOutEur: new Decimal(50000),
          costBasis: new Decimal(30000),
          realizedGain: new Decimal(20000),
        },
      ] as any);

      const report = await service.generateTaxReport(
        mockCompanyId,
        new Date('2024-01-01'),
        new Date('2024-12-31'),
      );

      // By default, all entries are short-term in current implementation
      expect(report.entries[0].holdingPeriod).toBe('SHORT');
      expect(report.summary.shortTermGainLoss).toBe(20000);
    });

    it('should handle empty transaction list', async () => {
      prismaService.wallet.findMany.mockResolvedValue([{ id: 'wallet-1' }] as any);
      prismaService.cryptoTransaction.findMany.mockResolvedValue([]);

      const report = await service.generateTaxReport(
        mockCompanyId,
        new Date('2024-01-01'),
        new Date('2024-12-31'),
      );

      expect(report.entries).toHaveLength(0);
      expect(report.summary.totalGainLoss).toBe(0);
    });
  });

  describe('recalculateForAsset', () => {
    it('should delete existing lots and recreate from transactions', async () => {
      const mockAsset = { id: mockAssetId, symbol: 'BTC' };
      const mockWallets = [{ id: 'wallet-1' }];
      const mockTransactions = [
        {
          id: 'tx-1',
          type: 'TRANSFER_IN',
          blockTimestamp: new Date('2024-01-01'),
          assetIn: 'BTC',
          amountIn: new Decimal(2),
          priceInEur: new Decimal(30000),
        },
        {
          id: 'tx-2',
          type: 'TRANSFER_OUT',
          blockTimestamp: new Date('2024-02-01'),
          assetOut: 'BTC',
          amountOut: new Decimal(1),
          priceOutEur: new Decimal(40000),
        },
      ];

      prismaService.cryptoLot.deleteMany.mockResolvedValue({ count: 2 } as any);
      prismaService.wallet.findMany.mockResolvedValue(mockWallets as any);
      prismaService.cryptoAsset.findUnique.mockResolvedValue(mockAsset as any);
      prismaService.cryptoTransaction.findMany.mockResolvedValue(mockTransactions as any);
      prismaService.cryptoLot.create.mockResolvedValue({} as any);
      prismaService.cryptoLot.findMany.mockResolvedValue([
        {
          id: 'new-lot-1',
          remainingAmount: new Decimal(2),
          costPerUnit: new Decimal(15000),
          acquiredAt: new Date('2024-01-01'),
        },
      ] as any);
      prismaService.cryptoLot.update.mockResolvedValue({} as any);
      prismaService.cryptoTransaction.update.mockResolvedValue({} as any);

      await service.recalculateForAsset(mockCompanyId, mockAssetId);

      // Should delete existing lots first
      expect(prismaService.cryptoLot.deleteMany).toHaveBeenCalledWith({
        where: { companyId: mockCompanyId, cryptoAssetId: mockAssetId },
      });

      // Should create lot for TRANSFER_IN
      expect(prismaService.cryptoLot.create).toHaveBeenCalled();

      // Should calculate FIFO and update for TRANSFER_OUT
      expect(prismaService.cryptoTransaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-2' },
        data: expect.objectContaining({
          costBasis: expect.anything(),
          realizedGain: expect.anything(),
        }),
      });
    });

    it('should handle non-existent asset gracefully', async () => {
      prismaService.cryptoLot.deleteMany.mockResolvedValue({ count: 0 } as any);
      prismaService.wallet.findMany.mockResolvedValue([]);
      prismaService.cryptoAsset.findUnique.mockResolvedValue(null);

      await service.recalculateForAsset(mockCompanyId, 'non-existent-asset');

      // Should not throw, just log warning
      expect(prismaService.cryptoTransaction.findMany).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle very small amounts correctly', async () => {
      const mockLots = [
        {
          id: 'lot-1',
          remainingAmount: new Decimal('0.00000001'),
          costPerUnit: new Decimal(50000),
          acquiredAt: new Date('2024-01-01'),
        },
      ];

      prismaService.cryptoLot.findMany.mockResolvedValue(mockLots as any);
      prismaService.cryptoLot.update.mockResolvedValue({} as any);

      const result = await service.calculateFIFO(
        mockCompanyId,
        mockAssetId,
        0.00000001,
        new Date('2024-06-01'),
        0.0005, // ~0.5 cents
      );

      expect(result.costBasis).toBeCloseTo(0.0005, 8);
    });

    it('should handle negative gain (loss) correctly', async () => {
      const mockLots = [
        {
          id: 'lot-1',
          remainingAmount: new Decimal(1),
          costPerUnit: new Decimal(50000), // Bought high
          acquiredAt: new Date('2024-01-01'),
        },
      ];

      prismaService.cryptoLot.findMany.mockResolvedValue(mockLots as any);
      prismaService.cryptoLot.update.mockResolvedValue({} as any);

      const result = await service.calculateFIFO(
        mockCompanyId,
        mockAssetId,
        1,
        new Date('2024-06-01'),
        30000, // Sold low
      );

      expect(result.realizedGain).toBe(-20000); // Loss of 20000
    });
  });
});
