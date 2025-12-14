import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SeriesService } from '../../../src/modules/invoicing/services/series.service.js';
import { PrismaService } from '@crypto-erp/database';
import { CreateSeriesDto } from '../../../src/modules/invoicing/dto/index.js';
import { InvoiceType } from '@prisma/client';

/**
 * UNIT TEST: Series Service
 * Tests para el servicio de series de facturación
 *
 * Tests críticos:
 * - Creación de series con prefijo único
 * - Manejo de serie por defecto (solo una)
 * - Búsqueda por prefijo
 * - Actualización de series
 * - Restricción de eliminación (si tiene facturas)
 * - Estadísticas de uso
 */

describe('SeriesService', () => {
  let service: SeriesService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockCompanyId = 'company-1';
  const mockSeriesId = 'series-1';

  const mockSeries = {
    id: mockSeriesId,
    companyId: mockCompanyId,
    code: 'AA',
    prefix: 'AA',
    name: 'Serie A - General',
    type: InvoiceType.STANDARD,
    nextNumber: 1,
    digitCount: 6,
    isDefault: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeriesService,
        {
          provide: PrismaService,
          useValue: {
            invoiceSeries: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
              delete: jest.fn(),
            },
            invoice: {
              count: jest.fn(),
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<SeriesService>(SeriesService);
    prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  describe('findAll', () => {
    it('should return all series for company', async () => {
      const mockSeriesList = [mockSeries];
      prismaService.invoiceSeries.findMany.mockResolvedValue(mockSeriesList);

      const result = await service.findAll(mockCompanyId);

      expect(prismaService.invoiceSeries.findMany).toHaveBeenCalledWith({
        where: { companyId: mockCompanyId },
        orderBy: { prefix: 'asc' },
      });
      expect(result).toEqual(mockSeriesList);
      expect(result).toHaveLength(1);
    });

    it('should return empty array if no series exist', async () => {
      prismaService.invoiceSeries.findMany.mockResolvedValue([]);

      const result = await service.findAll(mockCompanyId);

      expect(result).toEqual([]);
    });

    it('should sort series by prefix alphabetically', async () => {
      const multipleSeries = [
        { ...mockSeries, prefix: 'AA' },
        { ...mockSeries, prefix: 'BB', id: 'series-2' },
        { ...mockSeries, prefix: 'CC', id: 'series-3' },
      ];
      prismaService.invoiceSeries.findMany.mockResolvedValue(multipleSeries);

      const result = await service.findAll(mockCompanyId);

      expect(result[0].prefix).toBe('AA');
      expect(result[1].prefix).toBe('BB');
      expect(result[2].prefix).toBe('CC');
    });
  });

  describe('findById', () => {
    it('should return series by ID', async () => {
      prismaService.invoiceSeries.findFirst.mockResolvedValue(mockSeries);

      const result = await service.findById(mockCompanyId, mockSeriesId);

      expect(prismaService.invoiceSeries.findFirst).toHaveBeenCalledWith({
        where: { id: mockSeriesId, companyId: mockCompanyId },
      });
      expect(result).toEqual(mockSeries);
    });

    it('should throw NotFoundException if series not found', async () => {
      prismaService.invoiceSeries.findFirst.mockResolvedValue(null);

      await expect(service.findById(mockCompanyId, 'invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByPrefix', () => {
    it('should return series by prefix', async () => {
      prismaService.invoiceSeries.findFirst.mockResolvedValue(mockSeries);

      const result = await service.findByPrefix(mockCompanyId, 'AA');

      expect(prismaService.invoiceSeries.findFirst).toHaveBeenCalledWith({
        where: { companyId: mockCompanyId, prefix: 'AA' },
      });
      expect(result).toEqual(mockSeries);
      expect(result!.prefix).toBe('AA');
    });

    it('should return null if prefix not found', async () => {
      prismaService.invoiceSeries.findFirst.mockResolvedValue(null);

      const result = await service.findByPrefix(mockCompanyId, 'ZZ');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new series', async () => {
      const createDto: CreateSeriesDto = {
        prefix: 'BB',
        name: 'Serie B - Export',
        nextNumber: 1,
        isDefault: false,
      };

      prismaService.invoiceSeries.findFirst.mockResolvedValue(null); // No duplicate
      prismaService.invoiceSeries.create.mockResolvedValue({
        ...mockSeries,
        ...createDto,
        code: createDto.prefix,
      });

      const result = await service.create(mockCompanyId, createDto);

      expect(prismaService.invoiceSeries.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          prefix: 'BB',
          code: 'BB',
          name: 'Serie B - Export',
          nextNumber: 1,
          isDefault: false,
        }),
      });
      expect(result.prefix).toBe('BB');
    });

    it('should throw ConflictException if prefix already exists', async () => {
      const createDto: CreateSeriesDto = {
        prefix: 'AA',
        name: 'Duplicate',
      };

      prismaService.invoiceSeries.findFirst.mockResolvedValue(mockSeries); // Duplicate!

      await expect(service.create(mockCompanyId, createDto)).rejects.toThrow(ConflictException);
      await expect(service.create(mockCompanyId, createDto)).rejects.toThrow(
        'Series with prefix AA already exists',
      );
    });

    it('should unset other defaults when creating default series', async () => {
      const createDto: CreateSeriesDto = {
        prefix: 'BB',
        name: 'New Default',
        isDefault: true,
      };

      prismaService.invoiceSeries.findFirst.mockResolvedValue(null);
      prismaService.invoiceSeries.updateMany.mockResolvedValue({ count: 1 });
      prismaService.invoiceSeries.create.mockResolvedValue({
        ...mockSeries,
        ...createDto,
        code: createDto.prefix,
      });

      await service.create(mockCompanyId, createDto);

      expect(prismaService.invoiceSeries.updateMany).toHaveBeenCalledWith({
        where: {
          companyId: mockCompanyId,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    });

    it('should use default nextNumber of 1 if not provided', async () => {
      const createDto: CreateSeriesDto = {
        prefix: 'CC',
        name: 'Serie C',
      };

      prismaService.invoiceSeries.findFirst.mockResolvedValue(null);
      prismaService.invoiceSeries.create.mockResolvedValue({
        ...mockSeries,
        ...createDto,
        nextNumber: 1,
      });

      const result = await service.create(mockCompanyId, createDto);

      expect(result.nextNumber).toBe(1);
    });
  });

  describe('update', () => {
    it('should update series details', async () => {
      const updateDto: Partial<CreateSeriesDto> = {
        name: 'Updated Name',
      };

      prismaService.invoiceSeries.findFirst.mockResolvedValue(mockSeries);
      prismaService.invoiceSeries.update.mockResolvedValue({
        ...mockSeries,
        name: 'Updated Name',
      });

      const result = await service.update(mockCompanyId, mockSeriesId, updateDto);

      expect(result.name).toBe('Updated Name');
    });

    it('should throw ConflictException if changing to duplicate prefix', async () => {
      const updateDto: Partial<CreateSeriesDto> = {
        prefix: 'BB',
      };

      prismaService.invoiceSeries.findFirst
        .mockResolvedValueOnce(mockSeries) // findById
        .mockResolvedValueOnce({ ...mockSeries, id: 'series-2', prefix: 'BB' }); // findByPrefix - duplicate!

      await expect(service.update(mockCompanyId, mockSeriesId, updateDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should allow updating to same prefix', async () => {
      const updateDto: Partial<CreateSeriesDto> = {
        prefix: 'AA', // Same prefix
        name: 'Updated',
      };

      prismaService.invoiceSeries.findFirst.mockResolvedValue(mockSeries);
      prismaService.invoiceSeries.update.mockResolvedValue({
        ...mockSeries,
        name: 'Updated',
      });

      await expect(service.update(mockCompanyId, mockSeriesId, updateDto)).resolves.toBeDefined();
    });

    it('should unset other defaults when setting as default', async () => {
      const updateDto: Partial<CreateSeriesDto> = {
        isDefault: true,
      };

      prismaService.invoiceSeries.findFirst.mockResolvedValue(mockSeries);
      prismaService.invoiceSeries.updateMany.mockResolvedValue({ count: 1 });
      prismaService.invoiceSeries.update.mockResolvedValue({
        ...mockSeries,
        isDefault: true,
      });

      await service.update(mockCompanyId, mockSeriesId, updateDto);

      expect(prismaService.invoiceSeries.updateMany).toHaveBeenCalledWith({
        where: {
          companyId: mockCompanyId,
          isDefault: true,
          NOT: { id: mockSeriesId },
        },
        data: { isDefault: false },
      });
    });
  });

  describe('delete', () => {
    it('should delete series with no invoices', async () => {
      prismaService.invoiceSeries.findFirst.mockResolvedValue(mockSeries);
      prismaService.invoice.count.mockResolvedValue(0); // No invoices
      prismaService.invoiceSeries.delete.mockResolvedValue(mockSeries);

      await service.delete(mockCompanyId, mockSeriesId);

      expect(prismaService.invoiceSeries.delete).toHaveBeenCalledWith({ where: { id: mockSeriesId } });
    });

    it('should throw ConflictException if series has invoices', async () => {
      prismaService.invoiceSeries.findFirst.mockResolvedValue(mockSeries);
      prismaService.invoice.count.mockResolvedValue(15); // Has invoices!

      await expect(service.delete(mockCompanyId, mockSeriesId)).rejects.toThrow(ConflictException);
      await expect(service.delete(mockCompanyId, mockSeriesId)).rejects.toThrow(
        'Cannot delete series with 15 associated invoices',
      );
    });

    it('should throw NotFoundException if series does not exist', async () => {
      prismaService.invoiceSeries.findFirst.mockResolvedValue(null);

      await expect(service.delete(mockCompanyId, 'invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStats', () => {
    it('should return series statistics', async () => {
      const mockStats = {
        totalInvoices: 25,
        currentYear: new Date().getFullYear(),
        currentYearInvoices: 10,
        lastInvoiceNumber: 'AA-000025',
      };

      prismaService.invoiceSeries.findFirst.mockResolvedValue(mockSeries);
      prismaService.invoice.count
        .mockResolvedValueOnce(25) // Total
        .mockResolvedValueOnce(10); // Current year
      prismaService.invoice.findFirst.mockResolvedValue({ fullNumber: 'AA-000025' });

      const result = await service.getStats(mockCompanyId, mockSeriesId);

      expect(result.totalInvoices).toBe(25);
      expect(result.currentYearInvoices).toBe(10);
      expect(result.lastInvoiceNumber).toBe('AA-000025');
      expect(result.currentYear).toBe(new Date().getFullYear());
    });

    it('should return null lastInvoiceNumber if no invoices', async () => {
      prismaService.invoiceSeries.findFirst.mockResolvedValue(mockSeries);
      prismaService.invoice.count.mockResolvedValue(0);
      prismaService.invoice.findFirst.mockResolvedValue(null);

      const result = await service.getStats(mockCompanyId, mockSeriesId);

      expect(result.totalInvoices).toBe(0);
      expect(result.lastInvoiceNumber).toBeNull();
    });

    it('should throw NotFoundException if series not found', async () => {
      prismaService.invoiceSeries.findFirst.mockResolvedValue(null);

      await expect(service.getStats(mockCompanyId, 'invalid-id')).rejects.toThrow(NotFoundException);
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
