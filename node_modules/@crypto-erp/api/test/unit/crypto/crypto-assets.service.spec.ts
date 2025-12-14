import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CryptoAssetsService } from '../../../src/modules/crypto/services/crypto-assets.service.js';
import { PrismaService } from '@crypto-erp/database';
import { CreateCryptoAssetDto } from '../../../src/modules/crypto/dto/index.js';

/**
 * UNIT TEST: Crypto Assets Service
 * Tests para el servicio de gestión de criptoactivos
 *
 * Tests críticos:
 * - Creación de assets con símbolo único
 * - Normalización de símbolos a mayúsculas
 * - Validación de duplicados
 * - Protección de eliminación con lots existentes
 * - Búsqueda por símbolo y ID
 */

describe('CryptoAssetsService', () => {
  let service: CryptoAssetsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockCompanyId = 'company-1';
  const mockAssetId = 'asset-1';

  const mockAsset = {
    id: mockAssetId,
    companyId: mockCompanyId,
    symbol: 'BTC',
    name: 'Bitcoin',
    decimals: 8,
    coingeckoId: 'bitcoin',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CryptoAssetsService,
        {
          provide: PrismaService,
          useValue: {
            cryptoAsset: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            cryptoLot: {
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<CryptoAssetsService>(CryptoAssetsService);
    prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  describe('findAll', () => {
    it('should return all assets for company', async () => {
      const mockAssets = [
        mockAsset,
        { ...mockAsset, id: 'asset-2', symbol: 'ETH', name: 'Ethereum' },
      ];

      prismaService.cryptoAsset.findMany.mockResolvedValue(mockAssets);

      const result = await service.findAll(mockCompanyId);

      expect(prismaService.cryptoAsset.findMany).toHaveBeenCalledWith({
        where: { companyId: mockCompanyId },
        orderBy: { symbol: 'asc' },
      });
      expect(result).toEqual(mockAssets);
      expect(result).toHaveLength(2);
    });

    it('should return empty array if no assets', async () => {
      prismaService.cryptoAsset.findMany.mockResolvedValue([]);

      const result = await service.findAll(mockCompanyId);

      expect(result).toEqual([]);
    });

    it('should order by symbol ascending', async () => {
      prismaService.cryptoAsset.findMany.mockResolvedValue([]);

      await service.findAll(mockCompanyId);

      expect(prismaService.cryptoAsset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { symbol: 'asc' },
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return asset by ID', async () => {
      prismaService.cryptoAsset.findFirst.mockResolvedValue(mockAsset);

      const result = await service.findById(mockCompanyId, mockAssetId);

      expect(prismaService.cryptoAsset.findFirst).toHaveBeenCalledWith({
        where: { id: mockAssetId, companyId: mockCompanyId },
      });
      expect(result).toEqual(mockAsset);
    });

    it('should throw NotFoundException if asset not found', async () => {
      prismaService.cryptoAsset.findFirst.mockResolvedValue(null);

      await expect(service.findById(mockCompanyId, 'invalid-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findById(mockCompanyId, 'invalid-id')).rejects.toThrow(
        'Crypto asset with ID invalid-id not found',
      );
    });

    it('should not return asset from different company', async () => {
      prismaService.cryptoAsset.findFirst.mockResolvedValue(null);

      await expect(service.findById('other-company', mockAssetId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findBySymbol', () => {
    it('should return asset by symbol', async () => {
      prismaService.cryptoAsset.findFirst.mockResolvedValue(mockAsset);

      const result = await service.findBySymbol(mockCompanyId, 'BTC');

      expect(prismaService.cryptoAsset.findFirst).toHaveBeenCalledWith({
        where: { companyId: mockCompanyId, symbol: 'BTC' },
      });
      expect(result).toEqual(mockAsset);
    });

    it('should normalize symbol to uppercase (CRITICAL)', async () => {
      prismaService.cryptoAsset.findFirst.mockResolvedValue(mockAsset);

      await service.findBySymbol(mockCompanyId, 'btc');

      expect(prismaService.cryptoAsset.findFirst).toHaveBeenCalledWith({
        where: { companyId: mockCompanyId, symbol: 'BTC' },
      });
    });

    it('should return null if symbol not found', async () => {
      prismaService.cryptoAsset.findFirst.mockResolvedValue(null);

      const result = await service.findBySymbol(mockCompanyId, 'DOGE');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new asset', async () => {
      const createDto: CreateCryptoAssetDto = {
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        coingeckoId: 'ethereum',
      };

      const createdAsset = {
        ...mockAsset,
        id: 'asset-2',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
      };

      prismaService.cryptoAsset.findFirst.mockResolvedValue(null); // No duplicate
      prismaService.cryptoAsset.create.mockResolvedValue(createdAsset);

      const result = await service.create(mockCompanyId, createDto);

      expect(prismaService.cryptoAsset.create).toHaveBeenCalledWith({
        data: {
          symbol: 'ETH',
          name: 'Ethereum',
          decimals: 18,
          coingeckoId: 'ethereum',
          isActive: true, // Default
          companyId: mockCompanyId,
        },
      });
      expect(result).toEqual(createdAsset);
    });

    it('should normalize symbol to uppercase when creating', async () => {
      const createDto: CreateCryptoAssetDto = {
        symbol: 'eth',
        name: 'Ethereum',
      };

      prismaService.cryptoAsset.findFirst.mockResolvedValue(null);
      prismaService.cryptoAsset.create.mockResolvedValue(mockAsset as any);

      await service.create(mockCompanyId, createDto);

      expect(prismaService.cryptoAsset.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          symbol: 'ETH',
        }),
      });
    });

    it('should use default values for optional fields', async () => {
      const createDto: CreateCryptoAssetDto = {
        symbol: 'USDT',
        name: 'Tether',
      };

      prismaService.cryptoAsset.findFirst.mockResolvedValue(null);
      prismaService.cryptoAsset.create.mockResolvedValue(mockAsset as any);

      await service.create(mockCompanyId, createDto);

      expect(prismaService.cryptoAsset.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          decimals: 8, // Default
          isActive: true, // Default
        }),
      });
    });

    it('should throw ConflictException if symbol already exists (CRITICAL)', async () => {
      const createDto: CreateCryptoAssetDto = {
        symbol: 'BTC',
        name: 'Bitcoin Duplicate',
      };

      prismaService.cryptoAsset.findFirst.mockResolvedValue(mockAsset); // Duplicate

      await expect(service.create(mockCompanyId, createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(mockCompanyId, createDto)).rejects.toThrow(
        'Crypto asset with symbol BTC already exists',
      );
      expect(prismaService.cryptoAsset.create).not.toHaveBeenCalled();
    });

    it('should allow same symbol in different companies', async () => {
      const createDto: CreateCryptoAssetDto = {
        symbol: 'BTC',
        name: 'Bitcoin',
      };

      prismaService.cryptoAsset.findFirst.mockResolvedValue(null); // No duplicate in this company
      prismaService.cryptoAsset.create.mockResolvedValue(mockAsset as any);

      await service.create('company-2', createDto);

      expect(prismaService.cryptoAsset.findFirst).toHaveBeenCalledWith({
        where: { companyId: 'company-2', symbol: 'BTC' },
      });
    });

    it('should accept custom decimals', async () => {
      const createDto: CreateCryptoAssetDto = {
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
      };

      prismaService.cryptoAsset.findFirst.mockResolvedValue(null);
      prismaService.cryptoAsset.create.mockResolvedValue(mockAsset as any);

      await service.create(mockCompanyId, createDto);

      expect(prismaService.cryptoAsset.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          decimals: 6,
        }),
      });
    });

    it('should accept custom isActive flag', async () => {
      const createDto: CreateCryptoAssetDto = {
        symbol: 'OLD',
        name: 'Old Token',
        isActive: false,
      };

      prismaService.cryptoAsset.findFirst.mockResolvedValue(null);
      prismaService.cryptoAsset.create.mockResolvedValue(mockAsset as any);

      await service.create(mockCompanyId, createDto);

      expect(prismaService.cryptoAsset.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isActive: false,
        }),
      });
    });
  });

  describe('update', () => {
    it('should update asset fields', async () => {
      const updateDto: Partial<CreateCryptoAssetDto> = {
        name: 'Bitcoin (Updated)',
        coingeckoId: 'bitcoin-new-id',
      };

      const updatedAsset = { ...mockAsset, name: 'Bitcoin (Updated)' };

      prismaService.cryptoAsset.findFirst.mockResolvedValue(mockAsset);
      prismaService.cryptoAsset.update.mockResolvedValue(updatedAsset);

      const result = await service.update(mockCompanyId, mockAssetId, updateDto);

      expect(prismaService.cryptoAsset.update).toHaveBeenCalledWith({
        where: { id: mockAssetId },
        data: {
          name: 'Bitcoin (Updated)',
          coingeckoId: 'bitcoin-new-id',
        },
      });
      expect(result.name).toBe('Bitcoin (Updated)');
    });

    it('should throw NotFoundException if asset not found', async () => {
      prismaService.cryptoAsset.findFirst.mockResolvedValue(null);

      await expect(
        service.update(mockCompanyId, 'invalid-id', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should normalize symbol to uppercase when updating', async () => {
      const updateDto: Partial<CreateCryptoAssetDto> = {
        symbol: 'xbt',
      };

      prismaService.cryptoAsset.findFirst
        .mockResolvedValueOnce(mockAsset) // findById
        .mockResolvedValueOnce(null); // No duplicate
      prismaService.cryptoAsset.update.mockResolvedValue(mockAsset as any);

      await service.update(mockCompanyId, mockAssetId, updateDto);

      expect(prismaService.cryptoAsset.update).toHaveBeenCalledWith({
        where: { id: mockAssetId },
        data: {
          symbol: 'XBT',
        },
      });
    });

    it('should throw ConflictException if new symbol exists', async () => {
      const updateDto: Partial<CreateCryptoAssetDto> = {
        symbol: 'ETH',
      };

      const ethAsset = { ...mockAsset, id: 'asset-2', symbol: 'ETH' };

      prismaService.cryptoAsset.findFirst
        .mockResolvedValueOnce(mockAsset) // findById
        .mockResolvedValueOnce(ethAsset); // Duplicate symbol

      await expect(service.update(mockCompanyId, mockAssetId, updateDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.update(mockCompanyId, mockAssetId, updateDto)).rejects.toThrow(
        'Crypto asset with symbol ETH already exists',
      );
    });

    it('should allow updating symbol to same value', async () => {
      const updateDto: Partial<CreateCryptoAssetDto> = {
        symbol: 'BTC',
      };

      prismaService.cryptoAsset.findFirst
        .mockResolvedValueOnce(mockAsset) // findById
        .mockResolvedValueOnce(null); // No other asset with BTC (excluding self)
      prismaService.cryptoAsset.update.mockResolvedValue(mockAsset as any);

      await service.update(mockCompanyId, mockAssetId, updateDto);

      expect(prismaService.cryptoAsset.findFirst).toHaveBeenCalledWith({
        where: {
          companyId: mockCompanyId,
          symbol: 'BTC',
          NOT: { id: mockAssetId },
        },
      });
    });

    it('should update decimals', async () => {
      const updateDto: Partial<CreateCryptoAssetDto> = {
        decimals: 18,
      };

      prismaService.cryptoAsset.findFirst.mockResolvedValue(mockAsset);
      prismaService.cryptoAsset.update.mockResolvedValue(mockAsset as any);

      await service.update(mockCompanyId, mockAssetId, updateDto);

      expect(prismaService.cryptoAsset.update).toHaveBeenCalledWith({
        where: { id: mockAssetId },
        data: {
          decimals: 18,
        },
      });
    });

    it('should deactivate asset', async () => {
      const updateDto: Partial<CreateCryptoAssetDto> = {
        isActive: false,
      };

      prismaService.cryptoAsset.findFirst.mockResolvedValue(mockAsset);
      prismaService.cryptoAsset.update.mockResolvedValue({ ...mockAsset, isActive: false });

      const result = await service.update(mockCompanyId, mockAssetId, updateDto);

      expect(result.isActive).toBe(false);
    });

    it('should handle multiple field updates', async () => {
      const updateDto: Partial<CreateCryptoAssetDto> = {
        name: 'New Name',
        decimals: 6,
        isActive: false,
      };

      prismaService.cryptoAsset.findFirst.mockResolvedValue(mockAsset);
      prismaService.cryptoAsset.update.mockResolvedValue(mockAsset as any);

      await service.update(mockCompanyId, mockAssetId, updateDto);

      expect(prismaService.cryptoAsset.update).toHaveBeenCalledWith({
        where: { id: mockAssetId },
        data: {
          name: 'New Name',
          decimals: 6,
          isActive: false,
        },
      });
    });
  });

  describe('delete', () => {
    it('should delete asset with no lots', async () => {
      prismaService.cryptoAsset.findFirst.mockResolvedValue(mockAsset);
      prismaService.cryptoLot.count.mockResolvedValue(0);
      prismaService.cryptoAsset.delete.mockResolvedValue(mockAsset);

      await service.delete(mockCompanyId, mockAssetId);

      expect(prismaService.cryptoLot.count).toHaveBeenCalledWith({
        where: { cryptoAssetId: mockAssetId },
      });
      expect(prismaService.cryptoAsset.delete).toHaveBeenCalledWith({
        where: { id: mockAssetId },
      });
    });

    it('should throw NotFoundException if asset not found', async () => {
      prismaService.cryptoAsset.findFirst.mockResolvedValue(null);

      await expect(service.delete(mockCompanyId, 'invalid-id')).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaService.cryptoAsset.delete).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if lots exist (CRITICAL - Data Integrity)', async () => {
      prismaService.cryptoAsset.findFirst.mockResolvedValue(mockAsset);
      prismaService.cryptoLot.count.mockResolvedValue(5);

      await expect(service.delete(mockCompanyId, mockAssetId)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.delete(mockCompanyId, mockAssetId)).rejects.toThrow(
        'Cannot delete asset with 5 cost basis lots. Deactivate instead.',
      );
      expect(prismaService.cryptoAsset.delete).not.toHaveBeenCalled();
    });

    it('should suggest deactivation when lots exist', async () => {
      prismaService.cryptoAsset.findFirst.mockResolvedValue(mockAsset);
      prismaService.cryptoLot.count.mockResolvedValue(10);

      try {
        await service.delete(mockCompanyId, mockAssetId);
      } catch (error: any) {
        expect(error.message).toContain('Deactivate instead');
      }
    });
  });

  describe('Service Setup', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have PrismaService injected', () => {
      expect(prismaService).toBeDefined();
    });
  });
});
