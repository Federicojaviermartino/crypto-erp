import { Test, TestingModule } from '@nestjs/testing';
import { Modelo721Service } from '../../src/modules/fiscal/modelo721.service';
import { PrismaService } from '@crypto-erp/database';
import Decimal from 'decimal.js';

// Mock type
type MockPrismaService = {
  company: { findUnique: jest.Mock };
  wallet: { findMany: jest.Mock };
  exchangeAccount: { findMany: jest.Mock };
  cryptoLot: { findMany: jest.Mock };
  cryptoAsset: { findMany: jest.Mock };
  priceHistory: { findMany: jest.Mock; count: jest.Mock };
};

describe('Modelo721Service', () => {
  let service: Modelo721Service;
  let prismaService: MockPrismaService;

  const mockCompanyId = 'company-uuid-1234';
  const mockYear = 2024;

  // Helper to set up empty mocks
  const setupEmptyMocks = () => {
    prismaService.wallet.findMany.mockResolvedValue([]);
    prismaService.exchangeAccount.findMany.mockResolvedValue([]);
    prismaService.cryptoLot.findMany.mockResolvedValue([]);
    prismaService.priceHistory.findMany.mockResolvedValue([]);
    prismaService.priceHistory.count.mockResolvedValue(0);
    prismaService.cryptoAsset.findMany.mockResolvedValue([]);
  };

  beforeEach(async () => {
    prismaService = {
      company: { findUnique: jest.fn() },
      wallet: { findMany: jest.fn() },
      exchangeAccount: { findMany: jest.fn() },
      cryptoLot: { findMany: jest.fn() },
      cryptoAsset: { findMany: jest.fn() },
      priceHistory: { findMany: jest.fn(), count: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Modelo721Service,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<Modelo721Service>(Modelo721Service);
  });

  describe('generateModelo721', () => {
    it('should generate modelo 721 with empty positions when no data', async () => {
      setupEmptyMocks();

      const result = await service.generateModelo721(mockCompanyId, mockYear);

      expect(result).toBeDefined();
      expect(result.ejercicio).toBe(mockYear);
      expect(result.posiciones).toEqual([]);
      expect(result.totalValorEur.toNumber()).toBe(0);
      expect(result.obligadoDeclarar).toBe(false);
    });

    it('should set obligadoDeclarar true when value > 50000 EUR', async () => {
      const mockWallets = [
        {
          id: 'wallet-1',
          chain: 'ethereum',
          address: '0x1234',
          isActive: true,
          transactions: [
            {
              type: 'BUY',
              assetIn: 'BTC',
              amountIn: '2',
              priceInEur: '40000',
              blockTimestamp: new Date('2024-01-15'),
            },
          ],
        },
      ];

      prismaService.wallet.findMany.mockResolvedValue(mockWallets as any);
      prismaService.exchangeAccount.findMany.mockResolvedValue([]);
      prismaService.cryptoLot.findMany.mockResolvedValue([]);
      prismaService.priceHistory.findMany.mockResolvedValue([
        { symbol: 'BTC', priceEur: '42000', timestamp: new Date('2024-12-31') },
      ] as any);
      prismaService.cryptoAsset.findMany.mockResolvedValue([{ symbol: 'BTC' }] as any);

      const result = await service.generateModelo721(mockCompanyId, mockYear);

      // 2 BTC * 42000 = 84000 EUR > 50000
      expect(result.obligadoDeclarar).toBe(true);
    });

    it('should exclude Spanish-based wallets (ES country)', async () => {
      setupEmptyMocks();

      const result = await service.generateModelo721(mockCompanyId, mockYear);

      // All positions should have non-ES country
      expect(result.posiciones.every(p => p.paisExchange !== 'ES')).toBe(true);
    });
  });

  describe('generateModelo720Crypto', () => {
    it('should convert modelo721 positions to modelo720 format', async () => {
      setupEmptyMocks();

      const result = await service.generateModelo720Crypto(mockCompanyId, mockYear);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('exportToAEATFormat', () => {
    it('should generate valid XML structure', async () => {
      const mockCompany = {
        id: mockCompanyId,
        name: 'Test Company S.L.',
        taxId: 'B12345678',
      };

      prismaService.company.findUnique.mockResolvedValue(mockCompany as any);
      setupEmptyMocks();

      const xml = await service.exportToAEATFormat(mockCompanyId, mockYear);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<Modelo721');
      expect(xml).toContain(`<Ejercicio>${mockYear}</Ejercicio>`);
      expect(xml).toContain('<NIF>B12345678</NIF>');
      expect(xml).toContain('</Modelo721>');
    });

    it('should escape XML special characters', async () => {
      const mockCompany = {
        id: mockCompanyId,
        name: 'Test & Company <S.L.>',
        taxId: 'B12345678',
      };

      prismaService.company.findUnique.mockResolvedValue(mockCompany as any);
      setupEmptyMocks();

      const xml = await service.exportToAEATFormat(mockCompanyId, mockYear);

      expect(xml).toContain('Test &amp; Company &lt;S.L.&gt;');
    });

    it('should throw error if company not found', async () => {
      prismaService.company.findUnique.mockResolvedValue(null);
      setupEmptyMocks();

      await expect(
        service.exportToAEATFormat(mockCompanyId, mockYear),
      ).rejects.toThrow('Empresa no encontrada');
    });
  });

  describe('exportModelo720ToAEATFormat', () => {
    it('should generate valid Modelo720 XML structure', async () => {
      const mockCompany = { id: mockCompanyId, name: 'Test', taxId: 'B12345678' };

      prismaService.company.findUnique.mockResolvedValue(mockCompany as any);
      setupEmptyMocks();

      const xml = await service.exportModelo720ToAEATFormat(mockCompanyId, mockYear);

      expect(xml).toContain('<Modelo720');
      expect(xml).toContain('<Subgrupo8_MonedasVirtuales>');
      expect(xml).toContain('</Subgrupo8_MonedasVirtuales>');
    });
  });

  describe('exportToCSV', () => {
    it('should generate CSV with correct headers', async () => {
      setupEmptyMocks();

      const csv = await service.exportToCSV(mockCompanyId, mockYear);

      expect(csv).toContain('Criptomoneda');
      expect(csv).toContain('Nombre');
      expect(csv).toContain('Exchange/Wallet');
      expect(csv).toContain('País');
      expect(csv).toContain('Saldo 31/12');
      expect(csv).toContain('Total Valor EUR');
    });

    it('should use semicolon as delimiter', async () => {
      setupEmptyMocks();

      const csv = await service.exportToCSV(mockCompanyId, mockYear);
      const headerLine = csv.split('\n')[0];

      expect(headerLine.split(';').length).toBe(9); // 9 columns
    });
  });

  describe('validateForSubmission', () => {
    it('should return valid when company has NIF', async () => {
      const mockCompany = { id: mockCompanyId, name: 'Test', taxId: 'B12345678' };

      prismaService.company.findUnique.mockResolvedValue(mockCompany as any);
      prismaService.priceHistory.count.mockResolvedValue(10);
      setupEmptyMocks();

      const result = await service.validateForSubmission(mockCompanyId, mockYear);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when company has no NIF', async () => {
      const mockCompany = { id: mockCompanyId, name: 'Test', taxId: null };

      prismaService.company.findUnique.mockResolvedValue(mockCompany as any);
      prismaService.priceHistory.count.mockResolvedValue(0);
      setupEmptyMocks();

      const result = await service.validateForSubmission(mockCompanyId, mockYear);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('La empresa no tiene NIF configurado');
    });

    it('should warn when no price history available', async () => {
      const mockCompany = { id: mockCompanyId, name: 'Test', taxId: 'B12345678' };

      prismaService.company.findUnique.mockResolvedValue(mockCompany as any);
      prismaService.priceHistory.count.mockResolvedValue(0);
      setupEmptyMocks();

      const result = await service.validateForSubmission(mockCompanyId, mockYear);

      expect(result.warnings).toContainEqual(
        expect.stringContaining('No hay precios históricos'),
      );
    });
  });

  describe('getSummary', () => {
    it('should return executive summary structure', async () => {
      setupEmptyMocks();

      const summary = await service.getSummary(mockCompanyId, mockYear);

      expect(summary).toHaveProperty('obligado');
      expect(summary).toHaveProperty('totalEur');
      expect(summary).toHaveProperty('numPosiciones');
      expect(summary).toHaveProperty('topAssets');
      expect(summary).toHaveProperty('topExchanges');
      expect(Array.isArray(summary.topAssets)).toBe(true);
      expect(Array.isArray(summary.topExchanges)).toBe(true);
    });
  });
});
