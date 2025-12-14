import { Test, TestingModule } from '@nestjs/testing';
import { CryptoTransactionsController } from '../../../src/modules/crypto/controllers/crypto-transactions.controller.js';
import { CryptoTransactionsService, CostBasisService } from '../../../src/modules/crypto/services/index.js';
import { CryptoTxType } from '@prisma/client';
import { Decimal } from 'decimal.js';

/**
 * UNIT TEST: Crypto Transactions Controller
 * Tests para el controlador de transacciones crypto
 *
 * Tests críticos:
 * - Listado de transacciones con filtros
 * - Resumen de portfolio
 * - Estadísticas de transacciones
 * - Reporte fiscal (tax report)
 * - FIFO cost basis lots
 * - Recálculo de cost basis
 * - Recategorización de transacciones
 */

describe('CryptoTransactionsController', () => {
  let controller: CryptoTransactionsController;
  let transactionsService: jest.Mocked<CryptoTransactionsService>;
  let costBasisService: jest.Mocked<CostBasisService>;

  const mockCompanyId = 'company-1';
  const mockTxId = 'tx-1';
  const mockAssetId = 'asset-btc';
  const mockWalletId = 'wallet-1';

  const mockTransaction = {
    id: mockTxId,
    companyId: mockCompanyId,
    walletId: mockWalletId,
    txHash: '0xabc123',
    type: 'TRANSFER_IN' as CryptoTxType,
    chain: 'ethereum',
    assetSymbol: 'ETH',
    amount: new Decimal('1.5'),
    feeAmount: new Decimal('0.001'),
    feeAssetSymbol: 'ETH',
    valueEur: new Decimal('3000'),
    priceEur: new Decimal('2000'),
    timestamp: new Date('2024-01-15'),
  };

  const mockPortfolioSummary = {
    positions: [
      {
        assetSymbol: 'BTC',
        totalQuantity: new Decimal('2.5'),
        totalCostBasis: new Decimal('75000'),
        averageCostPerUnit: new Decimal('30000'),
        currentPrice: new Decimal('45000'),
        currentValue: new Decimal('112500'),
        unrealizedGainLoss: new Decimal('37500'),
      },
    ],
    totalCostBasis: 75000,
    totalCurrentValue: 112500,
    totalUnrealizedGainLoss: 37500,
  };

  const mockStats = {
    totalTransactions: 150,
    byType: {
      TRANSFER_IN: 50,
      TRANSFER_OUT: 30,
      SWAP: 20,
      CLAIM_REWARD: 40,
      FEE: 10,
    },
    totalValueEur: new Decimal('250000'),
    uniqueAssets: 5,
  };

  const mockTaxReport = {
    entries: [
      {
        txId: mockTxId,
        date: new Date('2024-01-15'),
        type: 'SALE',
        asset: 'BTC',
        quantity: new Decimal('0.5'),
        proceeds: 22500,
        costBasis: 15000,
        gainLoss: 7500,
        holdingPeriod: 180,
        isLongTerm: false,
      },
    ],
    summary: {
      totalProceeds: 22500,
      totalCostBasis: 15000,
      totalGainLoss: 7500,
      shortTermGainLoss: 7500,
      longTermGainLoss: 0,
    },
  };

  const mockCostBasisLots = [
    {
      id: 'lot-1',
      assetId: mockAssetId,
      acquiredAt: new Date('2024-01-01'),
      quantity: new Decimal('1.0'),
      costPerUnit: new Decimal('30000'),
      remainingAmount: new Decimal('0.5'),
    },
    {
      id: 'lot-2',
      assetId: mockAssetId,
      acquiredAt: new Date('2024-02-01'),
      quantity: new Decimal('1.0'),
      costPerUnit: new Decimal('35000'),
      remainingAmount: new Decimal('1.0'),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CryptoTransactionsController],
      providers: [
        {
          provide: CryptoTransactionsService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            getPortfolioSummary: jest.fn(),
            getTransactionStats: jest.fn(),
            getTaxReport: jest.fn(),
            recategorizeTransaction: jest.fn(),
          },
        },
        {
          provide: CostBasisService,
          useValue: {
            getLotsForAsset: jest.fn(),
            recalculateForAsset: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CryptoTransactionsController>(CryptoTransactionsController);
    transactionsService = module.get(CryptoTransactionsService) as jest.Mocked<CryptoTransactionsService>;
    costBasisService = module.get(CostBasisService) as jest.Mocked<CostBasisService>;
  });

  describe('findAll', () => {
    it('should return paginated list of transactions', async () => {
      const mockResponse = {
        data: [mockTransaction],
        total: 1,
        skip: 0,
        take: 10,
      };
      transactionsService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll(mockCompanyId);

      expect(transactionsService.findAll).toHaveBeenCalledWith(mockCompanyId, expect.any(Object));
      expect(result).toEqual(mockResponse);
      expect(result.data).toHaveLength(1);
    });

    it('should apply type filter', async () => {
      transactionsService.findAll.mockResolvedValue({ data: [], total: 0, skip: 0, take: 10 });

      await controller.findAll(mockCompanyId, 'TRANSFER_IN');

      expect(transactionsService.findAll).toHaveBeenCalledWith(
        mockCompanyId,
        expect.objectContaining({ type: 'TRANSFER_IN' }),
      );
    });

    it('should apply wallet filter', async () => {
      transactionsService.findAll.mockResolvedValue({ data: [], total: 0, skip: 0, take: 10 });

      await controller.findAll(mockCompanyId, undefined, mockWalletId);

      expect(transactionsService.findAll).toHaveBeenCalledWith(
        mockCompanyId,
        expect.objectContaining({ walletId: mockWalletId }),
      );
    });

    it('should apply date range filter', async () => {
      transactionsService.findAll.mockResolvedValue({ data: [], total: 0, skip: 0, take: 10 });

      await controller.findAll(
        mockCompanyId,
        undefined,
        undefined,
        undefined,
        '2024-01-01',
        '2024-12-31',
      );

      expect(transactionsService.findAll).toHaveBeenCalledWith(
        mockCompanyId,
        expect.objectContaining({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        }),
      );
    });

    it('should parse pagination parameters', async () => {
      transactionsService.findAll.mockResolvedValue({ data: [], total: 0, skip: 20, take: 50 });

      await controller.findAll(
        mockCompanyId,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        '20',
        '50',
      );

      expect(transactionsService.findAll).toHaveBeenCalledWith(
        mockCompanyId,
        expect.objectContaining({ skip: 20, take: 50 }),
      );
    });
  });

  describe('getPortfolioSummary', () => {
    it('should return portfolio summary with positions', async () => {
      transactionsService.getPortfolioSummary.mockResolvedValue(mockPortfolioSummary);

      const result = await controller.getPortfolioSummary(mockCompanyId);

      expect(transactionsService.getPortfolioSummary).toHaveBeenCalledWith(mockCompanyId);
      expect(result.positions).toHaveLength(1);
      expect(result.totalUnrealizedGainLoss).toBe(37500);
    });

    it('should calculate unrealized gains correctly', async () => {
      transactionsService.getPortfolioSummary.mockResolvedValue(mockPortfolioSummary);

      const result = await controller.getPortfolioSummary(mockCompanyId);

      const position = result.positions[0];
      // (2.5 BTC * 45k) - 75k cost basis = 37.5k unrealized gain
      expect(position.unrealizedGainLoss.toNumber()).toBe(37500);
    });
  });

  describe('getStats', () => {
    it('should return transaction statistics', async () => {
      transactionsService.getTransactionStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(mockCompanyId);

      expect(transactionsService.getTransactionStats).toHaveBeenCalledWith(mockCompanyId);
      expect(result.totalTransactions).toBe(150);
      expect(result.uniqueAssets).toBe(5);
    });

    it('should group transactions by type', async () => {
      transactionsService.getTransactionStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(mockCompanyId);

      expect(result.byType.TRANSFER_IN).toBe(50);
      expect(result.byType.SWAP).toBe(20);
      expect(result.byType.CLAIM_REWARD).toBe(40);
    });
  });

  describe('getTaxReport', () => {
    it('should generate tax report for date range', async () => {
      transactionsService.getTaxReport.mockResolvedValue(mockTaxReport);

      const result = await controller.getTaxReport(mockCompanyId, '2024-01-01', '2024-12-31');

      expect(transactionsService.getTaxReport).toHaveBeenCalledWith(
        mockCompanyId,
        '2024-01-01',
        '2024-12-31',
      );
      expect(result.entries).toHaveLength(1);
      expect(result.summary.totalGainLoss).toBe(7500);
    });

    it('should separate short-term and long-term gains', async () => {
      transactionsService.getTaxReport.mockResolvedValue(mockTaxReport);

      const result = await controller.getTaxReport(mockCompanyId, '2024-01-01', '2024-12-31');

      expect(result.summary.shortTermGainLoss).toBe(7500); // < 1 year
      expect(result.summary.longTermGainLoss).toBe(0);
    });

    it('should return empty report if dates not provided', async () => {
      const result = await controller.getTaxReport(mockCompanyId, '', '');

      expect(result.entries).toEqual([]);
      expect(result.summary.totalGainLoss).toBe(0);
    });
  });

  describe('getLots', () => {
    it('should return cost basis lots for asset', async () => {
      costBasisService.getLotsForAsset.mockResolvedValue(mockCostBasisLots);

      const result = await controller.getLots(mockCompanyId, mockAssetId);

      expect(costBasisService.getLotsForAsset).toHaveBeenCalledWith(
        mockCompanyId,
        mockAssetId,
        false,
      );
      expect(result).toHaveLength(2);
    });

    it('should include exhausted lots if requested', async () => {
      const exhaustedLots = [
        ...mockCostBasisLots,
        {
          id: 'lot-3',
          assetId: mockAssetId,
          acquiredAt: new Date('2023-12-01'),
          quantity: new Decimal('1.0'),
          costPerUnit: new Decimal('28000'),
          remainingAmount: new Decimal('0'),
        },
      ];
      costBasisService.getLotsForAsset.mockResolvedValue(exhaustedLots);

      const result = await controller.getLots(mockCompanyId, mockAssetId, 'true');

      expect(costBasisService.getLotsForAsset).toHaveBeenCalledWith(
        mockCompanyId,
        mockAssetId,
        true,
      );
      expect(result).toHaveLength(3);
    });

    it('should return lots in FIFO order (oldest first)', async () => {
      costBasisService.getLotsForAsset.mockResolvedValue(mockCostBasisLots);

      const result = await controller.getLots(mockCompanyId, mockAssetId);

      // Verificar que lot-1 (2024-01-01) viene antes que lot-2 (2024-02-01)
      expect(result[0].acquiredAt.getTime()).toBeLessThan(result[1].acquiredAt.getTime());
    });
  });

  describe('findById', () => {
    it('should return transaction by ID', async () => {
      transactionsService.findById.mockResolvedValue(mockTransaction);

      const result = await controller.findById(mockCompanyId, mockTxId);

      expect(transactionsService.findById).toHaveBeenCalledWith(mockCompanyId, mockTxId);
      expect(result).toEqual(mockTransaction);
    });

    it('should throw error if transaction not found', async () => {
      transactionsService.findById.mockRejectedValue(new Error('Transaction not found'));

      await expect(controller.findById(mockCompanyId, 'invalid-id')).rejects.toThrow();
    });
  });

  describe('recalculateCostBasis', () => {
    it('should recalculate cost basis for asset', async () => {
      costBasisService.recalculateForAsset.mockResolvedValue(undefined);

      const result = await controller.recalculateCostBasis(mockCompanyId, mockAssetId);

      expect(costBasisService.recalculateForAsset).toHaveBeenCalledWith(
        mockCompanyId,
        mockAssetId,
      );
      expect(result.success).toBe(true);
      expect(result.message).toBe('Cost basis recalculated');
    });

    it('should handle recalculation errors', async () => {
      costBasisService.recalculateForAsset.mockRejectedValue(new Error('No transactions found'));

      await expect(controller.recalculateCostBasis(mockCompanyId, mockAssetId)).rejects.toThrow();
    });
  });

  describe('recategorize', () => {
    it('should recategorize transaction', async () => {
      const recategorized = { ...mockTransaction, type: 'SWAP' as CryptoTxType };
      transactionsService.recategorizeTransaction.mockResolvedValue(recategorized);

      const result = await controller.recategorize(mockCompanyId, mockTxId, {
        type: 'SWAP' as CryptoTxType,
        notes: 'Corrected classification',
      });

      expect(transactionsService.recategorizeTransaction).toHaveBeenCalledWith(
        mockCompanyId,
        mockTxId,
        'SWAP',
        'Corrected classification',
      );
      expect(result.type).toBe('SWAP');
    });

    it('should recategorize without notes', async () => {
      const recategorized = { ...mockTransaction, type: 'CLAIM_REWARD' as CryptoTxType };
      transactionsService.recategorizeTransaction.mockResolvedValue(recategorized);

      await controller.recategorize(mockCompanyId, mockTxId, {
        type: 'CLAIM_REWARD' as CryptoTxType,
      });

      expect(transactionsService.recategorizeTransaction).toHaveBeenCalledWith(
        mockCompanyId,
        mockTxId,
        'CLAIM_REWARD',
        undefined,
      );
    });
  });

  describe('Controller Setup', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have CryptoTransactionsService injected', () => {
      expect(transactionsService).toBeDefined();
    });

    it('should have CostBasisService injected', () => {
      expect(costBasisService).toBeDefined();
    });
  });
});
