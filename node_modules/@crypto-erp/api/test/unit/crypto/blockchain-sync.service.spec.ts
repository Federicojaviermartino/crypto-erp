import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { BlockchainSyncService } from '../../../src/modules/crypto/services/blockchain-sync.service.js';
import { PrismaService } from '@crypto-erp/database';
import { CovalentClient } from '../../../src/modules/crypto/blockchain/covalent.client.js';
import { TransactionParser } from '../../../src/modules/crypto/blockchain/transaction-parser.js';
import { WalletsService } from '../../../src/modules/crypto/services/wallets.service.js';
import { CryptoTxType, Prisma } from '@prisma/client';
import { Decimal } from 'decimal.js';

/**
 * UNIT TEST: Blockchain Sync Service
 * Tests para el servicio de sincronización blockchain
 *
 * Tests críticos:
 * - Prevención de sync concurrente del mismo wallet
 * - Integración con Covalent API
 * - Parseo y almacenamiento de transacciones
 * - Sincronización de ERC20 transfers
 * - Manejo de errores y status updates
 * - Paginación de transacciones
 */

describe('BlockchainSyncService', () => {
  let service: BlockchainSyncService;
  let prismaService: jest.Mocked<PrismaService>;
  let covalentClient: jest.Mocked<CovalentClient>;
  let transactionParser: jest.Mocked<TransactionParser>;
  let walletsService: jest.Mocked<WalletsService>;

  const mockCompanyId = 'company-1';
  const mockWalletId = 'wallet-1';

  const mockWallet = {
    id: mockWalletId,
    companyId: mockCompanyId,
    label: 'Main Wallet',
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    chain: 'ethereum',
    lastSyncBlock: BigInt(18000000),
    lastSyncAt: new Date('2024-01-15'),
    syncStatus: 'SYNCED',
    syncError: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  };

  const mockCovalentTx = {
    tx_hash: '0xabc123...',
    block_height: 18000100,
    block_signed_at: '2024-01-16T10:00:00Z',
    from_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    to_address: '0x123456...',
    value: '1000000000000000000', // 1 ETH
    gas_spent: 21000,
    gas_price: 50000000000,
    gas_quote: 25.5,
    successful: true,
  };

  const mockParsedTx = {
    type: 'TRANSFER_OUT' as CryptoTxType,
    subtype: null,
    assetIn: null,
    amountIn: null,
    assetOut: 'ETH',
    amountOut: '1.0',
    feeAsset: 'ETH',
    feeAmount: '0.00105',
    confidence: 0.95,
    reasoning: 'Simple ETH transfer',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockchainSyncService,
        {
          provide: PrismaService,
          useValue: {
            wallet: {
              findUnique: jest.fn(),
            },
            cryptoTransaction: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: CovalentClient,
          useValue: {
            isConfigured: jest.fn(),
            getChainName: jest.fn(),
            getTransactions: jest.fn(),
            getERC20Transfers: jest.fn(),
          },
        },
        {
          provide: TransactionParser,
          useValue: {
            parseTransaction: jest.fn(),
          },
        },
        {
          provide: WalletsService,
          useValue: {
            setSyncStatus: jest.fn(),
            getWalletsForSync: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BlockchainSyncService>(BlockchainSyncService);
    prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
    covalentClient = module.get(CovalentClient) as jest.Mocked<CovalentClient>;
    transactionParser = module.get(TransactionParser) as jest.Mocked<TransactionParser>;
    walletsService = module.get(WalletsService) as jest.Mocked<WalletsService>;

    // Suppress logger output in tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  describe('syncWallet', () => {
    it('should successfully sync wallet with new transactions', async () => {
      prismaService.wallet.findUnique.mockResolvedValue(mockWallet as any);
      covalentClient.isConfigured.mockReturnValue(true);
      covalentClient.getChainName.mockReturnValue('eth-mainnet');
      covalentClient.getTransactions.mockResolvedValue({
        transactions: [mockCovalentTx],
        hasMore: false,
      } as any);
      covalentClient.getERC20Transfers.mockResolvedValue({
        transfers: [],
      } as any);

      transactionParser.parseTransaction.mockReturnValue(mockParsedTx as any);
      prismaService.cryptoTransaction.findFirst.mockResolvedValue(null); // New transaction
      prismaService.cryptoTransaction.create.mockResolvedValue({} as any);
      walletsService.setSyncStatus.mockResolvedValue(undefined);

      const result = await service.syncWallet(mockWalletId);

      expect(result.success).toBe(true);
      expect(result.transactionsProcessed).toBe(1);
      expect(result.newTransactions).toBe(1);
      expect(result.lastBlock).toBe(BigInt(18000100));
      expect(walletsService.setSyncStatus).toHaveBeenCalledWith(mockWalletId, 'SYNCING');
      expect(walletsService.setSyncStatus).toHaveBeenCalledWith(
        mockWalletId,
        'SYNCED',
        null,
        BigInt(18000100),
      );
    });

    it('should prevent concurrent sync for same wallet (CRITICAL)', async () => {
      // Mock a long-running sync
      prismaService.wallet.findUnique.mockResolvedValue(mockWallet as any);
      covalentClient.isConfigured.mockReturnValue(true);
      covalentClient.getChainName.mockReturnValue('eth-mainnet');
      covalentClient.getTransactions.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve({ transactions: [], hasMore: false } as any),
              100,
            ),
          ),
      );
      covalentClient.getERC20Transfers.mockResolvedValue({ transfers: [] } as any);
      walletsService.setSyncStatus.mockResolvedValue(undefined);

      // Start first sync (don't await)
      const firstSync = service.syncWallet(mockWalletId);

      // Try concurrent sync
      const secondSync = await service.syncWallet(mockWalletId);

      expect(secondSync.success).toBe(false);
      expect(secondSync.error).toBe('Sync already in progress');

      // Wait for first sync to complete
      await firstSync;
    });

    it('should skip duplicate transactions', async () => {
      prismaService.wallet.findUnique.mockResolvedValue(mockWallet as any);
      covalentClient.isConfigured.mockReturnValue(true);
      covalentClient.getChainName.mockReturnValue('eth-mainnet');
      covalentClient.getTransactions.mockResolvedValue({
        transactions: [mockCovalentTx],
        hasMore: false,
      } as any);
      covalentClient.getERC20Transfers.mockResolvedValue({ transfers: [] } as any);

      prismaService.cryptoTransaction.findFirst.mockResolvedValue({ id: 'existing-tx' } as any); // Duplicate
      walletsService.setSyncStatus.mockResolvedValue(undefined);

      const result = await service.syncWallet(mockWalletId);

      expect(result.success).toBe(true);
      expect(result.transactionsProcessed).toBe(1);
      expect(result.newTransactions).toBe(0); // Skipped duplicate
      expect(prismaService.cryptoTransaction.create).not.toHaveBeenCalled();
    });

    it('should handle pagination with multiple pages', async () => {
      prismaService.wallet.findUnique.mockResolvedValue(mockWallet as any);
      covalentClient.isConfigured.mockReturnValue(true);
      covalentClient.getChainName.mockReturnValue('eth-mainnet');
      covalentClient.getTransactions
        .mockResolvedValueOnce({
          transactions: [mockCovalentTx],
          hasMore: true,
        } as any)
        .mockResolvedValueOnce({
          transactions: [{ ...mockCovalentTx, tx_hash: '0xdef456' }],
          hasMore: false,
        } as any);
      covalentClient.getERC20Transfers.mockResolvedValue({ transfers: [] } as any);

      transactionParser.parseTransaction.mockReturnValue(mockParsedTx as any);
      prismaService.cryptoTransaction.findFirst.mockResolvedValue(null);
      prismaService.cryptoTransaction.create.mockResolvedValue({} as any);
      walletsService.setSyncStatus.mockResolvedValue(undefined);

      const result = await service.syncWallet(mockWalletId);

      expect(result.success).toBe(true);
      expect(result.transactionsProcessed).toBe(2);
      expect(result.newTransactions).toBe(2);
      expect(covalentClient.getTransactions).toHaveBeenCalledTimes(2);
    });

    it('should stop pagination at safety limit (100 pages)', async () => {
      prismaService.wallet.findUnique.mockResolvedValue(mockWallet as any);
      covalentClient.isConfigured.mockReturnValue(true);
      covalentClient.getChainName.mockReturnValue('eth-mainnet');
      covalentClient.getTransactions.mockResolvedValue({
        transactions: [mockCovalentTx],
        hasMore: true, // Always more
      } as any);
      covalentClient.getERC20Transfers.mockResolvedValue({ transfers: [] } as any);

      transactionParser.parseTransaction.mockReturnValue(mockParsedTx as any);
      prismaService.cryptoTransaction.findFirst.mockResolvedValue(null);
      prismaService.cryptoTransaction.create.mockResolvedValue({} as any);
      walletsService.setSyncStatus.mockResolvedValue(undefined);

      const result = await service.syncWallet(mockWalletId);

      expect(result.success).toBe(true);
      expect(covalentClient.getTransactions).toHaveBeenCalledTimes(101); // Pages 0-100
    });

    it('should throw error if wallet not found', async () => {
      prismaService.wallet.findUnique.mockResolvedValue(null);

      const result = await service.syncWallet('invalid-wallet');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Wallet not found');
      expect(walletsService.setSyncStatus).toHaveBeenCalledWith('invalid-wallet', 'ERROR', 'Wallet not found');
    });

    it('should throw error if Covalent not configured', async () => {
      prismaService.wallet.findUnique.mockResolvedValue(mockWallet as any);
      covalentClient.isConfigured.mockReturnValue(false);

      const result = await service.syncWallet(mockWalletId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Covalent API not configured');
    });

    it('should handle sync errors gracefully', async () => {
      prismaService.wallet.findUnique.mockResolvedValue(mockWallet as any);
      covalentClient.isConfigured.mockReturnValue(true);
      covalentClient.getChainName.mockReturnValue('eth-mainnet');
      covalentClient.getTransactions.mockRejectedValue(new Error('API rate limit exceeded'));
      walletsService.setSyncStatus.mockResolvedValue(undefined);

      const result = await service.syncWallet(mockWalletId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('API rate limit exceeded');
      expect(walletsService.setSyncStatus).toHaveBeenCalledWith(
        mockWalletId,
        'ERROR',
        'API rate limit exceeded',
      );
    });

    it('should track highest block number across transactions', async () => {
      prismaService.wallet.findUnique.mockResolvedValue(mockWallet as any);
      covalentClient.isConfigured.mockReturnValue(true);
      covalentClient.getChainName.mockReturnValue('eth-mainnet');
      covalentClient.getTransactions.mockResolvedValue({
        transactions: [
          { ...mockCovalentTx, block_height: 18000100 },
          { ...mockCovalentTx, block_height: 18000200, tx_hash: '0xabc456' },
          { ...mockCovalentTx, block_height: 18000150, tx_hash: '0xabc789' },
        ],
        hasMore: false,
      } as any);
      covalentClient.getERC20Transfers.mockResolvedValue({ transfers: [] } as any);

      transactionParser.parseTransaction.mockReturnValue(mockParsedTx as any);
      prismaService.cryptoTransaction.findFirst.mockResolvedValue(null);
      prismaService.cryptoTransaction.create.mockResolvedValue({} as any);
      walletsService.setSyncStatus.mockResolvedValue(undefined);

      const result = await service.syncWallet(mockWalletId);

      expect(result.lastBlock).toBe(BigInt(18000200)); // Highest block
    });

    it('should create transaction with correct parsed data', async () => {
      prismaService.wallet.findUnique.mockResolvedValue(mockWallet as any);
      covalentClient.isConfigured.mockReturnValue(true);
      covalentClient.getChainName.mockReturnValue('eth-mainnet');
      covalentClient.getTransactions.mockResolvedValue({
        transactions: [mockCovalentTx],
        hasMore: false,
      } as any);
      covalentClient.getERC20Transfers.mockResolvedValue({ transfers: [] } as any);

      transactionParser.parseTransaction.mockReturnValue(mockParsedTx as any);
      prismaService.cryptoTransaction.findFirst.mockResolvedValue(null);
      prismaService.cryptoTransaction.create.mockResolvedValue({} as any);
      walletsService.setSyncStatus.mockResolvedValue(undefined);

      await service.syncWallet(mockWalletId);

      expect(prismaService.cryptoTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          walletId: mockWalletId,
          txHash: '0xabc123...',
          blockNumber: BigInt(18000100),
          chain: 'ethereum',
          type: 'TRANSFER_OUT',
          assetOut: 'ETH',
          amountOut: expect.any(Prisma.Decimal),
          feeAsset: 'ETH',
          feeAmount: expect.any(Prisma.Decimal),
          aiCategorized: true,
          aiConfidence: expect.any(Prisma.Decimal),
          status: 'COMPLETED', // confidence >= 0.8
        }),
      });
    });

    it('should mark transaction as NEEDS_REVIEW if low confidence', async () => {
      const lowConfidenceParsed = { ...mockParsedTx, confidence: 0.5 };

      prismaService.wallet.findUnique.mockResolvedValue(mockWallet as any);
      covalentClient.isConfigured.mockReturnValue(true);
      covalentClient.getChainName.mockReturnValue('eth-mainnet');
      covalentClient.getTransactions.mockResolvedValue({
        transactions: [mockCovalentTx],
        hasMore: false,
      } as any);
      covalentClient.getERC20Transfers.mockResolvedValue({ transfers: [] } as any);

      transactionParser.parseTransaction.mockReturnValue(lowConfidenceParsed as any);
      prismaService.cryptoTransaction.findFirst.mockResolvedValue(null);
      prismaService.cryptoTransaction.create.mockResolvedValue({} as any);
      walletsService.setSyncStatus.mockResolvedValue(undefined);

      await service.syncWallet(mockWalletId);

      expect(prismaService.cryptoTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'NEEDS_REVIEW', // confidence < 0.8
        }),
      });
    });
  });

  describe('syncERC20Transfers', () => {
    it('should sync ERC20 token transfers', async () => {
      const mockERC20Transfer = {
        tx_hash: '0xtoken123',
        block_height: 18000300,
        block_signed_at: '2024-01-16T11:00:00Z',
        transfers: [
          {
            transfer_type: 'IN',
            delta: '1000000000000000000', // 1 token
            contract_decimals: 18,
            contract_ticker_symbol: 'USDT',
            delta_quote: 1.0,
          },
        ],
      };

      prismaService.wallet.findUnique.mockResolvedValue(mockWallet as any);
      covalentClient.isConfigured.mockReturnValue(true);
      covalentClient.getChainName.mockReturnValue('eth-mainnet');
      covalentClient.getTransactions.mockResolvedValue({
        transactions: [],
        hasMore: false,
      } as any);
      covalentClient.getERC20Transfers.mockResolvedValue({
        transfers: [mockERC20Transfer],
      } as any);

      prismaService.cryptoTransaction.findFirst.mockResolvedValue(null);
      prismaService.cryptoTransaction.create.mockResolvedValue({} as any);
      walletsService.setSyncStatus.mockResolvedValue(undefined);

      await service.syncWallet(mockWalletId);

      expect(prismaService.cryptoTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          txHash: '0xtoken123',
          type: 'TRANSFER_IN',
          assetIn: 'USDT',
          amountIn: expect.any(Prisma.Decimal),
          aiCategorized: true,
          status: 'COMPLETED',
        }),
      });
    });

    it('should skip ERC20 transfers already in main sync', async () => {
      const mockERC20Transfer = {
        tx_hash: '0xabc123...', // Same as mockCovalentTx
        block_height: 18000100,
        block_signed_at: '2024-01-16T10:00:00Z',
        transfers: [
          {
            transfer_type: 'OUT',
            delta: '500000000000000000',
            contract_decimals: 18,
            contract_ticker_symbol: 'DAI',
          },
        ],
      };

      prismaService.wallet.findUnique.mockResolvedValue(mockWallet as any);
      covalentClient.isConfigured.mockReturnValue(true);
      covalentClient.getChainName.mockReturnValue('eth-mainnet');
      covalentClient.getTransactions.mockResolvedValue({
        transactions: [mockCovalentTx],
        hasMore: false,
      } as any);
      covalentClient.getERC20Transfers.mockResolvedValue({
        transfers: [mockERC20Transfer],
      } as any);

      transactionParser.parseTransaction.mockReturnValue(mockParsedTx as any);
      prismaService.cryptoTransaction.findFirst
        .mockResolvedValueOnce(null) // Main sync: new
        .mockResolvedValueOnce({ id: 'existing' } as any); // ERC20: exists

      prismaService.cryptoTransaction.create.mockResolvedValue({} as any);
      walletsService.setSyncStatus.mockResolvedValue(undefined);

      await service.syncWallet(mockWalletId);

      // Only 1 create call from main sync, ERC20 skipped
      expect(prismaService.cryptoTransaction.create).toHaveBeenCalledTimes(1);
    });

    it('should handle ERC20 sync errors gracefully (non-fatal)', async () => {
      prismaService.wallet.findUnique.mockResolvedValue(mockWallet as any);
      covalentClient.isConfigured.mockReturnValue(true);
      covalentClient.getChainName.mockReturnValue('eth-mainnet');
      covalentClient.getTransactions.mockResolvedValue({
        transactions: [],
        hasMore: false,
      } as any);
      covalentClient.getERC20Transfers.mockRejectedValue(new Error('ERC20 API error'));
      walletsService.setSyncStatus.mockResolvedValue(undefined);

      const result = await service.syncWallet(mockWalletId);

      // Main sync should still succeed
      expect(result.success).toBe(true);
      expect(Logger.prototype.warn).toHaveBeenCalled();
    });
  });

  describe('syncAllWallets', () => {
    it('should sync multiple wallets sequentially', async () => {
      const wallets = [
        { id: 'wallet-1' },
        { id: 'wallet-2' },
        { id: 'wallet-3' },
      ];

      walletsService.getWalletsForSync.mockResolvedValue(wallets as any);

      prismaService.wallet.findUnique.mockResolvedValue(mockWallet as any);
      covalentClient.isConfigured.mockReturnValue(true);
      covalentClient.getChainName.mockReturnValue('eth-mainnet');
      covalentClient.getTransactions.mockResolvedValue({
        transactions: [],
        hasMore: false,
      } as any);
      covalentClient.getERC20Transfers.mockResolvedValue({ transfers: [] } as any);
      walletsService.setSyncStatus.mockResolvedValue(undefined);

      const results = await service.syncAllWallets(mockCompanyId);

      expect(results).toHaveLength(3);
      expect(walletsService.getWalletsForSync).toHaveBeenCalledWith(mockCompanyId);
    });
  });

  describe('getTransactionsNeedingReview', () => {
    it('should return transactions with NEEDS_REVIEW status', async () => {
      const mockTxNeedsReview = [
        {
          id: 'tx-1',
          status: 'NEEDS_REVIEW',
          wallet: {
            label: 'Main Wallet',
            address: '0x742d35...',
            chain: 'ethereum',
          },
        },
      ];

      prismaService.cryptoTransaction.findMany.mockResolvedValue(mockTxNeedsReview as any);

      const result = await service.getTransactionsNeedingReview(mockCompanyId);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('NEEDS_REVIEW');
      expect(prismaService.cryptoTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            wallet: { companyId: mockCompanyId },
            status: 'NEEDS_REVIEW',
          },
          take: 100,
        }),
      );
    });
  });

  describe('updateTransactionType', () => {
    it('should update transaction type with manual override', async () => {
      const mockTx = { id: 'tx-1', walletId: mockWalletId };

      prismaService.cryptoTransaction.findFirst.mockResolvedValue(mockTx as any);
      prismaService.cryptoTransaction.update.mockResolvedValue({} as any);

      await service.updateTransactionType(mockCompanyId, 'tx-1', 'SWAP' as CryptoTxType, 'Manual correction');

      expect(prismaService.cryptoTransaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-1' },
        data: {
          manualType: 'SWAP',
          manualNotes: 'Manual correction',
          status: 'COMPLETED',
        },
      });
    });

    it('should throw error if transaction not found', async () => {
      prismaService.cryptoTransaction.findFirst.mockResolvedValue(null);

      await expect(
        service.updateTransactionType(mockCompanyId, 'invalid-tx', 'SWAP' as CryptoTxType),
      ).rejects.toThrow('Transaction not found');
    });
  });

  describe('isSyncing', () => {
    it('should return true when sync is in progress', async () => {
      prismaService.wallet.findUnique.mockResolvedValue(mockWallet as any);
      covalentClient.isConfigured.mockReturnValue(true);
      covalentClient.getChainName.mockReturnValue('eth-mainnet');
      covalentClient.getTransactions.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve({ transactions: [], hasMore: false } as any),
              100,
            ),
          ),
      );
      covalentClient.getERC20Transfers.mockResolvedValue({ transfers: [] } as any);
      walletsService.setSyncStatus.mockResolvedValue(undefined);

      // Start sync (don't await)
      service.syncWallet(mockWalletId);

      // Check immediately
      expect(service.isSyncing(mockWalletId)).toBe(true);
    });

    it('should return false when no sync in progress', () => {
      expect(service.isSyncing(mockWalletId)).toBe(false);
    });
  });

  describe('Service Setup', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have all dependencies injected', () => {
      expect(prismaService).toBeDefined();
      expect(covalentClient).toBeDefined();
      expect(transactionParser).toBeDefined();
      expect(walletsService).toBeDefined();
    });
  });
});
