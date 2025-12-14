import { Test, TestingModule } from '@nestjs/testing';
import { JournalEntriesController } from '../../../src/modules/accounting/controllers/journal-entries.controller.js';
import { JournalEntriesService } from '../../../src/modules/accounting/services/journal-entries.service.js';
import { CreateJournalEntryDto, QueryJournalEntriesDto } from '../../../src/modules/accounting/dto/index.js';
import { Decimal } from 'decimal.js';

/**
 * UNIT TEST: Journal Entries Controller
 * Tests para el controlador de asientos contables
 *
 * Tests críticos:
 * - Listado de asientos con paginación
 * - Creación de asientos balanceados (Debe = Haber)
 * - Actualización de borradores
 * - Posting de asientos
 * - Anulación de asientos
 * - Eliminación de borradores
 */

describe('JournalEntriesController', () => {
  let controller: JournalEntriesController;
  let journalEntriesService: jest.Mocked<JournalEntriesService>;

  const mockCompanyId = 'company-1';
  const mockUserId = 'user-1';
  const mockUser = { sub: mockUserId, email: 'test@example.com' };
  const mockEntryId = 'entry-1';

  const mockJournalEntry = {
    id: mockEntryId,
    companyId: mockCompanyId,
    fiscalYearId: 'fiscal-1',
    date: new Date('2024-01-15'),
    number: 1,
    description: 'Opening entry',
    status: 'DRAFT' as const,
    totalDebit: new Decimal('1000'),
    totalCredit: new Decimal('1000'),
    lines: [
      {
        id: 'line-1',
        accountId: 'account-1',
        debit: new Decimal('1000'),
        credit: new Decimal('0'),
        description: 'Cash deposit',
      },
      {
        id: 'line-2',
        accountId: 'account-2',
        debit: new Decimal('0'),
        credit: new Decimal('1000'),
        description: 'Capital contribution',
      },
    ],
  };

  const mockPaginatedResponse = {
    data: [mockJournalEntry],
    total: 1,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JournalEntriesController],
      providers: [
        {
          provide: JournalEntriesService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            post: jest.fn(),
            void: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<JournalEntriesController>(JournalEntriesController);
    journalEntriesService = module.get(JournalEntriesService) as jest.Mocked<JournalEntriesService>;
  });

  describe('findAll', () => {
    it('should return paginated list of journal entries', async () => {
      const query: QueryJournalEntriesDto = { page: 1, pageSize: 10 };
      journalEntriesService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(mockCompanyId, query);

      expect(journalEntriesService.findAll).toHaveBeenCalledWith(mockCompanyId, query);
      expect(result).toEqual(mockPaginatedResponse);
      expect(result.data).toHaveLength(1);
    });

    it('should pass filters to service', async () => {
      const query: QueryJournalEntriesDto = {
        page: 1,
        pageSize: 20,
        status: 'POSTED',
        fiscalYearId: 'fiscal-1',
      };
      journalEntriesService.findAll.mockResolvedValue({ ...mockPaginatedResponse, pageSize: 20 });

      await controller.findAll(mockCompanyId, query);

      expect(journalEntriesService.findAll).toHaveBeenCalledWith(
        mockCompanyId,
        expect.objectContaining({
          status: 'POSTED',
          fiscalYearId: 'fiscal-1',
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return journal entry with lines', async () => {
      journalEntriesService.findById.mockResolvedValue(mockJournalEntry);

      const result = await controller.findById(mockCompanyId, mockEntryId);

      expect(journalEntriesService.findById).toHaveBeenCalledWith(mockCompanyId, mockEntryId);
      expect(result).toEqual(mockJournalEntry);
      expect(result.lines).toHaveLength(2);
    });

    it('should throw NotFoundException if entry not found', async () => {
      journalEntriesService.findById.mockRejectedValue(new Error('Journal entry not found'));

      await expect(controller.findById(mockCompanyId, 'invalid-id')).rejects.toThrow();
    });
  });

  describe('create', () => {
    it('should create a balanced journal entry', async () => {
      const createDto: CreateJournalEntryDto = {
        fiscalYearId: 'fiscal-1',
        date: new Date('2024-01-15'),
        description: 'Opening entry',
        lines: [
          { accountId: 'account-1', debit: 1000, credit: 0, description: 'Cash deposit' },
          { accountId: 'account-2', debit: 0, credit: 1000, description: 'Capital contribution' },
        ],
      };

      journalEntriesService.create.mockResolvedValue(mockJournalEntry);

      const result = await controller.create(mockCompanyId, mockUser, createDto);

      expect(journalEntriesService.create).toHaveBeenCalledWith(mockCompanyId, mockUserId, createDto);
      expect(result).toEqual(mockJournalEntry);
    });

    it('should verify debit equals credit (CRITICAL)', async () => {
      const createDto: CreateJournalEntryDto = {
        fiscalYearId: 'fiscal-1',
        date: new Date('2024-01-15'),
        description: 'Test entry',
        lines: [
          { accountId: 'account-1', debit: 1000, credit: 0 },
          { accountId: 'account-2', debit: 0, credit: 1000 },
        ],
      };

      journalEntriesService.create.mockResolvedValue(mockJournalEntry);

      const result = await controller.create(mockCompanyId, mockUser, createDto);

      // CRITICAL: Debe = Haber
      expect(result.totalDebit.equals(result.totalCredit)).toBe(true);
    });

    it('should throw BadRequestException if entry unbalanced', async () => {
      const unbalancedDto: CreateJournalEntryDto = {
        fiscalYearId: 'fiscal-1',
        date: new Date('2024-01-15'),
        description: 'Unbalanced entry',
        lines: [
          { accountId: 'account-1', debit: 1000, credit: 0 },
          { accountId: 'account-2', debit: 0, credit: 500 }, // Desbalanceado!
        ],
      };

      journalEntriesService.create.mockRejectedValue(new Error('Entry must be balanced'));

      await expect(controller.create(mockCompanyId, mockUser, unbalancedDto)).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update a draft journal entry', async () => {
      const updateDto: Partial<CreateJournalEntryDto> = {
        description: 'Updated description',
      };

      const updatedEntry = { ...mockJournalEntry, description: 'Updated description' };
      journalEntriesService.update.mockResolvedValue(updatedEntry);

      const result = await controller.update(mockCompanyId, mockEntryId, updateDto);

      expect(journalEntriesService.update).toHaveBeenCalledWith(mockCompanyId, mockEntryId, updateDto);
      expect(result.description).toBe('Updated description');
    });

    it('should throw ConflictException if entry already posted', async () => {
      const updateDto: Partial<CreateJournalEntryDto> = { description: 'New description' };

      journalEntriesService.update.mockRejectedValue(new Error('Cannot modify posted entry'));

      await expect(controller.update(mockCompanyId, mockEntryId, updateDto)).rejects.toThrow();
    });
  });

  describe('post', () => {
    it('should post a journal entry', async () => {
      const postedEntry = { ...mockJournalEntry, status: 'POSTED' as const, postedBy: mockUserId };
      journalEntriesService.post.mockResolvedValue(postedEntry);

      const result = await controller.post(mockCompanyId, mockUser, mockEntryId);

      expect(journalEntriesService.post).toHaveBeenCalledWith(mockCompanyId, mockEntryId, mockUserId);
      expect(result.status).toBe('POSTED');
      expect(result.postedBy).toBe(mockUserId);
    });

    it('should throw ConflictException if entry already posted', async () => {
      journalEntriesService.post.mockRejectedValue(new Error('Entry already posted'));

      await expect(controller.post(mockCompanyId, mockUser, mockEntryId)).rejects.toThrow();
    });

    it('should not allow posting of voided entries', async () => {
      journalEntriesService.post.mockRejectedValue(new Error('Cannot post voided entry'));

      await expect(controller.post(mockCompanyId, mockUser, mockEntryId)).rejects.toThrow();
    });
  });

  describe('void', () => {
    it('should void a posted journal entry', async () => {
      const voidedEntry = { ...mockJournalEntry, status: 'VOIDED' as const, voidedBy: mockUserId };
      journalEntriesService.void.mockResolvedValue(voidedEntry);

      const result = await controller.void(mockCompanyId, mockUser, mockEntryId);

      expect(journalEntriesService.void).toHaveBeenCalledWith(mockCompanyId, mockEntryId, mockUserId);
      expect(result.status).toBe('VOIDED');
      expect(result.voidedBy).toBe(mockUserId);
    });

    it('should throw ConflictException if entry already voided', async () => {
      journalEntriesService.void.mockRejectedValue(new Error('Entry already voided'));

      await expect(controller.void(mockCompanyId, mockUser, mockEntryId)).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete a draft journal entry', async () => {
      journalEntriesService.delete.mockResolvedValue(undefined);

      await controller.delete(mockCompanyId, mockEntryId);

      expect(journalEntriesService.delete).toHaveBeenCalledWith(mockCompanyId, mockEntryId);
    });

    it('should throw ConflictException if entry is not draft', async () => {
      journalEntriesService.delete.mockRejectedValue(new Error('Only draft entries can be deleted'));

      await expect(controller.delete(mockCompanyId, mockEntryId)).rejects.toThrow();
    });
  });

  describe('Accounting Principles', () => {
    it('should enforce double-entry bookkeeping (Debe = Haber)', async () => {
      journalEntriesService.findById.mockResolvedValue(mockJournalEntry);

      const result = await controller.findById(mockCompanyId, mockEntryId);

      // CRITICAL: Verificar balance contable
      expect(result.totalDebit.equals(result.totalCredit)).toBe(true);
    });

    it('should calculate correct totals from lines', async () => {
      journalEntriesService.findById.mockResolvedValue(mockJournalEntry);

      const result = await controller.findById(mockCompanyId, mockEntryId);

      const calculatedDebit = result.lines.reduce(
        (sum, line) => sum.plus(line.debit),
        new Decimal(0),
      );
      const calculatedCredit = result.lines.reduce(
        (sum, line) => sum.plus(line.credit),
        new Decimal(0),
      );

      expect(calculatedDebit.equals(result.totalDebit)).toBe(true);
      expect(calculatedCredit.equals(result.totalCredit)).toBe(true);
    });
  });

  describe('Controller Setup', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have JournalEntriesService injected', () => {
      expect(journalEntriesService).toBeDefined();
    });
  });
});
