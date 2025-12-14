import { Test, TestingModule } from '@nestjs/testing';
import { SsoController } from './sso.controller';
import { AuthService } from '../auth.service';
import { ConfigService } from '@nestjs/config';

describe('SsoController', () => {
  let controller: SsoController;
  let authService: AuthService;
  let configService: ConfigService;

  const mockAuthService = {
    generateTokens: jest.fn(),
    getSamlMetadata: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'WEB_URL') return 'http://localhost:4200';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SsoController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<SsoController>(SsoController);
    authService = module.get<AuthService>(AuthService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('googleCallback', () => {
    it('should redirect to frontend with tokens', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockTokens = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        expiresIn: 900,
        user: mockUser,
      };

      const req = { user: mockUser } as any;
      const res = { redirect: jest.fn() } as any;

      mockAuthService.generateTokens.mockResolvedValue(mockTokens);

      await controller.googleCallback(req, res);

      expect(authService.generateTokens).toHaveBeenCalledWith(mockUser);
      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:4200/auth/callback?token=access-token-123&refreshToken=refresh-token-123',
      );
    });
  });

  describe('azureCallback', () => {
    it('should redirect to frontend with tokens', async () => {
      const mockUser = { id: 'user-123' };
      const mockTokens = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
      };

      const req = { user: mockUser } as any;
      const res = { redirect: jest.fn() } as any;

      mockAuthService.generateTokens.mockResolvedValue(mockTokens);

      await controller.azureCallback(req, res);

      expect(authService.generateTokens).toHaveBeenCalledWith(mockUser);
      expect(res.redirect).toHaveBeenCalled();
    });
  });

  describe('samlCallback', () => {
    it('should redirect to frontend with tokens', async () => {
      const mockUser = { id: 'user-123' };
      const mockTokens = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
      };

      const req = { user: mockUser } as any;
      const res = { redirect: jest.fn() } as any;

      mockAuthService.generateTokens.mockResolvedValue(mockTokens);

      await controller.samlCallback(req, res);

      expect(authService.generateTokens).toHaveBeenCalledWith(mockUser);
      expect(res.redirect).toHaveBeenCalled();
    });
  });

  describe('samlMetadata', () => {
    it('should return SAML metadata XML', async () => {
      const mockMetadata = '<?xml version="1.0"?><EntityDescriptor>...</EntityDescriptor>';
      const res = {
        type: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as any;

      mockAuthService.getSamlMetadata.mockReturnValue(mockMetadata);

      await controller.samlMetadata(res);

      expect(authService.getSamlMetadata).toHaveBeenCalled();
      expect(res.type).toHaveBeenCalledWith('application/xml');
      expect(res.send).toHaveBeenCalledWith(mockMetadata);
    });
  });
});
