import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CryptoTransactionsService } from '../../../src/modules/crypto/services/crypto-transactions.service.js';
import { CostBasisService } from '../../../src/modules/crypto/services/cost-basis.service.js';
import { PrismaService } from '@crypto-erp/database';
import { CryptoTxType } from '@prisma/client';
import { Decimal } from 'decimal.js';

/**
 * UNIT TEST: Crypto Transactions Service
 * Tests para el servicio de transacciones crypto
 *
 * Tests críticos:
 * - Listado de transacciones con filtros
 * - Portfolio summary
 * - Tax report generation
 * - Transaction statistics
 * - Recategorización de transacciones
 */

describe('CryptoTransactionsService', () => {
  let service: CryptoTransactionsService;
  let prismaService: jest.Mocked<PrismaService>;
  let costBasisService: jest.Mocked<CostBasisService>;

  const mockCompanyId = 'company-1';
  const mockWalletId = 'wallet-1';
  const mockTxId = 'tx-1';

  const mockWallet = {
    id: mockWalletId,
    label: 'Main Wallet',
    address: '0x123...',
    chain: 'ethereum',
    companyId: mockCompanyId,
  };

  const mockTransaction = {
    id: mockTxId,
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
    blockTimestamp: new Date('2024-01-15'),
    manualType: null,
    manualNotes: null,
    wallet: mockWallet,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CryptoTransactionsService,
        {
          provide: PrismaService,
          useValue: {
            wallet: {
              findMany: jest.fn(),
            },
            cryptoTransaction: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              count: jest.fn(),
              groupBy: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: CostBasisService,
          useValue: {
            getPortfolioPositions: jest.fn(),
            generateTaxReport: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CryptoTransactionsService>(CryptoTransactionsService);
    prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
    costBasisService = module.get(CostBasisService) as jest.Mocked<CostBasisService>;
  });

  describe('findAll', () => {
    it('should return transactions with pagination', async () => {
      prismaService.wallet.findMany.mockResolvedValue([{ id: mockWalletId }] as any);
      prismaService.cryptoTransaction.findMany.mockResolvedValue([mockTransaction] as any);
      prismaService.cryptoTransaction.count.mockResolvedValue(1);

      const result = await service.findAll(mockCompanyId, {});

      expect(result.transactions).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.transactions[0].wallet).toBeDefined();
    });

    it('should filter by transaction type', async () => {
      prismaService.wallet.findMany.mockResolvedValue([{ id: mockWalletId }] as any);
      prismaService.cryptoTransaction.findMany.mockResolvedValue([]);
      prismaService.cryptoTransaction.count.mockResolvedValue(0);

      await service.findAll(mockCompanyId, { type: 'TRANSFER_IN' });

      expect(prismaService.cryptoTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'TRANSFER_IN',
          }),
        }),
      );
    });

    it('should filter by wallet ID', async () => {
      prismaService.wallet.findMany.mockResolvedValue([{ id: mockWalletId }] as any);
      prismaService.cryptoTransaction.findMany.mockResolvedValue([]);
      prismaService.cryptoTransaction.count.mockResolvedValue(0);

      await service.findAll(mockCompanyId, { walletId: mockWalletId });

      expect(prismaService.cryptoTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            walletId: mockWalletId,
          }),
        }),
      );
    });

    it('should filter by date range', async () => {
      prismaService.wallet.findMany.mockResolvedValue([{ id: mockWalletId }] as any);
      prismaService.cryptoTransaction.findMany.mockResolvedValue([]);
      prismaService.cryptoTransaction.count.mockResolvedValue(0);

      await service.findAll(mockCompanyId, {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });

      expect(prismaService.cryptoTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            blockTimestamp: expect.any(Object),
          }),
        }),
      );
    });

    it('should apply pagination with skip and take', async () => {
      prismaService.wallet.findMany.mockResolvedValue([{ id: mockWalletId }] as any);
      prismaService.cryptoTransaction.findMany.mockResolvedValue([]);
      prismaService.cryptoTransaction.count.mockResolvedValue(0);

      await service.findAll(mockCompanyId, { skip: 10, take: 20 });

      expect(prismaService.cryptoTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 20,
        }),
      );
    });

    it('should order by block timestamp descending', async () => {
      prismaService.wallet.findMany.mockResolvedValue([{ id: mockWalletId }] as any);
      prismaService.cryptoTransaction.findMany.mockResolvedValue([]);
      prismaService.cryptoTransaction.count.mockResolvedValue(0);

      await service.findAll(mockCompanyId, {});

      expect(prismaService.cryptoTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { blockTimestamp: 'desc' },
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return transaction by ID', async () => {
      prismaService.cryptoTransaction.findUnique.mockResolvedValue(mockTransaction as any);

      const result = await service.findById(mockCompanyId, mockTxId);

      expect(result).toEqual(mockTransaction);
      expect(result.wallet).toBeDefined();
    });

    it('should throw NotFoundException if transaction not found', async () => {
      prismaService.cryptoTransaction.findUnique.mockResolvedValue(null);

      await expect(service.findById(mockCompanyId, 'invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if transaction belongs to different company', async () => {
      const wrongCompanyTx = {
        ...mockTransaction,
        wallet: { ...mockWallet, companyId: 'other-company' },
      };
      prismaService.cryptoTransaction.findUnique.mockResolvedValue(wrongCompanyTx as any);

      await expect(service.findById(mockCompanyId, mockTxId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPortfolioSummary', () => {
    it('should return portfolio summary with positions', async () => {
      const mockPositions = [
        {
          assetId: 'btc',
          symbol: 'BTC',
          name: 'Bitcoin',
          totalAmount: 2.5,
          totalCostBasis: 75000,
          averageCostBasis: 30000,
        },
        {
          assetId: 'eth',
          symbol: 'ETH',
          name: 'Ethereum',
          totalAmount: 10,
          totalCostBasis: 20000,
          averageCostBasis: 2000,
        },
      ];

      costBasisService.getPortfolioPositions.mockResolvedValue(mockPositions);

      const result = await service.getPortfolioSummary(mockCompanyId);

      expect(result.positions).toEqual(mockPositions);
      expect(result.totalCostBasis).toBe(95000); // 75k + 20k
    });

    it('should handle empty portfolio', async () => {
      costBasisService.getPortfolioPositions.mockResolvedValue([]);

      const result = await service.getPortfolioSummary(mockCompanyId);

      expect(result.positions).toEqual([]);
      expect(result.totalCostBasis).toBe(0);
    });
  });

  describe('getTaxReport', () => {
    it('should generate tax report for date range', async () => {
      const mockTaxReport = {
        entries: [
          {
            date: new Date('2024-01-15'),
            type: 'SALE',
            asset: 'BTC',
            quantity: new Decimal('0.5'),
            proceeds: 22500,
            costBasis: 15000,
            gainLoss: 7500,
          },
        ],
        summary: {
          totalProceeds: 22500,
          totalCostBasis: 15000,
          totalGainLoss: 7500,
        },
      };

      costBasisService.generateTaxReport.mockResolvedValue(mockTaxReport as any);

      const result = await service.getTaxReport(mockCompanyId, '2024-01-01', '2024-12-31');

      expect(costBasisService.generateTaxReport).toHaveBeenCalledWith(
        mockCompanyId,
        new Date('2024-01-01'),
        new Date('2024-12-31'),
      );
      expect(result).toEqual(mockTaxReport);
    });
  });

  describe('getTransactionStats', () => {
    it('should return transaction statistics', async () => {
      prismaService.wallet.findMany.mockResolvedValue([{ id: mockWalletId }] as any);
      prismaService.cryptoTransaction.count.mockResolvedValue(150);
      prismaService.cryptoTransaction.groupBy
        .mockResolvedValueOnce([
          { type: 'TRANSFER_IN', _count: 50 },
          { type: 'TRANSFER_OUT', _count: 30 },
          { type: 'SWAP', _count: 20 },
          { type: 'CLAIM_REWARD', _count: 40 },
          { type: 'FEE', _count: 10 },
        ] as any)
        .mockResolvedValueOnce([
          { chain: 'ethereum', _count: 80 },
          { chain: 'polygon', _count: 50 },
          { chain: 'bsc', _count: 20 },
        ] as any);

      const result = await service.getTransactionStats(mockCompanyId);

      expect(result.totalTransactions).toBe(150);
      expect(result.transactionsByType['TRANSFER_IN']).toBe(50);
      expect(result.transactionsByType['SWAP']).toBe(20);
      expect(result.transactionsByChain['ethereum']).toBe(80);
      expect(result.transactionsByChain['polygon']).toBe(50);
    });

    it('should handle company with no transactions', async () => {
      prismaService.wallet.findMany.mockResolvedValue([{ id: mockWalletId }] as any);
      prismaService.cryptoTransaction.count.mockResolvedValue(0);
      prismaService.cryptoTransaction.groupBy.mockResolvedValue([] as any);

      const result = await service.getTransactionStats(mockCompanyId);

      expect(result.totalTransactions).toBe(0);
      expect(Object.keys(result.transactionsByType)).toHaveLength(0);
    });
  });

  describe('recategorizeTransaction', () => {
    it('should recategorize transaction', async () => {
      const recategorized = {
        ...mockTransaction,
        manualType: 'SWAP' as CryptoTxType,
        manualNotes: 'Corrected classification',
      };

      prismaService.cryptoTransaction.findUnique
        .mockResolvedValueOnce(mockTransaction as any) // findById
        .mockResolvedValueOnce(recategorized as any); // findById after update

      prismaService.cryptoTransaction.update.mockResolvedValue(recategorized as any);

      const result = await service.recategorizeTransaction(
        mockCompanyId,
        mockTxId,
        'SWAP' as CryptoTxType,
        'Corrected classification',
      );

      expect(prismaService.cryptoTransaction.update).toHaveBeenCalledWith({
        where: { id: mockTxId },
        data: {
          manualType: 'SWAP',
          manualNotes: 'Corrected classification',
        },
      });
      expect(result.manualType).toBe('SWAP');
    });

    it('should recategorize without notes', async () => {
      prismaService.cryptoTransaction.findUnique
        .mockResolvedValueOnce(mockTransaction as any)
        .mockResolvedValueOnce(mockTransaction as any);

      prismaService.cryptoTransaction.update.mockResolvedValue(mockTransaction as any);

      await service.recategorizeTransaction(mockCompanyId, mockTxId, 'CLAIM_REWARD' as CryptoTxType);

      expect(prismaService.cryptoTransaction.update).toHaveBeenCalledWith({
        where: { id: mockTxId },
        data: {
          manualType: 'CLAIM_REWARD',
          manualNotes: undefined,
        },
      });
    });

    it('should throw NotFoundException if transaction not found', async () => {
      prismaService.cryptoTransaction.findUnique.mockResolvedValue(null);

      await expect(
        service.recategorizeTransaction(mockCompanyId, 'invalid-id', 'SWAP' as CryptoTxType),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Service Setup', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have PrismaService injected', () => {
      expect(prismaService).toBeDefined();
    });

    it('should have CostBasisService injected', () => {
      expect(costBasisService).toBeDefined();
    });
  });
});
