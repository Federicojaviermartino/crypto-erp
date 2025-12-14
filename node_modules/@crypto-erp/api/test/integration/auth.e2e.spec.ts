import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { PrismaService } from '@crypto-erp/database';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prismaService: jest.Mocked<PrismaService>;
  let jwtService: JwtService;

  const mockUser = {
    id: 'user-uuid-1234',
    email: 'test@example.com',
    password: '$2b$10$hashedpassword', // Bcrypt hash
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
    companies: [
      {
        company: {
          id: 'company-uuid-1',
          name: 'Test Company',
          taxId: 'B12345678',
        },
        role: 'OWNER',
      },
    ],
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    company: {
      create: jest.fn(),
    },
    companyUser: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
          load: [() => ({
            JWT_SECRET: 'test-secret-key-for-testing-purposes-only',
            JWT_EXPIRES_IN: '15m',
            JWT_REFRESH_EXPIRES_IN: '7d',
          })],
        }),
        AuthModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prismaService = moduleFixture.get(PrismaService);
    jwtService = moduleFixture.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        password: 'StrongPass123!',
        name: 'New User',
        companyName: 'New Company',
        companyTaxId: 'A98765432',
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          user: {
            create: jest.fn().mockResolvedValue({
              id: 'new-user-id',
              email: registerDto.email,
              name: registerDto.name,
            }),
          },
          company: {
            create: jest.fn().mockResolvedValue({
              id: 'new-company-id',
              name: registerDto.companyName,
              taxId: registerDto.companyTaxId,
            }),
          },
          companyUser: {
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should fail with duplicate email', async () => {
      const registerDto = {
        email: 'existing@example.com',
        password: 'StrongPass123!',
        name: 'Test User',
        companyName: 'Test Company',
        companyTaxId: 'B12345678',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });

    it('should fail with invalid email format', async () => {
      const registerDto = {
        email: 'invalid-email',
        password: 'StrongPass123!',
        name: 'Test User',
        companyName: 'Test Company',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(400);
    });

    it('should fail with weak password', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: '123', // Too short
        name: 'Test User',
        companyName: 'Test Company',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('ValidPassword123!', 10);

      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      });

      const loginDto = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(201); // NestJS returns 201 for POST by default

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user).toBeDefined();
    });

    it('should fail with invalid email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'ValidPassword123!',
      };

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);
    });

    it('should fail with invalid password', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('CorrectPassword123!', 10);

      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      });

      const loginDto = {
        email: 'test@example.com',
        password: 'WrongPassword123!',
      };

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens successfully', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('ValidPassword123!', 10);

      // First login to get a valid refresh token
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'ValidPassword123!' });

      const { refreshToken } = loginResponse.body;

      // Now refresh
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should fail with invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    it('should return user profile with valid token', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('ValidPassword123!', 10);

      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      });

      // Login first
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'ValidPassword123!' });

      const { accessToken } = loginResponse.body;

      // Get profile
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('companies');
    });

    it('should fail without token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });

    it('should fail with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should fail with expired token', async () => {
      // Create an expired token
      const expiredToken = jwtService.sign(
        { sub: 'user-id', email: 'test@example.com', companyId: 'company-id' },
        { expiresIn: '-1h' }, // Expired 1 hour ago
      );

      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });
});
