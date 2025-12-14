import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@crypto-erp/database';
import { JournalEntryProcessor } from '../../src/processors/journal-entry.processor.js';
import { Job } from 'bullmq';
import { Decimal } from 'decimal.js';

/**
 * CRITICAL TESTS: Journal Entry Processor
 * Procesamiento automático de asientos contables desde crypto transactions
 *
 * Tests críticos para contabilidad:
 * - Generación automática de asientos por tipo de transacción
 * - Cálculo de cost basis FIFO
 * - Ganancias y pérdidas patrimoniales
 * - Cuadre de debe/haber
 * - PGC español (cuentas 570, 768, 668, etc.)
 */

describe('JournalEntryProcessor', () => {
  let processor: JournalEntryProcessor;
  let prismaService: PrismaService;

  const mockCompanyId = 'company-1';
  const mockWalletId = 'wallet-1';
  const mockFiscalYear = {
    id: 'fiscal-year-1',
    companyId: mockCompanyId,
    year: 2024,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    isClosed: false,
  };

  const mockWallet = {
    id: mockWalletId,
    label: 'Main Wallet',
    companyId: mockCompanyId,
  };

  const mockAccount = {
    id: 'account-1',
    companyId: mockCompanyId,
    code: '5700',
    name: 'Crypto Wallet',
    type: 'ASSET',
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JournalEntryProcessor,
        {
          provide: PrismaService,
          useValue: {
            cryptoTransaction: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            journalEntry: {
              findFirst: jest.fn(),
              create: jest.fn(),
            },
            fiscalYear: {
              findFirst: jest.fn(),
            },
            account: {
              findFirst: jest.fn(),
              create: jest.fn(),
            },
            cryptoAsset: {
              findFirst: jest.fn(),
            },
            cryptoLot: {
              findMany: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    processor = module.get<JournalEntryProcessor>(JournalEntryProcessor);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('TRANSFER_IN - Incoming Crypto', () => {
    it('should create journal entry for crypto purchase', async () => {
      // Arrange: Compra de 1 BTC por 30,000 EUR
      const transaction = {
        id: 'tx-1',
        type: 'TRANSFER_IN',
        txHash: '0xABCD1234567890',
        walletId: mockWalletId,
        wallet: mockWallet,
        assetIn: 'BTC',
        amountIn: new Decimal('1.0'),
        priceInEur: new Decimal('30000'),
        assetOut: null,
        amountOut: new Decimal('0'),
        priceOutEur: new Decimal('0'),
        feeAsset: 'EUR',
        feeAmount: new Decimal('0.01'),
        feeEur: new Decimal('50'),
        blockTimestamp: new Date('2024-06-15'),
        status: 'PENDING',
      };

      jest.spyOn(prismaService.cryptoTransaction, 'findUnique').mockResolvedValue(transaction as any);
      jest.spyOn(prismaService.journalEntry, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.fiscalYear, 'findFirst').mockResolvedValue(mockFiscalYear as any);
      jest.spyOn(prismaService.account, 'findFirst')
        .mockResolvedValueOnce(mockAccount as any) // Wallet account
        .mockResolvedValueOnce({ ...mockAccount, code: '572', name: 'Bank' } as any) // Bank
        .mockResolvedValueOnce({ ...mockAccount, code: '662', name: 'Fees' } as any); // Fees

      const createSpy = jest.spyOn(prismaService.journalEntry, 'create').mockResolvedValue({
        id: 'je-1',
        number: 1,
      } as any);

      const job = {
        data: {
          transactionId: 'tx-1',
          companyId: mockCompanyId,
          autoPost: false,
        },
      } as Job;

      // Act
      const result = await processor.process(job);

      // Assert
      expect(result.success).toBe(true);
      expect(createSpy).toHaveBeenCalled();

      const jeData = createSpy.mock.calls[0][0].data;
      expect(jeData.description).toContain('Entrada');
      expect(jeData.description).toContain('1.00000000');
      expect(jeData.description).toContain('BTC');

      // Verify lines: Debe = Haber
      const lines = jeData.lines.create;
      const totalDebit = lines.reduce((sum: number, l: any) => sum + l.debit.toNumber(), 0);
      const totalCredit = lines.reduce((sum: number, l: any) => sum + l.credit.toNumber(), 0);

      expect(totalDebit).toBeCloseTo(totalCredit, 2); // Must balance

      // Debe: Wallet (30,000 EUR) + Fees (50 EUR) = 30,050
      // Haber: Bank (30,050 EUR)
      expect(totalDebit).toBeCloseTo(30050, 2);
    });
  });

  describe('TRANSFER_OUT - Outgoing Crypto', () => {
    it('should create journal entry with capital gain', async () => {
      // Arrange: Venta de 1 BTC comprado a 30k, vendido a 45k (ganancia 15k)
      const transaction = {
        id: 'tx-2',
        type: 'TRANSFER_OUT',
        txHash: '0xDEF456789',
        walletId: mockWalletId,
        wallet: mockWallet,
        assetIn: null,
        amountIn: new Decimal('0'),
        priceInEur: new Decimal('0'),
        assetOut: 'BTC',
        amountOut: new Decimal('1.0'),
        priceOutEur: new Decimal('45000'), // Precio de venta
        feeAsset: 'EUR',
        feeAmount: new Decimal('0.01'),
        feeEur: new Decimal('100'),
        blockTimestamp: new Date('2024-12-15'),
        status: 'PENDING',
      };

      // Mock FIFO lots: 1 BTC comprado a 30k
      const mockLots = [
        {
          id: 'lot-1',
          cryptoAssetId: 'btc-asset',
          companyId: mockCompanyId,
          acquiredAt: new Date('2024-01-15'),
          quantity: new Decimal('1.0'),
          remainingAmount: new Decimal('1.0'),
          costPerUnit: new Decimal('30000'),
          costBasisEur: new Decimal('30000'),
        },
      ];

      jest.spyOn(prismaService.cryptoTransaction, 'findUnique').mockResolvedValue(transaction as any);
      jest.spyOn(prismaService.journalEntry, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.fiscalYear, 'findFirst').mockResolvedValue(mockFiscalYear as any);
      jest.spyOn(prismaService.cryptoAsset, 'findFirst').mockResolvedValue({ id: 'btc-asset', symbol: 'BTC' } as any);
      jest.spyOn(prismaService.cryptoLot, 'findMany').mockResolvedValue(mockLots as any);
      jest.spyOn(prismaService.cryptoLot, 'update').mockResolvedValue(mockLots[0] as any);

      jest.spyOn(prismaService.account, 'findFirst')
        .mockResolvedValueOnce(mockAccount as any) // Wallet
        .mockResolvedValueOnce({ ...mockAccount, code: '572', name: 'Bank' } as any) // Bank
        .mockResolvedValueOnce({ ...mockAccount, code: '768', name: 'Exchange Gain' } as any) // Gain
        .mockResolvedValueOnce({ ...mockAccount, code: '662', name: 'Fees' } as any); // Fees

      const createSpy = jest.spyOn(prismaService.journalEntry, 'create').mockResolvedValue({
        id: 'je-2',
        number: 2,
      } as any);

      const job = {
        data: {
          transactionId: 'tx-2',
          companyId: mockCompanyId,
        },
      } as Job;

      // Act
      const result = await processor.process(job);

      // Assert
      expect(result.success).toBe(true);

      const jeData = createSpy.mock.calls[0][0].data;
      const lines = jeData.lines.create;

      // Verificar ganancia patrimonial
      const gainLine = lines.find((l: any) => l.description.includes('Ganancia'));
      expect(gainLine).toBeDefined();
      expect(gainLine.credit.toNumber()).toBeCloseTo(15000, 2); // 45k - 30k = 15k ganancia

      // Debe = Haber
      const totalDebit = lines.reduce((sum: number, l: any) => sum + l.debit.toNumber(), 0);
      const totalCredit = lines.reduce((sum: number, l: any) => sum + l.credit.toNumber(), 0);
      expect(totalDebit).toBeCloseTo(totalCredit, 2);
    });

    it('should create journal entry with capital loss', async () => {
      // Arrange: Venta de 1 BTC comprado a 50k, vendido a 35k (pérdida 15k)
      const transaction = {
        id: 'tx-3',
        type: 'TRANSFER_OUT',
        txHash: '0xLOSS123',
        walletId: mockWalletId,
        wallet: mockWallet,
        assetIn: null,
        amountIn: new Decimal('0'),
        priceInEur: new Decimal('0'),
        assetOut: 'BTC',
        amountOut: new Decimal('1.0'),
        priceOutEur: new Decimal('35000'),
        feeAsset: 'EUR',
        feeAmount: new Decimal('0'),
        feeEur: new Decimal('0'),
        blockTimestamp: new Date('2024-12-15'),
        status: 'PENDING',
      };

      // Mock FIFO lots: 1 BTC comprado a 50k
      const mockLots = [
        {
          id: 'lot-2',
          cryptoAssetId: 'btc-asset',
          companyId: mockCompanyId,
          acquiredAt: new Date('2024-01-15'),
          quantity: new Decimal('1.0'),
          remainingAmount: new Decimal('1.0'),
          costPerUnit: new Decimal('50000'),
          costBasisEur: new Decimal('50000'),
        },
      ];

      jest.spyOn(prismaService.cryptoTransaction, 'findUnique').mockResolvedValue(transaction as any);
      jest.spyOn(prismaService.journalEntry, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.fiscalYear, 'findFirst').mockResolvedValue(mockFiscalYear as any);
      jest.spyOn(prismaService.cryptoAsset, 'findFirst').mockResolvedValue({ id: 'btc-asset', symbol: 'BTC' } as any);
      jest.spyOn(prismaService.cryptoLot, 'findMany').mockResolvedValue(mockLots as any);
      jest.spyOn(prismaService.cryptoLot, 'update').mockResolvedValue(mockLots[0] as any);

      jest.spyOn(prismaService.account, 'findFirst')
        .mockResolvedValueOnce(mockAccount as any) // Wallet
        .mockResolvedValueOnce({ ...mockAccount, code: '572', name: 'Bank' } as any) // Bank
        .mockResolvedValueOnce({ ...mockAccount, code: '668', name: 'Exchange Loss' } as any); // Loss

      const createSpy = jest.spyOn(prismaService.journalEntry, 'create').mockResolvedValue({
        id: 'je-3',
        number: 3,
      } as any);

      const job = {
        data: {
          transactionId: 'tx-3',
          companyId: mockCompanyId,
        },
      } as Job;

      // Act
      const result = await processor.process(job);

      // Assert
      expect(result.success).toBe(true);

      const jeData = createSpy.mock.calls[0][0].data;
      const lines = jeData.lines.create;

      // Verificar pérdida patrimonial
      const lossLine = lines.find((l: any) => l.description.includes('Pérdida'));
      expect(lossLine).toBeDefined();
      expect(lossLine.debit.toNumber()).toBeCloseTo(15000, 2); // 50k - 35k = 15k pérdida

      // Debe = Haber
      const totalDebit = lines.reduce((sum: number, l: any) => sum + l.debit.toNumber(), 0);
      const totalCredit = lines.reduce((sum: number, l: any) => sum + l.credit.toNumber(), 0);
      expect(totalDebit).toBeCloseTo(totalCredit, 2);
    });
  });

  describe('CLAIM_REWARD - Staking Income', () => {
    it('should create journal entry for staking rewards', async () => {
      // Arrange: Recompensa de 0.5 ETH valorada en 1,000 EUR
      const transaction = {
        id: 'tx-4',
        type: 'CLAIM_REWARD',
        txHash: '0xREWARD123',
        walletId: mockWalletId,
        wallet: mockWallet,
        assetIn: 'ETH',
        amountIn: new Decimal('0.5'),
        priceInEur: new Decimal('2000'),
        assetOut: null,
        amountOut: new Decimal('0'),
        priceOutEur: new Decimal('0'),
        feeAsset: null,
        feeAmount: new Decimal('0'),
        feeEur: new Decimal('0'),
        blockTimestamp: new Date('2024-06-15'),
        status: 'PENDING',
      };

      jest.spyOn(prismaService.cryptoTransaction, 'findUnique').mockResolvedValue(transaction as any);
      jest.spyOn(prismaService.journalEntry, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.fiscalYear, 'findFirst').mockResolvedValue(mockFiscalYear as any);

      jest.spyOn(prismaService.account, 'findFirst')
        .mockResolvedValueOnce(mockAccount as any) // Wallet
        .mockResolvedValueOnce({ ...mockAccount, code: '769', name: 'Other Financial Income' } as any); // Income

      const createSpy = jest.spyOn(prismaService.journalEntry, 'create').mockResolvedValue({
        id: 'je-4',
        number: 4,
      } as any);

      const job = {
        data: {
          transactionId: 'tx-4',
          companyId: mockCompanyId,
        },
      } as Job;

      // Act
      const result = await processor.process(job);

      // Assert
      expect(result.success).toBe(true);

      const jeData = createSpy.mock.calls[0][0].data;
      expect(jeData.description).toContain('Recompensa staking');

      const lines = jeData.lines.create;

      // Debe: Wallet 1,000 EUR
      // Haber: Ingreso financiero 1,000 EUR
      const totalDebit = lines.reduce((sum: number, l: any) => sum + l.debit.toNumber(), 0);
      const totalCredit = lines.reduce((sum: number, l: any) => sum + l.credit.toNumber(), 0);

      expect(totalDebit).toBeCloseTo(1000, 2); // 0.5 * 2000
      expect(totalCredit).toBeCloseTo(1000, 2);

      // Verificar ingreso financiero (cuenta 769)
      const incomeLine = lines.find((l: any) => l.description.includes('Ingreso financiero'));
      expect(incomeLine).toBeDefined();
      expect(incomeLine.credit.toNumber()).toBeCloseTo(1000, 2);
    });
  });

  describe('SWAP - Exchange Crypto', () => {
    it('should create journal entry for crypto swap', async () => {
      // Arrange: Swap 1 BTC → 15 ETH
      const transaction = {
        id: 'tx-5',
        type: 'SWAP',
        txHash: '0xSWAP123',
        walletId: mockWalletId,
        wallet: mockWallet,
        assetIn: 'ETH',
        amountIn: new Decimal('15'),
        priceInEur: new Decimal('2000'), // 15 * 2000 = 30,000 EUR
        assetOut: 'BTC',
        amountOut: new Decimal('1'),
        priceOutEur: new Decimal('29500'), // 1 * 29,500 = 29,500 EUR
        feeAsset: null,
        feeAmount: new Decimal('0'),
        feeEur: new Decimal('0'),
        blockTimestamp: new Date('2024-06-15'),
        status: 'PENDING',
      };

      jest.spyOn(prismaService.cryptoTransaction, 'findUnique').mockResolvedValue(transaction as any);
      jest.spyOn(prismaService.journalEntry, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.fiscalYear, 'findFirst').mockResolvedValue(mockFiscalYear as any);

      jest.spyOn(prismaService.account, 'findFirst')
        .mockResolvedValueOnce(mockAccount as any) // Wallet (debit)
        .mockResolvedValueOnce(mockAccount as any) // Wallet (credit)
        .mockResolvedValueOnce({ ...mockAccount, code: '768', name: 'Exchange Gain' } as any); // Gain

      const createSpy = jest.spyOn(prismaService.journalEntry, 'create').mockResolvedValue({
        id: 'je-5',
        number: 5,
      } as any);

      const job = {
        data: {
          transactionId: 'tx-5',
          companyId: mockCompanyId,
        },
      } as Job;

      // Act
      const result = await processor.process(job);

      // Assert
      expect(result.success).toBe(true);

      const jeData = createSpy.mock.calls[0][0].data;
      expect(jeData.description).toContain('Swap');

      const lines = jeData.lines.create;

      // Debe = Haber
      const totalDebit = lines.reduce((sum: number, l: any) => sum + l.debit.toNumber(), 0);
      const totalCredit = lines.reduce((sum: number, l: any) => sum + l.credit.toNumber(), 0);
      expect(totalDebit).toBeCloseTo(totalCredit, 2);

      // Debe: ETH recibido (30,000) + Ganancia swap (500)
      // Haber: BTC entregado (29,500) + Ganancia (500)
      expect(totalDebit).toBeCloseTo(30500, 2);
    });
  });

  describe('FIFO Cost Basis Calculation', () => {
    it('should consume lots in FIFO order', async () => {
      // Arrange: Venta de 1.5 BTC con múltiples lotes
      const transaction = {
        id: 'tx-6',
        type: 'TRANSFER_OUT',
        txHash: '0xFIFO123',
        walletId: mockWalletId,
        wallet: mockWallet,
        assetIn: null,
        amountIn: new Decimal('0'),
        priceInEur: new Decimal('0'),
        assetOut: 'BTC',
        amountOut: new Decimal('1.5'),
        priceOutEur: new Decimal('40000'),
        feeAsset: null,
        feeAmount: new Decimal('0'),
        feeEur: new Decimal('0'),
        blockTimestamp: new Date('2024-12-15'),
        status: 'PENDING',
      };

      // Mock FIFO lots: 3 compras diferentes
      const mockLots = [
        {
          id: 'lot-1',
          cryptoAssetId: 'btc-asset',
          companyId: mockCompanyId,
          acquiredAt: new Date('2024-01-01'), // Más antiguo
          remainingAmount: new Decimal('0.5'),
          costPerUnit: new Decimal('30000'),
        },
        {
          id: 'lot-2',
          cryptoAssetId: 'btc-asset',
          companyId: mockCompanyId,
          acquiredAt: new Date('2024-02-01'),
          remainingAmount: new Decimal('0.5'),
          costPerUnit: new Decimal('35000'),
        },
        {
          id: 'lot-3',
          cryptoAssetId: 'btc-asset',
          companyId: mockCompanyId,
          acquiredAt: new Date('2024-03-01'), // Más reciente
          remainingAmount: new Decimal('1.0'),
          costPerUnit: new Decimal('38000'),
        },
      ];

      jest.spyOn(prismaService.cryptoTransaction, 'findUnique').mockResolvedValue(transaction as any);
      jest.spyOn(prismaService.journalEntry, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.fiscalYear, 'findFirst').mockResolvedValue(mockFiscalYear as any);
      jest.spyOn(prismaService.cryptoAsset, 'findFirst').mockResolvedValue({ id: 'btc-asset', symbol: 'BTC' } as any);
      jest.spyOn(prismaService.cryptoLot, 'findMany').mockResolvedValue(mockLots as any);

      const updateSpy = jest.spyOn(prismaService.cryptoLot, 'update').mockResolvedValue({} as any);

      jest.spyOn(prismaService.account, 'findFirst')
        .mockResolvedValue(mockAccount as any);

      jest.spyOn(prismaService.journalEntry, 'create').mockResolvedValue({ id: 'je-6' } as any);

      const job = {
        data: {
          transactionId: 'tx-6',
          companyId: mockCompanyId,
        },
      } as Job;

      // Act
      await processor.process(job);

      // Assert: Verificar que los lotes se consumieron en orden FIFO
      expect(updateSpy).toHaveBeenCalledTimes(3);

      // lot-1: consumo completo (0.5 BTC)
      expect(updateSpy).toHaveBeenNthCalledWith(1, {
        where: { id: 'lot-1' },
        data: { remainingAmount: new Decimal('0') },
      });

      // lot-2: consumo completo (0.5 BTC)
      expect(updateSpy).toHaveBeenNthCalledWith(2, {
        where: { id: 'lot-2' },
        data: { remainingAmount: new Decimal('0') },
      });

      // lot-3: consumo parcial (0.5 de 1.0 BTC)
      expect(updateSpy).toHaveBeenNthCalledWith(3, {
        where: { id: 'lot-3' },
        data: { remainingAmount: new Decimal('0.5') },
      });

      // Cost basis total: (0.5 * 30k) + (0.5 * 35k) + (0.5 * 38k) = 51,500 EUR
    });
  });

  describe('Error Handling', () => {
    it('should fail if transaction not found', async () => {
      // Arrange
      jest.spyOn(prismaService.cryptoTransaction, 'findUnique').mockResolvedValue(null);

      const job = {
        data: {
          transactionId: 'non-existent',
          companyId: mockCompanyId,
        },
      } as Job;

      // Act & Assert
      await expect(processor.process(job)).rejects.toThrow('Transaction non-existent not found');
    });

    it('should fail if no fiscal year found', async () => {
      // Arrange
      const transaction = {
        id: 'tx-7',
        type: 'TRANSFER_IN',
        txHash: '0xNOFY',
        walletId: mockWalletId,
        wallet: mockWallet,
        blockTimestamp: new Date('2030-01-01'), // Future date
        status: 'PENDING',
      };

      jest.spyOn(prismaService.cryptoTransaction, 'findUnique').mockResolvedValue(transaction as any);
      jest.spyOn(prismaService.journalEntry, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.fiscalYear, 'findFirst').mockResolvedValue(null); // No fiscal year

      const job = {
        data: {
          transactionId: 'tx-7',
          companyId: mockCompanyId,
        },
      } as Job;

      // Act & Assert
      await expect(processor.process(job)).rejects.toThrow('No open fiscal year found');
    });

    it('should skip if journal entry already exists', async () => {
      // Arrange
      const transaction = {
        id: 'tx-8',
        type: 'TRANSFER_IN',
        txHash: '0xDUPLICATE',
        walletId: mockWalletId,
        wallet: mockWallet,
        blockTimestamp: new Date('2024-06-15'),
        status: 'PENDING',
      };

      jest.spyOn(prismaService.cryptoTransaction, 'findUnique').mockResolvedValue(transaction as any);
      jest.spyOn(prismaService.journalEntry, 'findFirst').mockResolvedValue({ id: 'existing-je' } as any);

      const createSpy = jest.spyOn(prismaService.journalEntry, 'create');

      const job = {
        data: {
          transactionId: 'tx-8',
          companyId: mockCompanyId,
        },
      } as Job;

      // Act
      const result = await processor.process(job);

      // Assert
      expect(result.success).toBe(true);
      expect(result.journalEntryId).toBe('existing-je');
      expect(createSpy).not.toHaveBeenCalled(); // No crea duplicado
    });
  });

  describe('Balance Verification', () => {
    it('should always balance debits and credits', async () => {
      // Test con múltiples tipos de transacciones
      const testCases = [
        {
          type: 'TRANSFER_IN',
          assetIn: 'BTC',
          amountIn: new Decimal('1'),
          priceInEur: new Decimal('30000'),
          assetOut: null,
          amountOut: new Decimal('0'),
          priceOutEur: new Decimal('0'),
          feeEur: new Decimal('50'),
        },
        {
          type: 'CLAIM_REWARD',
          assetIn: 'ETH',
          amountIn: new Decimal('0.5'),
          priceInEur: new Decimal('2000'),
          assetOut: null,
          amountOut: new Decimal('0'),
          priceOutEur: new Decimal('0'),
          feeEur: new Decimal('0'),
        },
      ];

      for (const testCase of testCases) {
        const transaction = {
          id: `tx-balance-${testCase.type}`,
          txHash: `0x${testCase.type}`,
          walletId: mockWalletId,
          wallet: mockWallet,
          blockTimestamp: new Date('2024-06-15'),
          status: 'PENDING',
          ...testCase,
        };

        jest.clearAllMocks();
        jest.spyOn(prismaService.cryptoTransaction, 'findUnique').mockResolvedValue(transaction as any);
        jest.spyOn(prismaService.journalEntry, 'findFirst').mockResolvedValue(null);
        jest.spyOn(prismaService.fiscalYear, 'findFirst').mockResolvedValue(mockFiscalYear as any);
        jest.spyOn(prismaService.account, 'findFirst').mockResolvedValue(mockAccount as any);

        const createSpy = jest.spyOn(prismaService.journalEntry, 'create').mockResolvedValue({ id: 'je' } as any);

        const job = { data: { transactionId: transaction.id, companyId: mockCompanyId } } as Job;

        // Act
        await processor.process(job);

        // Assert
        const jeData = createSpy.mock.calls[0][0].data;
        const lines = jeData.lines.create;

        const totalDebit = lines.reduce((sum: number, l: any) => sum + l.debit.toNumber(), 0);
        const totalCredit = lines.reduce((sum: number, l: any) => sum + l.credit.toNumber(), 0);

        expect(totalDebit).toBeCloseTo(totalCredit, 2);
      }
    });
  });
});
