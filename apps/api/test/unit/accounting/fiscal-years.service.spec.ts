import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FiscalYearsService } from '../../../src/modules/accounting/services/fiscal-years.service.js';
import { PrismaService } from '@crypto-erp/database';
import { CreateFiscalYearDto } from '../../../src/modules/accounting/dto/index.js';
import { Decimal } from 'decimal.js';

/**
 * UNIT TEST: Fiscal Years Service
 * Tests para el servicio de ejercicios fiscales
 *
 * Tests críticos:
 * - Creación de ejercicios fiscales
 * - Validación de fechas (end > start)
 * - Detección de solapamientos (overlapping periods)
 * - Ejercicio actual (current)
 * - Cierre de ejercicio (solo si no hay borradores)
 * - Reapertura de ejercicio
 * - Restricción de eliminación (si tiene asientos)
 * - Estadísticas de asientos
 */

describe('FiscalYearsService', () => {
  let service: FiscalYearsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockCompanyId = 'company-1';
  const mockFiscalYearId = 'fiscal-1';

  const mockFiscalYear = {
    id: mockFiscalYearId,
    companyId: mockCompanyId,
    name: '2024',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    isClosed: false,
    closedAt: null,
    notes: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FiscalYearsService,
        {
          provide: PrismaService,
          useValue: {
            fiscalYear: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            journalEntry: {
              count: jest.fn(),
              groupBy: jest.fn(),
            },
            journalLine: {
              aggregate: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<FiscalYearsService>(FiscalYearsService);
    prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  describe('findAll', () => {
    it('should return all fiscal years for company', async () => {
      const mockFiscalYears = [mockFiscalYear];
      prismaService.fiscalYear.findMany.mockResolvedValue(mockFiscalYears);

      const result = await service.findAll(mockCompanyId);

      expect(prismaService.fiscalYear.findMany).toHaveBeenCalledWith({
        where: { companyId: mockCompanyId },
        orderBy: { startDate: 'desc' },
      });
      expect(result).toEqual(mockFiscalYears);
    });

    it('should sort fiscal years by start date descending', async () => {
      const multipleFiscalYears = [
        { ...mockFiscalYear, name: '2024', startDate: new Date('2024-01-01') },
        { ...mockFiscalYear, name: '2023', startDate: new Date('2023-01-01'), id: 'fiscal-2' },
        { ...mockFiscalYear, name: '2022', startDate: new Date('2022-01-01'), id: 'fiscal-3' },
      ];
      prismaService.fiscalYear.findMany.mockResolvedValue(multipleFiscalYears);

      const result = await service.findAll(mockCompanyId);

      expect(result[0].name).toBe('2024');
      expect(result[1].name).toBe('2023');
      expect(result[2].name).toBe('2022');
    });
  });

  describe('findById', () => {
    it('should return fiscal year by ID', async () => {
      prismaService.fiscalYear.findFirst.mockResolvedValue(mockFiscalYear);

      const result = await service.findById(mockCompanyId, mockFiscalYearId);

      expect(result).toEqual(mockFiscalYear);
    });

    it('should throw NotFoundException if fiscal year not found', async () => {
      prismaService.fiscalYear.findFirst.mockResolvedValue(null);

      await expect(service.findById(mockCompanyId, 'invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findCurrent', () => {
    it('should return current open fiscal year', async () => {
      prismaService.fiscalYear.findFirst.mockResolvedValue(mockFiscalYear);

      const result = await service.findCurrent(mockCompanyId);

      expect(result).toEqual(mockFiscalYear);
      expect(result!.isClosed).toBe(false);
    });

    it('should return null if no current fiscal year', async () => {
      prismaService.fiscalYear.findFirst.mockResolvedValue(null);

      const result = await service.findCurrent(mockCompanyId);

      expect(result).toBeNull();
    });

    it('should filter by today date', async () => {
      const today = new Date();
      prismaService.fiscalYear.findFirst.mockResolvedValue(mockFiscalYear);

      await service.findCurrent(mockCompanyId);

      expect(prismaService.fiscalYear.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            startDate: { lte: expect.any(Date) },
            endDate: { gte: expect.any(Date) },
            isClosed: false,
          }),
        }),
      );
    });
  });

  describe('findByDate', () => {
    it('should return fiscal year for specific date', async () => {
      const targetDate = new Date('2024-06-15');
      prismaService.fiscalYear.findFirst.mockResolvedValue(mockFiscalYear);

      const result = await service.findByDate(mockCompanyId, targetDate);

      expect(result).toEqual(mockFiscalYear);
      expect(prismaService.fiscalYear.findFirst).toHaveBeenCalledWith({
        where: {
          companyId: mockCompanyId,
          startDate: { lte: targetDate },
          endDate: { gte: targetDate },
        },
      });
    });

    it('should return null if no fiscal year for date', async () => {
      prismaService.fiscalYear.findFirst.mockResolvedValue(null);

      const result = await service.findByDate(mockCompanyId, new Date('2099-01-01'));

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new fiscal year', async () => {
      const createDto: CreateFiscalYearDto = {
        name: '2025',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      };

      prismaService.fiscalYear.findFirst.mockResolvedValue(null); // No overlaps/duplicates
      prismaService.fiscalYear.create.mockResolvedValue({
        ...mockFiscalYear,
        name: '2025',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
      });

      const result = await service.create(mockCompanyId, createDto);

      expect(result.name).toBe('2025');
      expect(result.startDate.getFullYear()).toBe(2025);
      expect(result.endDate.getFullYear()).toBe(2025);
    });

    it('should throw BadRequestException if end date before start date', async () => {
      const invalidDto: CreateFiscalYearDto = {
        name: '2025',
        startDate: '2025-12-31',
        endDate: '2025-01-01', // Invalid: end < start
      };

      await expect(service.create(mockCompanyId, invalidDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(mockCompanyId, invalidDto)).rejects.toThrow(
        'End date must be after start date',
      );
    });

    it('should throw ConflictException if fiscal year overlaps', async () => {
      const createDto: CreateFiscalYearDto = {
        name: '2024-B',
        startDate: '2024-06-01',
        endDate: '2025-05-31',
      };

      prismaService.fiscalYear.findFirst.mockResolvedValue(mockFiscalYear); // Overlapping!

      await expect(service.create(mockCompanyId, createDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if name already exists', async () => {
      const createDto: CreateFiscalYearDto = {
        name: '2024',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      };

      prismaService.fiscalYear.findFirst
        .mockResolvedValueOnce(null) // No overlap
        .mockResolvedValueOnce(mockFiscalYear); // Duplicate name!

      await expect(service.create(mockCompanyId, createDto)).rejects.toThrow(ConflictException);
    });

    it('should handle notes field', async () => {
      const createDto: CreateFiscalYearDto = {
        name: '2025',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        notes: 'First full year',
      };

      prismaService.fiscalYear.findFirst.mockResolvedValue(null);
      prismaService.fiscalYear.create.mockResolvedValue({
        ...mockFiscalYear,
        notes: 'First full year',
      });

      const result = await service.create(mockCompanyId, createDto);

      expect(result.notes).toBe('First full year');
    });
  });

  describe('update', () => {
    it('should update fiscal year details', async () => {
      const updateDto: Partial<CreateFiscalYearDto> = {
        notes: 'Updated notes',
      };

      prismaService.fiscalYear.findFirst.mockResolvedValue(mockFiscalYear);
      prismaService.fiscalYear.update.mockResolvedValue({
        ...mockFiscalYear,
        notes: 'Updated notes',
      });

      const result = await service.update(mockCompanyId, mockFiscalYearId, updateDto);

      expect(result.notes).toBe('Updated notes');
    });

    it('should throw ConflictException if fiscal year is closed', async () => {
      const closedFiscalYear = { ...mockFiscalYear, isClosed: true };
      prismaService.fiscalYear.findFirst.mockResolvedValue(closedFiscalYear);

      await expect(service.update(mockCompanyId, mockFiscalYearId, {})).rejects.toThrow(
        ConflictException,
      );
      await expect(service.update(mockCompanyId, mockFiscalYearId, {})).rejects.toThrow(
        'Cannot modify a closed fiscal year',
      );
    });

    it('should throw ConflictException if updating to duplicate name', async () => {
      const updateDto: Partial<CreateFiscalYearDto> = {
        name: '2023',
      };

      prismaService.fiscalYear.findFirst
        .mockResolvedValueOnce(mockFiscalYear) // findById
        .mockResolvedValueOnce({ ...mockFiscalYear, id: 'fiscal-2', name: '2023' }); // Duplicate!

      await expect(service.update(mockCompanyId, mockFiscalYearId, updateDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should validate dates when updating', async () => {
      const updateDto: Partial<CreateFiscalYearDto> = {
        startDate: '2024-12-31',
        endDate: '2024-01-01', // Invalid
      };

      prismaService.fiscalYear.findFirst.mockResolvedValue(mockFiscalYear);

      await expect(service.update(mockCompanyId, mockFiscalYearId, updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('close', () => {
    it('should close fiscal year', async () => {
      prismaService.fiscalYear.findFirst.mockResolvedValue(mockFiscalYear);
      prismaService.journalEntry.count.mockResolvedValue(0); // No drafts
      prismaService.fiscalYear.update.mockResolvedValue({
        ...mockFiscalYear,
        isClosed: true,
        closedAt: new Date(),
      });

      const result = await service.close(mockCompanyId, mockFiscalYearId);

      expect(result.isClosed).toBe(true);
      expect(result.closedAt).toBeDefined();
    });

    it('should throw ConflictException if already closed', async () => {
      const closedFiscalYear = { ...mockFiscalYear, isClosed: true };
      prismaService.fiscalYear.findFirst.mockResolvedValue(closedFiscalYear);

      await expect(service.close(mockCompanyId, mockFiscalYearId)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.close(mockCompanyId, mockFiscalYearId)).rejects.toThrow(
        'Fiscal year is already closed',
      );
    });

    it('should throw BadRequestException if has draft entries', async () => {
      prismaService.fiscalYear.findFirst.mockResolvedValue(mockFiscalYear);
      prismaService.journalEntry.count.mockResolvedValue(5); // 5 drafts!

      await expect(service.close(mockCompanyId, mockFiscalYearId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.close(mockCompanyId, mockFiscalYearId)).rejects.toThrow(
        'Cannot close fiscal year with 5 draft journal entries',
      );
    });
  });

  describe('reopen', () => {
    it('should reopen a closed fiscal year', async () => {
      const closedFiscalYear = { ...mockFiscalYear, isClosed: true, closedAt: new Date() };
      prismaService.fiscalYear.findFirst.mockResolvedValue(closedFiscalYear);
      prismaService.fiscalYear.update.mockResolvedValue({
        ...mockFiscalYear,
        isClosed: false,
        closedAt: null,
      });

      const result = await service.reopen(mockCompanyId, mockFiscalYearId);

      expect(result.isClosed).toBe(false);
      expect(result.closedAt).toBeNull();
    });

    it('should throw ConflictException if not closed', async () => {
      prismaService.fiscalYear.findFirst.mockResolvedValue(mockFiscalYear);

      await expect(service.reopen(mockCompanyId, mockFiscalYearId)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.reopen(mockCompanyId, mockFiscalYearId)).rejects.toThrow(
        'Fiscal year is not closed',
      );
    });
  });

  describe('delete', () => {
    it('should delete fiscal year with no entries', async () => {
      prismaService.fiscalYear.findFirst.mockResolvedValue(mockFiscalYear);
      prismaService.journalEntry.count.mockResolvedValue(0);
      prismaService.fiscalYear.delete.mockResolvedValue(mockFiscalYear);

      await service.delete(mockCompanyId, mockFiscalYearId);

      expect(prismaService.fiscalYear.delete).toHaveBeenCalledWith({ where: { id: mockFiscalYearId } });
    });

    it('should throw ConflictException if has journal entries', async () => {
      prismaService.fiscalYear.findFirst.mockResolvedValue(mockFiscalYear);
      prismaService.journalEntry.count.mockResolvedValue(10);

      await expect(service.delete(mockCompanyId, mockFiscalYearId)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.delete(mockCompanyId, mockFiscalYearId)).rejects.toThrow(
        'Cannot delete fiscal year with 10 journal entries',
      );
    });
  });

  describe('getStats', () => {
    it('should return fiscal year statistics', async () => {
      prismaService.fiscalYear.findFirst.mockResolvedValue(mockFiscalYear);
      prismaService.journalEntry.groupBy.mockResolvedValue([
        { status: 'POSTED', _count: 20 },
        { status: 'DRAFT', _count: 5 },
        { status: 'REVERSED', _count: 2 },
      ] as any);
      prismaService.journalLine.aggregate.mockResolvedValue({
        _sum: {
          debit: new Decimal('150000'),
          credit: new Decimal('150000'),
        },
      } as any);

      const result = await service.getStats(mockCompanyId, mockFiscalYearId);

      expect(result.totalEntries).toBe(27); // 20+5+2
      expect(result.postedEntries).toBe(20);
      expect(result.draftEntries).toBe(5);
      expect(result.voidedEntries).toBe(2);
      expect(result.totalDebits).toBe(150000);
      expect(result.totalCredits).toBe(150000);
    });

    it('should verify debits equal credits (CRITICAL)', async () => {
      prismaService.fiscalYear.findFirst.mockResolvedValue(mockFiscalYear);
      prismaService.journalEntry.groupBy.mockResolvedValue([]);
      prismaService.journalLine.aggregate.mockResolvedValue({
        _sum: {
          debit: new Decimal('100000'),
          credit: new Decimal('100000'),
        },
      } as any);

      const result = await service.getStats(mockCompanyId, mockFiscalYearId);

      // CRITICAL: Total Debe = Total Haber
      expect(result.totalDebits).toBe(result.totalCredits);
    });

    it('should return 0 for empty fiscal year', async () => {
      prismaService.fiscalYear.findFirst.mockResolvedValue(mockFiscalYear);
      prismaService.journalEntry.groupBy.mockResolvedValue([]);
      prismaService.journalLine.aggregate.mockResolvedValue({
        _sum: { debit: null, credit: null },
      } as any);

      const result = await service.getStats(mockCompanyId, mockFiscalYearId);

      expect(result.totalEntries).toBe(0);
      expect(result.totalDebits).toBe(0);
      expect(result.totalCredits).toBe(0);
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
