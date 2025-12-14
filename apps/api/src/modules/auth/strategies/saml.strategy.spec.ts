import { Test, TestingModule } from '@nestjs/testing';
import { SamlStrategy } from './saml.strategy';
import { AuthService } from '../auth.service';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

describe('SamlStrategy', () => {
  let strategy: SamlStrategy;
  let authService: AuthService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        SAML_ENTRY_POINT: 'https://idp.example.com/sso',
        SAML_ISSUER: 'crypto-erp',
        SAML_CALLBACK_URL: 'http://localhost:3000/auth/sso/saml/callback',
        SAML_CERT: 'test-cert',
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
        SamlStrategy,
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

    strategy = module.get<SamlStrategy>(SamlStrategy);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should validate SAML profile with all fields', async () => {
      const mockProfile = {
        nameID: 'saml-user-123',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        displayName: 'John Doe',
        sessionIndex: 'session-123',
      } as any;

      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockAuthService.findOrCreateSSOUser.mockResolvedValue(mockUser);

      const result = await strategy.validate(mockProfile);

      expect(authService.findOrCreateSSOUser).toHaveBeenCalledWith({
        ssoProvider: 'saml',
        ssoId: 'saml-user-123',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        ssoMetadata: {
          sessionIndex: 'session-123',
          attributes: mockProfile,
        },
      });

      expect(result).toEqual(mockUser);
    });

    it('should use nameID if email is missing', async () => {
      const mockProfile = {
        nameID: 'user@example.com',
        displayName: 'John Doe',
      } as any;

      const mockUser = { id: 'user-123' };
      mockAuthService.findOrCreateSSOUser.mockResolvedValue(mockUser);

      await strategy.validate(mockProfile);

      expect(authService.findOrCreateSSOUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'user@example.com',
        }),
      );
    });

    it('should parse name from displayName if firstName/lastName missing', async () => {
      const mockProfile = {
        nameID: 'user-123',
        email: 'user@example.com',
        displayName: 'John Michael Doe',
      } as any;

      const mockUser = { id: 'user-123' };
      mockAuthService.findOrCreateSSOUser.mockResolvedValue(mockUser);

      await strategy.validate(mockProfile);

      expect(authService.findOrCreateSSOUser).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'John',
          lastName: 'Michael Doe',
        }),
      );
    });

    it('should throw error if no email or nameID', async () => {
      const mockProfile = {
        displayName: 'John Doe',
      } as any;

      await expect(strategy.validate(mockProfile)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle service errors', async () => {
      const mockProfile = {
        nameID: 'user-123',
        email: 'user@example.com',
      } as any;

      const error = new Error('Database error');
      mockAuthService.findOrCreateSSOUser.mockRejectedValue(error);

      await expect(strategy.validate(mockProfile)).rejects.toThrow(UnauthorizedException);
    });
  });
});
