import { Test, TestingModule } from '@nestjs/testing';
import { AccountsController } from '../../../src/modules/accounting/controllers/accounts.controller.js';
import { AccountsService } from '../../../src/modules/accounting/services/accounts.service.js';
import { CreateAccountDto, QueryAccountsDto } from '../../../src/modules/accounting/dto/index.js';
import { Decimal } from 'decimal.js';

/**
 * UNIT TEST: Accounts Controller
 * Tests para el controlador de cuentas contables (PGC)
 *
 * Tests críticos:
 * - Listado de cuentas con filtros
 * - Árbol jerárquico de cuentas
 * - Búsqueda por ID y código
 * - Cálculo de saldos
 * - Creación de cuentas
 * - Activación/Desactivación
 */

describe('AccountsController', () => {
  let controller: AccountsController;
  let accountsService: jest.Mocked<AccountsService>;

  const mockCompanyId = 'company-1';
  const mockAccountId = 'account-1';

  const mockAccount = {
    id: mockAccountId,
    companyId: mockCompanyId,
    code: '570',
    name: 'Caja, euros',
    type: 'ASSET' as const,
    category: 'TESORERÍA',
    isActive: true,
    balance: new Decimal('5000'),
  };

  const mockAccountTree = [
    {
      code: '5',
      name: 'Cuentas financieras',
      children: [
        {
          code: '57',
          name: 'Tesorería',
          children: [
            { code: '570', name: 'Caja, euros', children: [] },
            { code: '572', name: 'Bancos e instituciones de crédito c/c vista, euros', children: [] },
          ],
        },
      ],
    },
  ];

  const mockBalance = {
    accountId: mockAccountId,
    debit: new Decimal('10000'),
    credit: new Decimal('5000'),
    balance: new Decimal('5000'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountsController],
      providers: [
        {
          provide: AccountsService,
          useValue: {
            findAll: jest.fn(),
            findTree: jest.fn(),
            findById: jest.fn(),
            findByCode: jest.fn(),
            getBalance: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            deactivate: jest.fn(),
            activate: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AccountsController>(AccountsController);
    accountsService = module.get(AccountsService) as jest.Mocked<AccountsService>;
  });

  describe('findAll', () => {
    it('should return list of accounts', async () => {
      const mockAccounts = [mockAccount];
      accountsService.findAll.mockResolvedValue(mockAccounts);

      const query: QueryAccountsDto = {};
      const result = await controller.findAll(mockCompanyId, query);

      expect(accountsService.findAll).toHaveBeenCalledWith(mockCompanyId, query);
      expect(result).toEqual(mockAccounts);
      expect(result).toHaveLength(1);
    });

    it('should filter by account type', async () => {
      accountsService.findAll.mockResolvedValue([mockAccount]);

      const query: QueryAccountsDto = { type: 'ASSET' };
      await controller.findAll(mockCompanyId, query);

      expect(accountsService.findAll).toHaveBeenCalledWith(
        mockCompanyId,
        expect.objectContaining({ type: 'ASSET' }),
      );
    });

    it('should filter by category', async () => {
      accountsService.findAll.mockResolvedValue([mockAccount]);

      const query: QueryAccountsDto = { category: 'TESORERÍA' };
      await controller.findAll(mockCompanyId, query);

      expect(accountsService.findAll).toHaveBeenCalledWith(
        mockCompanyId,
        expect.objectContaining({ category: 'TESORERÍA' }),
      );
    });

    it('should filter by active status', async () => {
      accountsService.findAll.mockResolvedValue([mockAccount]);

      const query: QueryAccountsDto = { isActive: true };
      await controller.findAll(mockCompanyId, query);

      expect(accountsService.findAll).toHaveBeenCalledWith(
        mockCompanyId,
        expect.objectContaining({ isActive: true }),
      );
    });
  });

  describe('getTree', () => {
    it('should return hierarchical account tree', async () => {
      accountsService.findTree.mockResolvedValue(mockAccountTree);

      const result = await controller.getTree(mockCompanyId);

      expect(accountsService.findTree).toHaveBeenCalledWith(mockCompanyId);
      expect(result).toEqual(mockAccountTree);
    });

    it('should have nested structure (PGC hierarchy)', async () => {
      accountsService.findTree.mockResolvedValue(mockAccountTree);

      const result = await controller.getTree(mockCompanyId);

      // Verificar estructura jerárquica: 5 > 57 > 570
      expect(result[0].code).toBe('5');
      expect(result[0].children[0].code).toBe('57');
      expect(result[0].children[0].children[0].code).toBe('570');
    });
  });

  describe('findById', () => {
    it('should return account by ID', async () => {
      accountsService.findById.mockResolvedValue(mockAccount);

      const result = await controller.findById(mockCompanyId, mockAccountId);

      expect(accountsService.findById).toHaveBeenCalledWith(mockCompanyId, mockAccountId);
      expect(result).toEqual(mockAccount);
    });

    it('should throw NotFoundException if account not found', async () => {
      accountsService.findById.mockRejectedValue(new Error('Account not found'));

      await expect(controller.findById(mockCompanyId, 'invalid-id')).rejects.toThrow();
    });
  });

  describe('findByCode', () => {
    it('should return account by PGC code', async () => {
      accountsService.findByCode.mockResolvedValue(mockAccount);

      const result = await controller.findByCode(mockCompanyId, '570');

      expect(accountsService.findByCode).toHaveBeenCalledWith(mockCompanyId, '570');
      expect(result).toEqual(mockAccount);
      expect(result.code).toBe('570');
    });

    it('should return error if account code not found', async () => {
      accountsService.findByCode.mockResolvedValue(null);

      const result = await controller.findByCode(mockCompanyId, '999');

      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('code', '999');
    });

    it('should find standard PGC accounts', async () => {
      const pgcAccounts = [
        { code: '570', name: 'Caja, euros' },
        { code: '572', name: 'Bancos' },
        { code: '768', name: 'Diferencias positivas de cambio' },
        { code: '668', name: 'Diferencias negativas de cambio' },
      ];

      for (const acc of pgcAccounts) {
        accountsService.findByCode.mockResolvedValue({ ...mockAccount, ...acc });
        const result = await controller.findByCode(mockCompanyId, acc.code);
        expect(result.code).toBe(acc.code);
      }
    });
  });

  describe('getBalance', () => {
    it('should return account balance', async () => {
      accountsService.getBalance.mockResolvedValue(mockBalance);

      const result = await controller.getBalance(mockCompanyId, mockAccountId);

      expect(accountsService.getBalance).toHaveBeenCalledWith(
        mockCompanyId,
        mockAccountId,
        undefined,
        undefined,
      );
      expect(result.balance.toNumber()).toBe(5000);
    });

    it('should calculate balance for date range', async () => {
      accountsService.getBalance.mockResolvedValue(mockBalance);

      const startDate = '2024-01-01';
      const endDate = '2024-12-31';

      await controller.getBalance(mockCompanyId, mockAccountId, startDate, endDate);

      expect(accountsService.getBalance).toHaveBeenCalledWith(
        mockCompanyId,
        mockAccountId,
        new Date(startDate),
        new Date(endDate),
      );
    });

    it('should verify balance = debit - credit for ASSET accounts', async () => {
      accountsService.getBalance.mockResolvedValue(mockBalance);

      const result = await controller.getBalance(mockCompanyId, mockAccountId);

      // Para cuentas de ACTIVO: saldo = debe - haber
      const calculatedBalance = result.debit.minus(result.credit);
      expect(calculatedBalance.equals(result.balance)).toBe(true);
    });
  });

  describe('create', () => {
    it('should create a new account', async () => {
      const createDto: CreateAccountDto = {
        code: '5700',
        name: 'Caja sucursal Madrid',
        type: 'ASSET',
        category: 'TESORERÍA',
      };

      const newAccount = { ...mockAccount, ...createDto };
      accountsService.create.mockResolvedValue(newAccount);

      const result = await controller.create(mockCompanyId, createDto);

      expect(accountsService.create).toHaveBeenCalledWith(mockCompanyId, createDto);
      expect(result.code).toBe('5700');
      expect(result.type).toBe('ASSET');
    });

    it('should throw ConflictException if code already exists', async () => {
      const createDto: CreateAccountDto = {
        code: '570',
        name: 'Duplicate account',
        type: 'ASSET',
      };

      accountsService.create.mockRejectedValue(new Error('Account code already exists'));

      await expect(controller.create(mockCompanyId, createDto)).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update account details', async () => {
      const updateDto: Partial<CreateAccountDto> = {
        name: 'Updated account name',
      };

      const updatedAccount = { ...mockAccount, name: 'Updated account name' };
      accountsService.update.mockResolvedValue(updatedAccount);

      const result = await controller.update(mockCompanyId, mockAccountId, updateDto);

      expect(accountsService.update).toHaveBeenCalledWith(mockCompanyId, mockAccountId, updateDto);
      expect(result.name).toBe('Updated account name');
    });

    it('should throw NotFoundException if account not found', async () => {
      accountsService.update.mockRejectedValue(new Error('Account not found'));

      await expect(controller.update(mockCompanyId, 'invalid-id', {})).rejects.toThrow();
    });
  });

  describe('deactivate', () => {
    it('should deactivate an account', async () => {
      const deactivatedAccount = { ...mockAccount, isActive: false };
      accountsService.deactivate.mockResolvedValue(deactivatedAccount);

      const result = await controller.deactivate(mockCompanyId, mockAccountId);

      expect(accountsService.deactivate).toHaveBeenCalledWith(mockCompanyId, mockAccountId);
      expect(result.isActive).toBe(false);
    });
  });

  describe('activate', () => {
    it('should activate an account', async () => {
      const activatedAccount = { ...mockAccount, isActive: true };
      accountsService.activate.mockResolvedValue(activatedAccount);

      const result = await controller.activate(mockCompanyId, mockAccountId);

      expect(accountsService.activate).toHaveBeenCalledWith(mockCompanyId, mockAccountId);
      expect(result.isActive).toBe(true);
    });
  });

  describe('PGC Compliance', () => {
    it('should support standard Spanish PGC account codes', async () => {
      const pgcCodes = ['100', '400', '430', '570', '572', '768', '668', '662', '769'];

      for (const code of pgcCodes) {
        accountsService.findByCode.mockResolvedValue({ ...mockAccount, code });
        const result = await controller.findByCode(mockCompanyId, code);
        expect(result.code).toBe(code);
      }
    });

    it('should categorize accounts correctly', async () => {
      const categories = [
        { type: 'ASSET', category: 'TESORERÍA', code: '570' },
        { type: 'ASSET', category: 'CRYPTO', code: '5700' },
        { type: 'INCOME', category: 'FINANCIERO', code: '768' },
        { type: 'EXPENSE', category: 'FINANCIERO', code: '668' },
      ];

      for (const cat of categories) {
        accountsService.create.mockResolvedValue({ ...mockAccount, ...cat });
        const result = await controller.create(mockCompanyId, cat as CreateAccountDto);
        expect(result.type).toBe(cat.type);
        expect(result.category).toBe(cat.category);
      }
    });
  });

  describe('Controller Setup', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have AccountsService injected', () => {
      expect(accountsService).toBeDefined();
    });
  });
});
