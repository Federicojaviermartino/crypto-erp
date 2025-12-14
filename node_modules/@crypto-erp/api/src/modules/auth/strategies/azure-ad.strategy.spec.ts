import { Test, TestingModule } from '@nestjs/testing';
import { AzureADStrategy } from './azure-ad.strategy';
import { AuthService } from '../auth.service';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

describe('AzureADStrategy', () => {
  let strategy: AzureADStrategy;
  let authService: AuthService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        AZURE_TENANT_ID: 'test-tenant-id',
        AZURE_CLIENT_ID: 'test-client-id',
      };
      return config[key];
    }),
  };

  const mockAuthService = {
    findOrCreateSSOUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AzureADStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    strategy = module.get<AzureADStrategy>(AzureADStrategy);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should validate Azure AD token payload', async () => {
      const mockPayload = {
        oid: 'azure-object-id-123',
        email: 'user@company.com',
        preferred_username: 'user@company.com',
        name: 'John Doe',
        tid: 'tenant-id-123',
        upn: 'user@company.com',
        roles: ['User'],
      };

      const mockUser = {
        id: 'user-123',
        email: 'user@company.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockAuthService.findOrCreateSSOUser.mockResolvedValue(mockUser);

      const result = await strategy.validate(mockPayload);

      expect(authService.findOrCreateSSOUser).toHaveBeenCalledWith({
        ssoProvider: 'azure',
        ssoId: 'azure-object-id-123',
        email: 'user@company.com',
        firstName: 'John',
        lastName: 'Doe',
        ssoMetadata: {
          tenantId: 'tenant-id-123',
          upn: 'user@company.com',
          roles: ['User'],
        },
      });

      expect(result).toEqual(mockUser);
    });

    it('should use preferred_username if email is not present', async () => {
      const mockPayload = {
        oid: 'azure-object-id-123',
        preferred_username: 'user@company.com',
        name: 'John Doe',
        tid: 'tenant-id-123',
      };

      const mockUser = { id: 'user-123' };
      mockAuthService.findOrCreateSSOUser.mockResolvedValue(mockUser);

      await strategy.validate(mockPayload);

      expect(authService.findOrCreateSSOUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'user@company.com',
        }),
      );
    });

    it('should throw error if no email or preferred_username', async () => {
      const mockPayload = {
        oid: 'azure-object-id-123',
        name: 'John Doe',
      };

      await expect(strategy.validate(mockPayload)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle name parsing correctly', async () => {
      const mockPayload = {
        oid: 'azure-object-id-123',
        email: 'user@company.com',
        name: 'John Michael Doe',
      };

      const mockUser = { id: 'user-123' };
      mockAuthService.findOrCreateSSOUser.mockResolvedValue(mockUser);

      await strategy.validate(mockPayload);

      expect(authService.findOrCreateSSOUser).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'John',
          lastName: 'Michael Doe',
        }),
      );
    });
  });
});
