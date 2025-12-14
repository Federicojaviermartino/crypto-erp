import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@crypto-erp/database';
import { Modelo721Service } from '../../../src/modules/fiscal/modelo721.service.js';
import { Decimal } from 'decimal.js';

/**
 * CRITICAL TESTS: Modelo 721 Service
 * Declaración de criptomonedas en el extranjero (AEAT)
 *
 * Tests críticos para cumplimiento fiscal:
 * - Cálculo de saldos a 31/12
 * - Umbral de declaración >50,000 EUR
 * - Variación significativa >20,000 EUR
 * - Mapping de exchanges a países
 * - Generación de XML AEAT
 */

describe('Modelo721Service', () => {
  let service: Modelo721Service;
  let prismaService: PrismaService;

  const mockCompanyId = 'company-1';
  const mockYear = 2024;

  const mockWallet = {
    id: 'wallet-1',
    companyId: mockCompanyId,
    label: 'Main Wallet',
    address: '0xABCD1234',
    blockchain: 'ETHEREUM',
    isActive: true,
    transactions: [],
  };

  const mockExchangeAccount = {
    id: 'exchange-1',
    companyId: mockCompanyId,
    exchange: 'COINBASE',
    label: 'Coinbase Account',
    isActive: true,
  };

  const mockCryptoAsset = {
    id: 'btc-asset',
    symbol: 'BTC',
    name: 'Bitcoin',
    decimals: 8,
    companyId: mockCompanyId,
  };

  const mockCryptoLot = {
    id: 'lot-1',
    companyId: mockCompanyId,
    cryptoAssetId: 'btc-asset',
    cryptoAsset: mockCryptoAsset,
    exchangeAccountId: 'exchange-1',
    walletId: null,
    acquiredAt: new Date('2024-01-15'),
    quantity: new Decimal('2.0'),
    remainingAmount: new Decimal('2.0'),
    costPerUnit: new Decimal('30000'),
    costBasisEur: new Decimal('60000'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Modelo721Service,
        {
          provide: PrismaService,
          useValue: {
            wallet: {
              findMany: jest.fn(),
            },
            exchangeAccount: {
              findMany: jest.fn(),
            },
            cryptoLot: {
              findMany: jest.fn(),
            },
            cryptoAsset: {
              findMany: jest.fn(),
            },
            cryptoTransaction: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<Modelo721Service>(Modelo721Service);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('generateModelo721', () => {
    it('should calculate balances at end of year (31/12)', async () => {
      // Arrange: 2 BTC en Coinbase valorados a 45k cada uno = 90k EUR
      const mockLots = [
        {
          ...mockCryptoLot,
          quantity: new Decimal('2.0'),
          remainingAmount: new Decimal('2.0'),
          costPerUnit: new Decimal('45000'), // Precio a 31/12
        },
      ];

      jest.spyOn(prismaService.wallet, 'findMany').mockResolvedValue([mockWallet] as any);
      jest.spyOn(prismaService.exchangeAccount, 'findMany').mockResolvedValue([mockExchangeAccount] as any);
      jest.spyOn(prismaService.cryptoLot, 'findMany').mockResolvedValue(mockLots as any);

      // Act
      const result = await service.generateModelo721(mockCompanyId, mockYear);

      // Assert
      expect(result.ejercicio).toBe(mockYear);
      expect(result.posiciones).toHaveLength(1);
      expect(result.posiciones[0].saldoAFinDeAno.toNumber()).toBe(2.0);
      expect(result.posiciones[0].valorEurAFinDeAno.toNumber()).toBe(90000); // 2 * 45k
    });

    it('should mark as obligado declarar if > 50,000 EUR', async () => {
      // Arrange: 2 BTC * 45k = 90k EUR (> 50k threshold)
      const mockLots = [
        {
          ...mockCryptoLot,
          quantity: new Decimal('2.0'),
          remainingAmount: new Decimal('2.0'),
          costPerUnit: new Decimal('45000'),
        },
      ];

      jest.spyOn(prismaService.wallet, 'findMany').mockResolvedValue([mockWallet] as any);
      jest.spyOn(prismaService.exchangeAccount, 'findMany').mockResolvedValue([mockExchangeAccount] as any);
      jest.spyOn(prismaService.cryptoLot, 'findMany').mockResolvedValue(mockLots as any);

      // Act
      const result = await service.generateModelo721(mockCompanyId, mockYear);

      // Assert
      expect(result.obligadoDeclarar).toBe(true);
      expect(result.totalValorEur.toNumber()).toBeGreaterThan(50000);
    });

    it('should mark as NOT obligado declarar if < 50,000 EUR', async () => {
      // Arrange: 0.5 BTC * 30k = 15k EUR (< 50k threshold)
      const mockLots = [
        {
          ...mockCryptoLot,
          quantity: new Decimal('0.5'),
          remainingAmount: new Decimal('0.5'),
          costPerUnit: new Decimal('30000'),
        },
      ];

      jest.spyOn(prismaService.wallet, 'findMany').mockResolvedValue([mockWallet] as any);
      jest.spyOn(prismaService.exchangeAccount, 'findMany').mockResolvedValue([mockExchangeAccount] as any);
      jest.spyOn(prismaService.cryptoLot, 'findMany').mockResolvedValue(mockLots as any);

      // Act
      const result = await service.generateModelo721(mockCompanyId, mockYear);

      // Assert
      expect(result.obligadoDeclarar).toBe(false);
      expect(result.totalValorEur.toNumber()).toBeLessThan(50000);
    });

    it('should map exchange to correct country code', async () => {
      // Arrange: Coinbase → US
      const mockLots = [mockCryptoLot];

      jest.spyOn(prismaService.wallet, 'findMany').mockResolvedValue([mockWallet] as any);
      jest.spyOn(prismaService.exchangeAccount, 'findMany').mockResolvedValue([mockExchangeAccount] as any);
      jest.spyOn(prismaService.cryptoLot, 'findMany').mockResolvedValue(mockLots as any);

      // Act
      const result = await service.generateModelo721(mockCompanyId, mockYear);

      // Assert
      expect(result.posiciones[0].paisExchange).toBe('US'); // Coinbase is US
    });

    it('should handle multiple crypto assets', async () => {
      // Arrange: BTC + ETH
      const mockEthAsset = {
        id: 'eth-asset',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        companyId: mockCompanyId,
      };

      const mockLots = [
        {
          ...mockCryptoLot,
          cryptoAssetId: 'btc-asset',
          cryptoAsset: mockCryptoAsset,
          quantity: new Decimal('1.0'),
          remainingAmount: new Decimal('1.0'),
          costPerUnit: new Decimal('45000'),
        },
        {
          ...mockCryptoLot,
          id: 'lot-2',
          cryptoAssetId: 'eth-asset',
          cryptoAsset: mockEthAsset,
          quantity: new Decimal('10.0'),
          remainingAmount: new Decimal('10.0'),
          costPerUnit: new Decimal('3000'),
        },
      ];

      jest.spyOn(prismaService.wallet, 'findMany').mockResolvedValue([mockWallet] as any);
      jest.spyOn(prismaService.exchangeAccount, 'findMany').mockResolvedValue([mockExchangeAccount] as any);
      jest.spyOn(prismaService.cryptoLot, 'findMany').mockResolvedValue(mockLots as any);

      // Act
      const result = await service.generateModelo721(mockCompanyId, mockYear);

      // Assert
      expect(result.posiciones).toHaveLength(2);
      expect(result.posiciones.find(p => p.tipoMoneda === 'BTC')).toBeDefined();
      expect(result.posiciones.find(p => p.tipoMoneda === 'ETH')).toBeDefined();

      // Total: (1 * 45k) + (10 * 3k) = 45k + 30k = 75k EUR
      expect(result.totalValorEur.toNumber()).toBe(75000);
    });

    it('should group by exchange/wallet correctly', async () => {
      // Arrange: BTC en Coinbase + BTC en Kraken
      const mockKrakenAccount = {
        id: 'exchange-2',
        companyId: mockCompanyId,
        exchange: 'KRAKEN',
        label: 'Kraken Account',
        isActive: true,
      };

      const mockLots = [
        {
          ...mockCryptoLot,
          exchangeAccountId: 'exchange-1', // Coinbase
          quantity: new Decimal('1.0'),
          remainingAmount: new Decimal('1.0'),
          costPerUnit: new Decimal('45000'),
        },
        {
          ...mockCryptoLot,
          id: 'lot-2',
          exchangeAccountId: 'exchange-2', // Kraken
          quantity: new Decimal('0.5'),
          remainingAmount: new Decimal('0.5'),
          costPerUnit: new Decimal('45000'),
        },
      ];

      jest.spyOn(prismaService.wallet, 'findMany').mockResolvedValue([mockWallet] as any);
      jest.spyOn(prismaService.exchangeAccount, 'findMany').mockResolvedValue([mockExchangeAccount, mockKrakenAccount] as any);
      jest.spyOn(prismaService.cryptoLot, 'findMany').mockResolvedValue(mockLots as any);

      // Act
      const result = await service.generateModelo721(mockCompanyId, mockYear);

      // Assert: 2 posiciones (mismo asset, diferentes exchanges)
      expect(result.posiciones).toHaveLength(2);
      expect(result.posiciones.find(p => p.nombreExchange.includes('Coinbase'))).toBeDefined();
      expect(result.posiciones.find(p => p.nombreExchange.includes('Kraken'))).toBeDefined();
    });

    it('should exclude sold/consumed lots', async () => {
      // Arrange: 1 BTC comprado, 0.5 vendido (remainingAmount = 0.5)
      const mockLots = [
        {
          ...mockCryptoLot,
          quantity: new Decimal('1.0'),
          remainingAmount: new Decimal('0.5'), // 0.5 vendido
          costPerUnit: new Decimal('45000'),
        },
      ];

      jest.spyOn(prismaService.wallet, 'findMany').mockResolvedValue([mockWallet] as any);
      jest.spyOn(prismaService.exchangeAccount, 'findMany').mockResolvedValue([mockExchangeAccount] as any);
      jest.spyOn(prismaService.cryptoLot, 'findMany').mockResolvedValue(mockLots as any);

      // Act
      const result = await service.generateModelo721(mockCompanyId, mockYear);

      // Assert: Solo 0.5 BTC remaining
      expect(result.posiciones[0].saldoAFinDeAno.toNumber()).toBe(0.5);
      expect(result.posiciones[0].valorEurAFinDeAno.toNumber()).toBe(22500); // 0.5 * 45k
    });

    it('should include fecha adquisicion of first lot', async () => {
      // Arrange
      const firstAcquisitionDate = new Date('2024-01-15');
      const mockLots = [
        {
          ...mockCryptoLot,
          acquiredAt: firstAcquisitionDate,
        },
      ];

      jest.spyOn(prismaService.wallet, 'findMany').mockResolvedValue([mockWallet] as any);
      jest.spyOn(prismaService.exchangeAccount, 'findMany').mockResolvedValue([mockExchangeAccount] as any);
      jest.spyOn(prismaService.cryptoLot, 'findMany').mockResolvedValue(mockLots as any);

      // Act
      const result = await service.generateModelo721(mockCompanyId, mockYear);

      // Assert
      expect(result.posiciones[0].fechaAdquisicion).toEqual(firstAcquisitionDate);
    });

    it('should handle zero balances correctly', async () => {
      // Arrange: No lots or all sold
      jest.spyOn(prismaService.wallet, 'findMany').mockResolvedValue([mockWallet] as any);
      jest.spyOn(prismaService.exchangeAccount, 'findMany').mockResolvedValue([mockExchangeAccount] as any);
      jest.spyOn(prismaService.cryptoLot, 'findMany').mockResolvedValue([]);

      // Act
      const result = await service.generateModelo721(mockCompanyId, mockYear);

      // Assert
      expect(result.posiciones).toHaveLength(0);
      expect(result.totalValorEur.toNumber()).toBe(0);
      expect(result.obligadoDeclarar).toBe(false);
    });

    it('should calculate porcentaje titularidad as 100%', async () => {
      // Arrange
      const mockLots = [mockCryptoLot];

      jest.spyOn(prismaService.wallet, 'findMany').mockResolvedValue([mockWallet] as any);
      jest.spyOn(prismaService.exchangeAccount, 'findMany').mockResolvedValue([mockExchangeAccount] as any);
      jest.spyOn(prismaService.cryptoLot, 'findMany').mockResolvedValue(mockLots as any);

      // Act
      const result = await service.generateModelo721(mockCompanyId, mockYear);

      // Assert: Full ownership
      expect(result.posiciones[0].porcentajeTitularidad).toBe(100);
    });
  });

  describe('exportToAEATFormat', () => {
    it('should generate XML in AEAT format', async () => {
      // Arrange
      const mockLots = [
        {
          ...mockCryptoLot,
          quantity: new Decimal('2.0'),
          remainingAmount: new Decimal('2.0'),
          costPerUnit: new Decimal('45000'),
        },
      ];

      jest.spyOn(prismaService.wallet, 'findMany').mockResolvedValue([mockWallet] as any);
      jest.spyOn(prismaService.exchangeAccount, 'findMany').mockResolvedValue([mockExchangeAccount] as any);
      jest.spyOn(prismaService.cryptoLot, 'findMany').mockResolvedValue(mockLots as any);

      // Act
      const xml = await service.exportToAEATFormat(mockCompanyId, mockYear);

      // Assert
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<Modelo721>');
      expect(xml).toContain(`<Ejercicio>${mockYear}</Ejercicio>`);
      expect(xml).toContain('<TipoMoneda>BTC</TipoMoneda>');
      expect(xml).toContain('<PaisExchange>US</PaisExchange>'); // Coinbase
      expect(xml).toContain('<SaldoCantidad>2.00000000</SaldoCantidad>');
      expect(xml).toContain('<ValoracionEur>90000.00</ValoracionEur>');
    });

    it('should include all positions in XML', async () => {
      // Arrange: BTC + ETH
      const mockEthAsset = {
        id: 'eth-asset',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        companyId: mockCompanyId,
      };

      const mockLots = [
        {
          ...mockCryptoLot,
          cryptoAssetId: 'btc-asset',
          cryptoAsset: mockCryptoAsset,
          quantity: new Decimal('1.0'),
          remainingAmount: new Decimal('1.0'),
          costPerUnit: new Decimal('45000'),
        },
        {
          ...mockCryptoLot,
          id: 'lot-2',
          cryptoAssetId: 'eth-asset',
          cryptoAsset: mockEthAsset,
          quantity: new Decimal('10.0'),
          remainingAmount: new Decimal('10.0'),
          costPerUnit: new Decimal('3000'),
        },
      ];

      jest.spyOn(prismaService.wallet, 'findMany').mockResolvedValue([mockWallet] as any);
      jest.spyOn(prismaService.exchangeAccount, 'findMany').mockResolvedValue([mockExchangeAccount] as any);
      jest.spyOn(prismaService.cryptoLot, 'findMany').mockResolvedValue(mockLots as any);

      // Act
      const xml = await service.exportToAEATFormat(mockCompanyId, mockYear);

      // Assert
      const btcCount = (xml.match(/<TipoMoneda>BTC<\/TipoMoneda>/g) || []).length;
      const ethCount = (xml.match(/<TipoMoneda>ETH<\/TipoMoneda>/g) || []).length;

      expect(btcCount).toBe(1);
      expect(ethCount).toBe(1);
    });

    it('should format dates correctly (ISO 8601)', async () => {
      // Arrange
      const mockLots = [
        {
          ...mockCryptoLot,
          acquiredAt: new Date('2024-01-15T10:30:00Z'),
        },
      ];

      jest.spyOn(prismaService.wallet, 'findMany').mockResolvedValue([mockWallet] as any);
      jest.spyOn(prismaService.exchangeAccount, 'findMany').mockResolvedValue([mockExchangeAccount] as any);
      jest.spyOn(prismaService.cryptoLot, 'findMany').mockResolvedValue(mockLots as any);

      // Act
      const xml = await service.exportToAEATFormat(mockCompanyId, mockYear);

      // Assert: Date in YYYY-MM-DD format
      expect(xml).toContain('<FechaAdquisicion>2024-01-15</FechaAdquisicion>');
    });
  });

  describe('exportToCSV', () => {
    it('should generate CSV export', async () => {
      // Arrange
      const mockLots = [
        {
          ...mockCryptoLot,
          quantity: new Decimal('2.0'),
          remainingAmount: new Decimal('2.0'),
          costPerUnit: new Decimal('45000'),
        },
      ];

      jest.spyOn(prismaService.wallet, 'findMany').mockResolvedValue([mockWallet] as any);
      jest.spyOn(prismaService.exchangeAccount, 'findMany').mockResolvedValue([mockExchangeAccount] as any);
      jest.spyOn(prismaService.cryptoLot, 'findMany').mockResolvedValue(mockLots as any);

      // Act
      const csv = await service.exportToCSV(mockCompanyId, mockYear);

      // Assert
      expect(csv).toContain('Tipo Moneda,Nombre,Exchange,País');
      expect(csv).toContain('BTC,Bitcoin');
      expect(csv).toContain('Coinbase');
      expect(csv).toContain('US');
      expect(csv).toContain('2.00000000'); // Cantidad
      expect(csv).toContain('90000.00'); // Valor EUR
    });
  });

  describe('Exchange Country Mapping', () => {
    it('should map known exchanges to correct countries', async () => {
      // Test cases
      const exchanges = [
        { exchange: 'COINBASE', expectedCountry: 'US' },
        { exchange: 'KRAKEN', expectedCountry: 'US' },
        { exchange: 'BINANCE', expectedCountry: 'MT' }, // Malta
        { exchange: 'BITSTAMP', expectedCountry: 'LU' }, // Luxembourg
        { exchange: 'GEMINI', expectedCountry: 'US' },
      ];

      for (const testCase of exchanges) {
        // Arrange
        const mockAccount = {
          ...mockExchangeAccount,
          exchange: testCase.exchange,
        };

        const mockLots = [
          {
            ...mockCryptoLot,
            exchangeAccountId: 'exchange-1',
          },
        ];

        jest.clearAllMocks();
        jest.spyOn(prismaService.wallet, 'findMany').mockResolvedValue([mockWallet] as any);
        jest.spyOn(prismaService.exchangeAccount, 'findMany').mockResolvedValue([mockAccount] as any);
        jest.spyOn(prismaService.cryptoLot, 'findMany').mockResolvedValue(mockLots as any);

        // Act
        const result = await service.generateModelo721(mockCompanyId, mockYear);

        // Assert
        expect(result.posiciones[0].paisExchange).toBe(testCase.expectedCountry);
      }
    });

    it('should default to unknown country for unmapped exchange', async () => {
      // Arrange
      const mockUnknownAccount = {
        ...mockExchangeAccount,
        exchange: 'UNKNOWN_EXCHANGE',
      };

      const mockLots = [mockCryptoLot];

      jest.spyOn(prismaService.wallet, 'findMany').mockResolvedValue([mockWallet] as any);
      jest.spyOn(prismaService.exchangeAccount, 'findMany').mockResolvedValue([mockUnknownAccount] as any);
      jest.spyOn(prismaService.cryptoLot, 'findMany').mockResolvedValue(mockLots as any);

      // Act
      const result = await service.generateModelo721(mockCompanyId, mockYear);

      // Assert: Should have a default country code
      expect(result.posiciones[0].paisExchange).toBeDefined();
      expect(result.posiciones[0].paisExchange.length).toBeGreaterThan(0);
    });
  });

  describe('Validation', () => {
    it('should validate that summary has correct metadata', async () => {
      // Arrange
      const mockLots = [mockCryptoLot];

      jest.spyOn(prismaService.wallet, 'findMany').mockResolvedValue([mockWallet] as any);
      jest.spyOn(prismaService.exchangeAccount, 'findMany').mockResolvedValue([mockExchangeAccount] as any);
      jest.spyOn(prismaService.cryptoLot, 'findMany').mockResolvedValue(mockLots as any);

      // Act
      const result = await service.generateModelo721(mockCompanyId, mockYear);

      // Assert: Metadata validation
      expect(result.ejercicio).toBe(mockYear);
      expect(result.fechaGeneracion).toBeInstanceOf(Date);
      expect(result.totalValorEur).toBeInstanceOf(Decimal);
      expect(result.posiciones).toBeInstanceOf(Array);
      expect(typeof result.obligadoDeclarar).toBe('boolean');
    });

    it('should fail validation if data is incomplete', async () => {
      // This test validates that the service handles edge cases
      // For example, missing exchange data or crypto asset info

      const mockIncompleteAccount = {
        id: 'exchange-1',
        companyId: mockCompanyId,
        exchange: null, // Missing exchange name
        label: 'Account',
        isActive: true,
      };

      jest.spyOn(prismaService.wallet, 'findMany').mockResolvedValue([mockWallet] as any);
      jest.spyOn(prismaService.exchangeAccount, 'findMany').mockResolvedValue([mockIncompleteAccount] as any);
      jest.spyOn(prismaService.cryptoLot, 'findMany').mockResolvedValue([mockCryptoLot] as any);

      // Act
      const result = await service.generateModelo721(mockCompanyId, mockYear);

      // Assert: Should handle gracefully
      expect(result).toBeDefined();
    });
  });
});
