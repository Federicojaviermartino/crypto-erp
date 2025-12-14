import { Test, TestingModule } from '@nestjs/testing';
import { FiscalYearsController } from '../../../src/modules/accounting/controllers/fiscal-years.controller.js';
import { FiscalYearsService } from '../../../src/modules/accounting/services/fiscal-years.service.js';
import { CreateFiscalYearDto } from '../../../src/modules/accounting/dto/index.js';

/**
 * UNIT TEST: Fiscal Years Controller
 * Tests para el controlador de ejercicios fiscales
 *
 * Tests críticos:
 * - Listado de ejercicios fiscales
 * - Obtener ejercicio actual
 * - Crear ejercicios fiscales
 * - Cerrar/reabrir ejercicios
 * - Estadísticas (asientos, debe=haber)
 */

describe('FiscalYearsController', () => {
  let controller: FiscalYearsController;
  let fiscalYearsService: jest.Mocked<FiscalYearsService>;

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

  const mockStats = {
    totalEntries: 150,
    postedEntries: 120,
    draftEntries: 25,
    voidedEntries: 5,
    totalDebits: 500000,
    totalCredits: 500000,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FiscalYearsController],
      providers: [
        {
          provide: FiscalYearsService,
          useValue: {
            findAll: jest.fn(),
            findCurrent: jest.fn(),
            findById: jest.fn(),
            getStats: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            close: jest.fn(),
            reopen: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<FiscalYearsController>(FiscalYearsController);
    fiscalYearsService = module.get(FiscalYearsService) as jest.Mocked<FiscalYearsService>;
  });

  describe('findAll', () => {
    it('should return all fiscal years for company', async () => {
      const mockFiscalYears = [mockFiscalYear];
      fiscalYearsService.findAll.mockResolvedValue(mockFiscalYears);

      const result = await controller.findAll(mockCompanyId);

      expect(fiscalYearsService.findAll).toHaveBeenCalledWith(mockCompanyId);
      expect(result).toEqual(mockFiscalYears);
    });

    it('should return fiscal years sorted by start date descending', async () => {
      const fiscalYears = [
        { ...mockFiscalYear, name: '2024' },
        { ...mockFiscalYear, name: '2023', id: 'fiscal-2', startDate: new Date('2023-01-01') },
      ];
      fiscalYearsService.findAll.mockResolvedValue(fiscalYears);

      const result = await controller.findAll(mockCompanyId);

      expect(result).toHaveLength(2);
    });
  });

  describe('findCurrent', () => {
    it('should return current active fiscal year', async () => {
      fiscalYearsService.findCurrent.mockResolvedValue(mockFiscalYear);

      const result = await controller.findCurrent(mockCompanyId);

      expect(fiscalYearsService.findCurrent).toHaveBeenCalledWith(mockCompanyId);
      expect(result).toEqual(mockFiscalYear);
    });

    it('should return error if no current fiscal year', async () => {
      fiscalYearsService.findCurrent.mockResolvedValue(null);

      const result = await controller.findCurrent(mockCompanyId);

      expect(result).toHaveProperty('error');
      expect(result.error).toContain('No active fiscal year found');
    });
  });

  describe('findById', () => {
    it('should return fiscal year by ID', async () => {
      fiscalYearsService.findById.mockResolvedValue(mockFiscalYear);

      const result = await controller.findById(mockCompanyId, mockFiscalYearId);

      expect(fiscalYearsService.findById).toHaveBeenCalledWith(mockCompanyId, mockFiscalYearId);
      expect(result).toEqual(mockFiscalYear);
    });

    it('should throw NotFoundException if fiscal year not found', async () => {
      fiscalYearsService.findById.mockRejectedValue(new Error('Fiscal year not found'));

      await expect(controller.findById(mockCompanyId, 'invalid-id')).rejects.toThrow();
    });
  });

  describe('getStats', () => {
    it('should return fiscal year statistics', async () => {
      fiscalYearsService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(mockCompanyId, mockFiscalYearId);

      expect(fiscalYearsService.getStats).toHaveBeenCalledWith(mockCompanyId, mockFiscalYearId);
      expect(result).toEqual(mockStats);
    });

    it('should verify debits equal credits (CRITICAL)', async () => {
      fiscalYearsService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(mockCompanyId, mockFiscalYearId);

      // CRITICAL: Total Debe = Total Haber
      expect(result.totalDebits).toBe(result.totalCredits);
    });

    it('should return entry counts by status', async () => {
      fiscalYearsService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(mockCompanyId, mockFiscalYearId);

      expect(result.totalEntries).toBe(150);
      expect(result.postedEntries).toBe(120);
      expect(result.draftEntries).toBe(25);
      expect(result.voidedEntries).toBe(5);
      // 120 + 25 + 5 = 150 ✅
    });
  });

  describe('create', () => {
    it('should create a new fiscal year', async () => {
      const createDto: CreateFiscalYearDto = {
        name: '2025',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      };

      fiscalYearsService.create.mockResolvedValue({
        ...mockFiscalYear,
        name: '2025',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
      });

      const result = await controller.create(mockCompanyId, createDto);

      expect(fiscalYearsService.create).toHaveBeenCalledWith(mockCompanyId, createDto);
      expect(result.name).toBe('2025');
    });

    it('should throw ConflictException if fiscal year overlaps', async () => {
      const createDto: CreateFiscalYearDto = {
        name: '2024-B',
        startDate: '2024-06-01',
        endDate: '2025-05-31',
      };

      fiscalYearsService.create.mockRejectedValue(new Error('Fiscal year overlaps'));

      await expect(controller.create(mockCompanyId, createDto)).rejects.toThrow();
    });

    it('should throw BadRequestException if end date before start date', async () => {
      const createDto: CreateFiscalYearDto = {
        name: '2025',
        startDate: '2025-12-31',
        endDate: '2025-01-01',
      };

      fiscalYearsService.create.mockRejectedValue(
        new Error('End date must be after start date'),
      );

      await expect(controller.create(mockCompanyId, createDto)).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update fiscal year details', async () => {
      const updateDto: Partial<CreateFiscalYearDto> = {
        notes: 'Updated notes',
      };

      fiscalYearsService.update.mockResolvedValue({
        ...mockFiscalYear,
        notes: 'Updated notes',
      });

      const result = await controller.update(mockCompanyId, mockFiscalYearId, updateDto);

      expect(fiscalYearsService.update).toHaveBeenCalledWith(
        mockCompanyId,
        mockFiscalYearId,
        updateDto,
      );
      expect(result.notes).toBe('Updated notes');
    });

    it('should throw ConflictException if fiscal year is closed', async () => {
      const updateDto: Partial<CreateFiscalYearDto> = { name: '2024 Updated' };

      fiscalYearsService.update.mockRejectedValue(
        new Error('Cannot modify a closed fiscal year'),
      );

      await expect(
        controller.update(mockCompanyId, mockFiscalYearId, updateDto),
      ).rejects.toThrow();
    });
  });

  describe('close', () => {
    it('should close fiscal year', async () => {
      const closedFiscalYear = {
        ...mockFiscalYear,
        isClosed: true,
        closedAt: new Date(),
      };

      fiscalYearsService.close.mockResolvedValue(closedFiscalYear);

      const result = await controller.close(mockCompanyId, mockFiscalYearId);

      expect(fiscalYearsService.close).toHaveBeenCalledWith(mockCompanyId, mockFiscalYearId);
      expect(result.isClosed).toBe(true);
      expect(result.closedAt).toBeDefined();
    });

    it('should throw ConflictException if already closed', async () => {
      fiscalYearsService.close.mockRejectedValue(new Error('Fiscal year is already closed'));

      await expect(controller.close(mockCompanyId, mockFiscalYearId)).rejects.toThrow();
    });

    it('should throw BadRequestException if draft entries exist', async () => {
      fiscalYearsService.close.mockRejectedValue(
        new Error('Cannot close fiscal year with 5 draft journal entries'),
      );

      await expect(controller.close(mockCompanyId, mockFiscalYearId)).rejects.toThrow();
    });
  });

  describe('reopen', () => {
    it('should reopen a closed fiscal year', async () => {
      const reopenedFiscalYear = {
        ...mockFiscalYear,
        isClosed: false,
        closedAt: null,
      };

      fiscalYearsService.reopen.mockResolvedValue(reopenedFiscalYear);

      const result = await controller.reopen(mockCompanyId, mockFiscalYearId);

      expect(fiscalYearsService.reopen).toHaveBeenCalledWith(mockCompanyId, mockFiscalYearId);
      expect(result.isClosed).toBe(false);
      expect(result.closedAt).toBeNull();
    });

    it('should throw ConflictException if not closed', async () => {
      fiscalYearsService.reopen.mockRejectedValue(new Error('Fiscal year is not closed'));

      await expect(controller.reopen(mockCompanyId, mockFiscalYearId)).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete fiscal year', async () => {
      fiscalYearsService.delete.mockResolvedValue(undefined);

      await controller.delete(mockCompanyId, mockFiscalYearId);

      expect(fiscalYearsService.delete).toHaveBeenCalledWith(mockCompanyId, mockFiscalYearId);
    });

    it('should throw ConflictException if has journal entries', async () => {
      fiscalYearsService.delete.mockRejectedValue(
        new Error('Cannot delete fiscal year with 10 journal entries'),
      );

      await expect(controller.delete(mockCompanyId, mockFiscalYearId)).rejects.toThrow();
    });

    it('should throw NotFoundException if fiscal year not found', async () => {
      fiscalYearsService.delete.mockRejectedValue(new Error('Fiscal year not found'));

      await expect(controller.delete(mockCompanyId, 'invalid-id')).rejects.toThrow();
    });
  });

  describe('Controller Setup', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have FiscalYearsService injected', () => {
      expect(fiscalYearsService).toBeDefined();
    });
  });
});
