import { Test, TestingModule } from '@nestjs/testing';
import { CompaniesController } from '../../../src/modules/companies/companies.controller.js';
import { CompaniesService } from '../../../src/modules/companies/companies.service.js';
import { CreateCompanyDto, UpdateCompanyDto } from '../../../src/modules/companies/dto/index.js';
import { JwtPayload } from '../../../src/common/index.js';

/**
 * UNIT TEST: Companies Controller
 * Tests para el controlador de empresas
 *
 * Tests críticos:
 * - Creación de empresa con PGC (Plan General Contable)
 * - Listado de empresas por usuario
 * - Obtención de empresa por ID
 * - Actualización de empresa
 * - Soft delete (solo OWNER)
 * - Establecer empresa por defecto
 */

describe('CompaniesController', () => {
  let controller: CompaniesController;
  let companiesService: jest.Mocked<CompaniesService>;

  const mockUserId = 'user-1';
  const mockUser: JwtPayload = { sub: mockUserId, email: 'test@example.com' };
  const mockCompanyId = 'company-1';

  const mockCompany = {
    id: mockCompanyId,
    name: 'Test Company SL',
    taxId: 'B12345678',
    email: 'company@test.com',
    address: 'Calle Test 123',
    city: 'Madrid',
    postalCode: '28001',
    country: 'ES',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockCompanyWithMembership = {
    ...mockCompany,
    members: [
      {
        userId: mockUserId,
        role: 'OWNER',
        isDefault: true,
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompaniesController],
      providers: [
        {
          provide: CompaniesService,
          useValue: {
            create: jest.fn(),
            findAllByUser: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            setDefault: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CompaniesController>(CompaniesController);
    companiesService = module.get(CompaniesService) as jest.Mocked<CompaniesService>;
  });

  describe('create', () => {
    it('should create a new company with PGC seed data', async () => {
      const createDto: CreateCompanyDto = {
        name: 'Test Company SL',
        taxId: 'B12345678',
        email: 'company@test.com',
        address: 'Calle Test 123',
        city: 'Madrid',
        postalCode: '28001',
        country: 'ES',
      };

      companiesService.create.mockResolvedValue(mockCompanyWithMembership);

      const result = await controller.create(mockUser, createDto);

      expect(companiesService.create).toHaveBeenCalledWith(mockUserId, createDto);
      expect(result).toEqual(mockCompanyWithMembership);
      expect(result.name).toBe('Test Company SL');
    });

    it('should create company with OWNER role for creator', async () => {
      const createDto: CreateCompanyDto = {
        name: 'Another Company',
        taxId: 'B87654321',
        email: 'another@test.com',
      };

      companiesService.create.mockResolvedValue(mockCompanyWithMembership);

      const result = await controller.create(mockUser, createDto);

      expect(result.members).toBeDefined();
      expect(result.members[0].role).toBe('OWNER');
      expect(result.members[0].userId).toBe(mockUserId);
    });
  });

  describe('findAll', () => {
    it('should return all companies for current user', async () => {
      const mockCompanies = [
        mockCompanyWithMembership,
        {
          ...mockCompany,
          id: 'company-2',
          name: 'Second Company',
          members: [{ userId: mockUserId, role: 'MEMBER', isDefault: false }],
        },
      ];

      companiesService.findAllByUser.mockResolvedValue(mockCompanies);

      const result = await controller.findAll(mockUser);

      expect(companiesService.findAllByUser).toHaveBeenCalledWith(mockUserId);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Test Company SL');
      expect(result[1].name).toBe('Second Company');
    });

    it('should return empty array if user has no companies', async () => {
      companiesService.findAllByUser.mockResolvedValue([]);

      const result = await controller.findAll(mockUser);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return company by ID', async () => {
      companiesService.findById.mockResolvedValue(mockCompanyWithMembership);

      const result = await controller.findOne(mockUser, mockCompanyId);

      expect(companiesService.findById).toHaveBeenCalledWith(mockCompanyId, mockUserId);
      expect(result).toEqual(mockCompanyWithMembership);
    });

    it('should throw NotFoundException if company not found', async () => {
      companiesService.findById.mockRejectedValue(new Error('Company not found'));

      await expect(controller.findOne(mockUser, 'invalid-id')).rejects.toThrow();
    });

    it('should throw ForbiddenException if user not member', async () => {
      companiesService.findById.mockRejectedValue(new Error('User not member of this company'));

      await expect(controller.findOne(mockUser, mockCompanyId)).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update company details', async () => {
      const updateDto: UpdateCompanyDto = {
        name: 'Updated Company Name',
        email: 'updated@test.com',
      };

      const updatedCompany = { ...mockCompanyWithMembership, ...updateDto };
      companiesService.update.mockResolvedValue(updatedCompany);

      const result = await controller.update(mockUser, mockCompanyId, updateDto);

      expect(companiesService.update).toHaveBeenCalledWith(mockCompanyId, mockUserId, updateDto);
      expect(result.name).toBe('Updated Company Name');
      expect(result.email).toBe('updated@test.com');
    });

    it('should throw ForbiddenException if user lacks permissions', async () => {
      const updateDto: UpdateCompanyDto = { name: 'New Name' };

      companiesService.update.mockRejectedValue(new Error('Insufficient permissions'));

      await expect(controller.update(mockUser, mockCompanyId, updateDto)).rejects.toThrow();
    });

    it('should update address fields', async () => {
      const updateDto: UpdateCompanyDto = {
        address: 'New Address 456',
        city: 'Barcelona',
        postalCode: '08001',
      };

      const updatedCompany = { ...mockCompanyWithMembership, ...updateDto };
      companiesService.update.mockResolvedValue(updatedCompany);

      const result = await controller.update(mockUser, mockCompanyId, updateDto);

      expect(result.address).toBe('New Address 456');
      expect(result.city).toBe('Barcelona');
      expect(result.postalCode).toBe('08001');
    });
  });

  describe('delete', () => {
    it('should soft delete company (OWNER only)', async () => {
      const deletedCompany = { ...mockCompanyWithMembership, isActive: false };
      companiesService.delete.mockResolvedValue(deletedCompany);

      const result = await controller.delete(mockUser, mockCompanyId);

      expect(companiesService.delete).toHaveBeenCalledWith(mockCompanyId, mockUserId);
      expect(result.isActive).toBe(false);
    });

    it('should throw ForbiddenException if user is not OWNER', async () => {
      companiesService.delete.mockRejectedValue(new Error('Only OWNER can delete company'));

      await expect(controller.delete(mockUser, mockCompanyId)).rejects.toThrow();
    });
  });

  describe('setDefault', () => {
    it('should set company as default for user', async () => {
      const defaultCompany = {
        ...mockCompanyWithMembership,
        members: [{ ...mockCompanyWithMembership.members[0], isDefault: true }],
      };
      companiesService.setDefault.mockResolvedValue(defaultCompany);

      const result = await controller.setDefault(mockUser, mockCompanyId);

      expect(companiesService.setDefault).toHaveBeenCalledWith(mockCompanyId, mockUserId);
      expect(result.members[0].isDefault).toBe(true);
    });

    it('should unset previous default company', async () => {
      // Simulación: solo una empresa puede ser default
      companiesService.setDefault.mockResolvedValue(mockCompanyWithMembership);

      await controller.setDefault(mockUser, mockCompanyId);

      expect(companiesService.setDefault).toHaveBeenCalledWith(mockCompanyId, mockUserId);
    });
  });

  describe('Controller Setup', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have CompaniesService injected', () => {
      expect(companiesService).toBeDefined();
    });
  });
});
