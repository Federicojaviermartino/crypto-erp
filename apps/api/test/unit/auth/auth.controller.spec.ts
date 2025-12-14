import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../../src/modules/auth/auth.controller.js';
import { AuthService } from '../../../src/modules/auth/auth.service.js';

/**
 * CRITICAL TESTS: Auth Controller
 * Endpoints de autenticación y autorización
 *
 * Tests críticos para seguridad:
 * - Registro de usuarios
 * - Login con credenciales
 * - Refresh de tokens JWT
 * - Obtención de perfil autenticado
 */

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockTokenResponse = {
    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    refreshToken: 'refresh_token_123',
    expiresIn: 3600,
    user: {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
    },
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date(),
    companies: [
      {
        id: 'company-1',
        name: 'Test Company',
        role: 'OWNER',
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refreshTokens: jest.fn(),
            getMe: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should register a new user and return tokens', async () => {
      // Arrange
      const registerDto = {
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
        name: 'New User',
      };

      jest.spyOn(authService, 'register').mockResolvedValue(mockTokenResponse);

      // Act
      const result = await controller.register(registerDto);

      // Assert
      expect(result).toEqual(mockTokenResponse);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
    });

    it('should call authService.register with correct data', async () => {
      // Arrange
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      jest.spyOn(authService, 'register').mockResolvedValue(mockTokenResponse);

      // Act
      await controller.register(registerDto);

      // Assert
      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(authService.register).toHaveBeenCalledTimes(1);
    });
  });

  describe('login', () => {
    it('should login with valid credentials and return tokens', async () => {
      // Arrange
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      jest.spyOn(authService, 'login').mockResolvedValue(mockTokenResponse);

      // Act
      const result = await controller.login(loginDto);

      // Assert
      expect(result).toEqual(mockTokenResponse);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should call authService.login with credentials', async () => {
      // Arrange
      const loginDto = {
        email: 'user@test.com',
        password: 'securepass',
      };

      jest.spyOn(authService, 'login').mockResolvedValue(mockTokenResponse);

      // Act
      await controller.login(loginDto);

      // Assert
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      // Arrange
      const refreshDto = {
        refreshToken: 'valid_refresh_token_123',
      };

      const newTokenResponse = {
        ...mockTokenResponse,
        accessToken: 'new_access_token',
      };

      jest.spyOn(authService, 'refreshTokens').mockResolvedValue(newTokenResponse);

      // Act
      const result = await controller.refresh(refreshDto);

      // Assert
      expect(result).toEqual(newTokenResponse);
      expect(authService.refreshTokens).toHaveBeenCalledWith(refreshDto.refreshToken);
      expect(result.accessToken).toBe('new_access_token');
    });

    it('should call authService.refreshTokens with token', async () => {
      // Arrange
      const refreshDto = {
        refreshToken: 'refresh_token_abc',
      };

      jest.spyOn(authService, 'refreshTokens').mockResolvedValue(mockTokenResponse);

      // Act
      await controller.refresh(refreshDto);

      // Assert
      expect(authService.refreshTokens).toHaveBeenCalledWith('refresh_token_abc');
    });
  });

  describe('me', () => {
    it('should return current user profile', async () => {
      // Arrange
      const jwtPayload = {
        sub: 'user-1',
        email: 'test@example.com',
      };

      jest.spyOn(authService, 'getMe').mockResolvedValue(mockUser as any);

      // Act
      const result = await controller.me(jwtPayload);

      // Assert
      expect(result).toEqual(mockUser);
      expect(authService.getMe).toHaveBeenCalledWith('user-1');
      expect(result.id).toBe('user-1');
      expect(result.email).toBe('test@example.com');
      expect(result.companies).toHaveLength(1);
    });

    it('should call authService.getMe with user ID from JWT', async () => {
      // Arrange
      const jwtPayload = {
        sub: 'user-123',
        email: 'user@test.com',
      };

      jest.spyOn(authService, 'getMe').mockResolvedValue(mockUser as any);

      // Act
      await controller.me(jwtPayload);

      // Assert
      expect(authService.getMe).toHaveBeenCalledWith('user-123');
    });

    it('should include user companies in response', async () => {
      // Arrange
      const jwtPayload = {
        sub: 'user-1',
        email: 'test@example.com',
      };

      jest.spyOn(authService, 'getMe').mockResolvedValue(mockUser as any);

      // Act
      const result = await controller.me(jwtPayload);

      // Assert
      expect(result.companies).toBeDefined();
      expect(result.companies).toHaveLength(1);
      expect(result.companies[0].id).toBe('company-1');
      expect(result.companies[0].role).toBe('OWNER');
    });
  });

  describe('Controller instantiation', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have authService injected', () => {
      expect(authService).toBeDefined();
    });
  });
});
