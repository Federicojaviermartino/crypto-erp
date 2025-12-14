import { Test, TestingModule } from '@nestjs/testing';
import { GoogleStrategy } from './google.strategy';
import { AuthService } from '../auth.service';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy;
  let authService: AuthService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        GOOGLE_CLIENT_ID: 'test-client-id',
        GOOGLE_CLIENT_SECRET: 'test-client-secret',
        GOOGLE_CALLBACK_URL: 'http://localhost:3000/auth/sso/google/callback',
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
        GoogleStrategy,
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

    strategy = module.get<GoogleStrategy>(GoogleStrategy);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should validate and auto-provision user from Google profile', async () => {
      const mockProfile = {
        id: 'google-123',
        emails: [{ value: 'user@example.com', verified: true }],
        name: { givenName: 'John', familyName: 'Doe' },
        photos: [{ value: 'https://example.com/photo.jpg' }],
        _json: { locale: 'en' },
      };

      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockAuthService.findOrCreateSSOUser.mockResolvedValue(mockUser);

      const done = jest.fn();

      await strategy.validate('access-token', 'refresh-token', mockProfile, done);

      expect(authService.findOrCreateSSOUser).toHaveBeenCalledWith({
        ssoProvider: 'google',
        ssoId: 'google-123',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: 'https://example.com/photo.jpg',
        ssoMetadata: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          locale: 'en',
        },
      });

      expect(done).toHaveBeenCalledWith(null, mockUser);
    });

    it('should throw error if no email in profile', async () => {
      const mockProfile = {
        id: 'google-123',
        emails: [],
        name: { givenName: 'John', familyName: 'Doe' },
      };

      const done = jest.fn();

      await strategy.validate('access-token', 'refresh-token', mockProfile, done);

      expect(done).toHaveBeenCalledWith(
        expect.any(UnauthorizedException),
        false,
      );
    });

    it('should handle service errors gracefully', async () => {
      const mockProfile = {
        id: 'google-123',
        emails: [{ value: 'user@example.com' }],
        name: { givenName: 'John', familyName: 'Doe' },
      };

      const error = new Error('Database error');
      mockAuthService.findOrCreateSSOUser.mockRejectedValue(error);

      const done = jest.fn();

      await strategy.validate('access-token', 'refresh-token', mockProfile, done);

      expect(done).toHaveBeenCalledWith(error, false);
    });
  });
});
