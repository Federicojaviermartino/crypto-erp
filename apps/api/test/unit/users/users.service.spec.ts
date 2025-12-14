import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from '../../../src/modules/users/users.service.js';
import { PrismaService } from '@crypto-erp/database';
import { UpdateUserDto } from '../../../src/modules/users/dto/index.js';

/**
 * UNIT TEST: Users Service
 * Tests para el servicio de usuarios
 *
 * Tests críticos:
 * - Búsqueda de usuario por ID
 * - Usuario no encontrado
 * - Actualización de perfil
 * - Exclusión de password en respuestas
 */

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUserId = 'user-1';

  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    avatarUrl: null,
    isActive: true,
    lastLoginAt: new Date('2024-01-15'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  describe('findById', () => {
    it('should return user by ID', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById(mockUserId);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
        select: expect.objectContaining({
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        }),
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.findById('invalid-id')).rejects.toThrow('User not found');
    });

    it('should not include password in response', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById(mockUserId);

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should include user profile fields', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById(mockUserId);

      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('firstName');
      expect(result).toHaveProperty('lastName');
      expect(result).toHaveProperty('isActive');
    });
  });

  describe('update', () => {
    it('should update user profile', async () => {
      const updateDto: UpdateUserDto = {
        firstName: 'Jane',
        lastName: 'Smith',
      };

      const updatedUser = { ...mockUser, firstName: 'Jane', lastName: 'Smith' };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update(mockUserId, updateDto);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: updateDto,
        select: expect.any(Object),
      });
      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const updateDto: UpdateUserDto = { firstName: 'Jane' };

      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.update('invalid-id', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should update avatar URL', async () => {
      const updateDto: UpdateUserDto = {
        avatarUrl: 'https://example.com/avatar.jpg',
      };

      const updatedUser = { ...mockUser, avatarUrl: 'https://example.com/avatar.jpg' };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update(mockUserId, updateDto);

      expect(result.avatarUrl).toBe('https://example.com/avatar.jpg');
    });

    it('should not include password in update response', async () => {
      const updateDto: UpdateUserDto = { firstName: 'Jane' };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.user.update.mockResolvedValue({ ...mockUser, firstName: 'Jane' });

      const result = await service.update(mockUserId, updateDto);

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should update multiple fields at once', async () => {
      const updateDto: UpdateUserDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        avatarUrl: 'https://example.com/new-avatar.jpg',
      };

      const updatedUser = { ...mockUser, ...updateDto };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update(mockUserId, updateDto);

      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
      expect(result.avatarUrl).toBe('https://example.com/new-avatar.jpg');
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
