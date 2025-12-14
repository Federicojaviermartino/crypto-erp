import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AccountsService } from '../../../src/modules/accounting/services/accounts.service.js';
import { PrismaService } from '@crypto-erp/database';
import { CreateAccountDto, QueryAccountsDto } from '../../../src/modules/accounting/dto/index.js';
import { AccountType } from '@prisma/client';
import { Decimal } from 'decimal.js';

/**
 * UNIT TEST: Accounts Service
 * Tests para el servicio de cuentas contables (PGC)
 *
 * Tests críticos:
 * - Creación de cuentas con código único
 * - Árbol jerárquico (parentCode)
 * - Cálculo de saldos (ASSET/EXPENSE vs LIABILITY/EQUITY/INCOME)
 * - Búsqueda por código
 * - Activación/Desactivación
 */

describe('AccountsService', () => {
  let service: AccountsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockCompanyId = 'company-1';
  const mockAccountId = 'account-1';

  const mockAccount = {
    id: mockAccountId,
    companyId: mockCompanyId,
    code: '570',
    name: 'Caja, euros',
    type: 'ASSET' as AccountType,
    parentCode: '57',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        {
          provide: PrismaService,
          useValue: {
            account: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            journalLine: {
              aggregate: jest.fn(),
              groupBy: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
    prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  describe('findAll', () => {
    it('should return all accounts for company', async () => {
      const mockAccounts = [mockAccount];
      prismaService.account.findMany.mockResolvedValue(mockAccounts);

      const query: QueryAccountsDto = {};
      const result = await service.findAll(mockCompanyId, query);

      expect(prismaService.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyId: mockCompanyId },
          orderBy: { code: 'asc' },
        }),
      );
      expect(result).toEqual(mockAccounts);
    });

    it('should filter by account type', async () => {
      prismaService.account.findMany.mockResolvedValue([mockAccount]);

      const query: QueryAccountsDto = { type: 'ASSET' };
      await service.findAll(mockCompanyId, query);

      expect(prismaService.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'ASSET' }),
        }),
      );
    });

    it('should filter by active status', async () => {
      prismaService.account.findMany.mockResolvedValue([mockAccount]);

      const query: QueryAccountsDto = { isActive: true };
      await service.findAll(mockCompanyId, query);

      expect(prismaService.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });

    it('should search by code or name', async () => {
      prismaService.account.findMany.mockResolvedValue([mockAccount]);

      const query: QueryAccountsDto = { search: 'Caja' };
      await service.findAll(mockCompanyId, query);

      expect(prismaService.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ code: expect.any(Object) }),
              expect.objectContaining({ name: expect.any(Object) }),
            ]),
          }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return account by ID', async () => {
      prismaService.account.findFirst.mockResolvedValue(mockAccount);

      const result = await service.findById(mockCompanyId, mockAccountId);

      expect(result).toEqual(mockAccount);
    });

    it('should throw NotFoundException if account not found', async () => {
      prismaService.account.findFirst.mockResolvedValue(null);

      await expect(service.findById(mockCompanyId, 'invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByCode', () => {
    it('should return account by code', async () => {
      prismaService.account.findFirst.mockResolvedValue(mockAccount);

      const result = await service.findByCode(mockCompanyId, '570');

      expect(result).toEqual(mockAccount);
    });

    it('should return null if code not found', async () => {
      prismaService.account.findFirst.mockResolvedValue(null);

      const result = await service.findByCode(mockCompanyId, '999');

      expect(result).toBeNull();
    });
  });

  describe('findTree', () => {
    it('should build hierarchical tree structure', async () => {
      const accounts = [
        { ...mockAccount, code: '5', name: 'Cuentas financieras', parentCode: null },
        { ...mockAccount, code: '57', name: 'Tesorería', parentCode: '5', id: 'account-2' },
        { ...mockAccount, code: '570', name: 'Caja, euros', parentCode: '57', id: 'account-3' },
      ];

      prismaService.account.findMany.mockResolvedValue(accounts);

      const result = await service.findTree(mockCompanyId);

      expect(result).toHaveLength(1); // Only root accounts
      expect(result[0].code).toBe('5');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children![0].code).toBe('57');
      expect(result[0].children![0].children).toHaveLength(1);
      expect(result[0].children![0].children![0].code).toBe('570');
    });

    it('should only include active accounts', async () => {
      prismaService.account.findMany.mockResolvedValue([]);

      await service.findTree(mockCompanyId);

      expect(prismaService.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });
  });

  describe('getBalance', () => {
    it('should calculate balance for ASSET account (debit - credit)', async () => {
      prismaService.account.findFirst.mockResolvedValue(mockAccount);
      prismaService.journalLine.aggregate.mockResolvedValue({
        _sum: {
          debit: new Decimal('10000'),
          credit: new Decimal('5000'),
        },
      } as any);

      const result = await service.getBalance(mockCompanyId, mockAccountId);

      expect(result.debit).toBe(10000);
      expect(result.credit).toBe(5000);
      expect(result.balance).toBe(5000); // Debit - Credit for ASSET
    });

    it('should calculate balance for LIABILITY account (credit - debit)', async () => {
      const liabilityAccount = { ...mockAccount, type: 'LIABILITY' as AccountType };
      prismaService.account.findFirst.mockResolvedValue(liabilityAccount);
      prismaService.journalLine.aggregate.mockResolvedValue({
        _sum: {
          debit: new Decimal('3000'),
          credit: new Decimal('8000'),
        },
      } as any);

      const result = await service.getBalance(mockCompanyId, mockAccountId);

      expect(result.balance).toBe(5000); // Credit - Debit for LIABILITY
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      prismaService.account.findFirst.mockResolvedValue(mockAccount);
      prismaService.journalLine.aggregate.mockResolvedValue({
        _sum: { debit: new Decimal('0'), credit: new Decimal('0') },
      } as any);

      await service.getBalance(mockCompanyId, mockAccountId, startDate, endDate);

      expect(prismaService.journalLine.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            journalEntry: expect.objectContaining({
              date: expect.any(Object),
            }),
          }),
        }),
      );
    });

    it('should only include POSTED entries', async () => {
      prismaService.account.findFirst.mockResolvedValue(mockAccount);
      prismaService.journalLine.aggregate.mockResolvedValue({
        _sum: { debit: new Decimal('0'), credit: new Decimal('0') },
      } as any);

      await service.getBalance(mockCompanyId, mockAccountId);

      expect(prismaService.journalLine.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            journalEntry: expect.objectContaining({
              status: 'POSTED',
            }),
          }),
        }),
      );
    });
  });

  describe('getBalanceForMultiple', () => {
    it('should calculate balances for multiple accounts', async () => {
      const accountIds = ['account-1', 'account-2'];
      const accounts = [
        mockAccount,
        { ...mockAccount, id: 'account-2', code: '572', type: 'ASSET' as AccountType },
      ];

      prismaService.account.findMany.mockResolvedValue(accounts);
      prismaService.journalLine.groupBy.mockResolvedValue([
        { accountId: 'account-1', _sum: { debit: new Decimal('10000'), credit: new Decimal('5000') } },
        { accountId: 'account-2', _sum: { debit: new Decimal('8000'), credit: new Decimal('3000') } },
      ] as any);

      const result = await service.getBalanceForMultiple(mockCompanyId, accountIds);

      expect(result.size).toBe(2);
      expect(result.get('account-1')?.balance).toBe(5000);
      expect(result.get('account-2')?.balance).toBe(5000);
    });

    it('should return zero balance for accounts with no entries', async () => {
      const accountIds = ['account-1', 'account-2'];

      prismaService.account.findMany.mockResolvedValue([mockAccount]);
      prismaService.journalLine.groupBy.mockResolvedValue([
        { accountId: 'account-1', _sum: { debit: new Decimal('1000'), credit: new Decimal('500') } },
      ] as any);

      const result = await service.getBalanceForMultiple(mockCompanyId, accountIds);

      expect(result.get('account-2')).toEqual({ debit: 0, credit: 0, balance: 0 });
    });
  });

  describe('create', () => {
    it('should create a new account', async () => {
      const createDto: CreateAccountDto = {
        code: '5700',
        name: 'Caja sucursal Madrid',
        type: 'ASSET',
      };

      prismaService.account.findFirst.mockResolvedValue(null); // No duplicate
      prismaService.account.create.mockResolvedValue({ ...mockAccount, ...createDto });

      const result = await service.create(mockCompanyId, createDto);

      expect(result.code).toBe('5700');
      expect(result.name).toBe('Caja sucursal Madrid');
    });

    it('should throw ConflictException if code already exists', async () => {
      const createDto: CreateAccountDto = {
        code: '570',
        name: 'Duplicate',
        type: 'ASSET',
      };

      prismaService.account.findFirst.mockResolvedValue(mockAccount);

      await expect(service.create(mockCompanyId, createDto)).rejects.toThrow(ConflictException);
    });

    it('should validate parent code exists', async () => {
      const createDto: CreateAccountDto = {
        code: '5701',
        name: 'Child account',
        type: 'ASSET',
        parentCode: '570',
      };

      prismaService.account.findFirst
        .mockResolvedValueOnce(null) // No duplicate
        .mockResolvedValueOnce(mockAccount); // Parent exists

      prismaService.account.create.mockResolvedValue({ ...mockAccount, ...createDto });

      await service.create(mockCompanyId, createDto);

      expect(prismaService.account.findFirst).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException if parent code does not exist', async () => {
      const createDto: CreateAccountDto = {
        code: '5701',
        name: 'Child account',
        type: 'ASSET',
        parentCode: '999',
      };

      prismaService.account.findFirst
        .mockResolvedValueOnce(null) // No duplicate
        .mockResolvedValueOnce(null); // Parent not found

      await expect(service.create(mockCompanyId, createDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update account details', async () => {
      const updateDto: Partial<CreateAccountDto> = {
        name: 'Updated name',
      };

      prismaService.account.findFirst.mockResolvedValue(mockAccount);
      prismaService.account.update.mockResolvedValue({ ...mockAccount, name: 'Updated name' });

      const result = await service.update(mockCompanyId, mockAccountId, updateDto);

      expect(result.name).toBe('Updated name');
    });

    it('should validate parent code when updating', async () => {
      const updateDto: Partial<CreateAccountDto> = {
        parentCode: '57',
      };

      prismaService.account.findFirst
        .mockResolvedValueOnce(mockAccount) // findById
        .mockResolvedValueOnce({ ...mockAccount, code: '57' }); // Parent exists

      prismaService.account.update.mockResolvedValue(mockAccount);

      await service.update(mockCompanyId, mockAccountId, updateDto);

      expect(prismaService.account.findFirst).toHaveBeenCalledTimes(2);
    });
  });

  describe('deactivate / activate', () => {
    it('should deactivate account', async () => {
      prismaService.account.findFirst.mockResolvedValue(mockAccount);
      prismaService.account.update.mockResolvedValue({ ...mockAccount, isActive: false });

      const result = await service.deactivate(mockCompanyId, mockAccountId);

      expect(result.isActive).toBe(false);
    });

    it('should activate account', async () => {
      prismaService.account.findFirst.mockResolvedValue({ ...mockAccount, isActive: false });
      prismaService.account.update.mockResolvedValue({ ...mockAccount, isActive: true });

      const result = await service.activate(mockCompanyId, mockAccountId);

      expect(result.isActive).toBe(true);
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
