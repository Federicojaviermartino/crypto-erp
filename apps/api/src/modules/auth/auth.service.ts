import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@crypto-erp/database';
import { RegisterDto, LoginDto, TokenResponseDto } from './dto/index.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<TokenResponseDto> {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    return this.generateTokens(user);
  }

  async login(dto: LoginDto): Promise<TokenResponseDto> {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Get full user to check 2FA status
    const fullUser = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });

    // Check if 2FA is enabled
    if (fullUser.twoFactorEnabled) {
      if (!dto.twoFactorToken) {
        throw new UnauthorizedException({
          code: 'TWO_FACTOR_REQUIRED',
          message: '2FA token required',
        });
      }

      // Verify 2FA token using dynamic import to avoid circular dependency
      const { TwoFactorService } = await import('./services/two-factor.service.js');
      const twoFactorService = new TwoFactorService(this.prisma, this.configService);
      const isValid2FA = await twoFactorService.verifyUserToken(
        fullUser.id,
        dto.twoFactorToken,
      );

      if (!isValid2FA) {
        throw new UnauthorizedException('Invalid 2FA token');
      }
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.generateTokensWithCompanies(fullUser.id, dto.rememberMe);
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<{ id: string; email: string } | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    return { id: user.id, email: user.email };
  }

  async refreshTokens(refreshToken: string): Promise<TokenResponseDto> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        createdAt: true,
        companyUsers: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                taxId: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      ...user,
      companies: user.companyUsers.map((cu) => ({
        ...cu.company,
        role: cu.role,
        isDefault: cu.isDefault,
      })),
      companyUsers: undefined,
    };
  }

  async findOrCreateSSOUser(ssoData: {
    ssoProvider: string;
    ssoId: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    ssoMetadata?: any;
  }) {
    // Try to find existing SSO user
    let user = await this.prisma.user.findUnique({
      where: {
        ssoProvider_ssoId: {
          ssoProvider: ssoData.ssoProvider,
          ssoId: ssoData.ssoId,
        },
      },
    });

    if (!user) {
      // Check if email already exists (link existing account)
      const existingEmailUser = await this.prisma.user.findUnique({
        where: { email: ssoData.email.toLowerCase() },
      });

      if (existingEmailUser) {
        // Link SSO to existing account
        user = await this.prisma.user.update({
          where: { id: existingEmailUser.id },
          data: {
            ssoProvider: ssoData.ssoProvider,
            ssoId: ssoData.ssoId,
            ssoMetadata: ssoData.ssoMetadata || {},
            avatarUrl: ssoData.avatarUrl || existingEmailUser.avatarUrl,
          },
        });
      } else {
        // Create new user (auto-provisioning)
        user = await this.prisma.user.create({
          data: {
            email: ssoData.email.toLowerCase(),
            passwordHash: '', // No password for SSO users
            firstName: ssoData.firstName,
            lastName: ssoData.lastName,
            avatarUrl: ssoData.avatarUrl,
            ssoProvider: ssoData.ssoProvider,
            ssoId: ssoData.ssoId,
            ssoMetadata: ssoData.ssoMetadata || {},
            isActive: true,
          },
        });
      }
    } else {
      // Update last login and metadata
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          ssoMetadata: ssoData.ssoMetadata || user.ssoMetadata,
        },
      });
    }

    return user;
  }

  getSamlMetadata(): string {
    const issuer = this.configService.get<string>('SAML_ISSUER');
    const callbackUrl = this.configService.get<string>('SAML_CALLBACK_URL');

    return `<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${issuer}">
  <SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <AssertionConsumerService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${callbackUrl}"
      index="1"/>
  </SPSSODescriptor>
</EntityDescriptor>`;
  }

  async generateTokensWithCompanies(userId: string, rememberMe?: boolean): Promise<TokenResponseDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        companyUsers: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                taxId: true,
              },
            },
          },
        },
      },
    });

    const payload: JwtPayload = { sub: user.id, email: user.email };

    // Adjust token expiration based on rememberMe
    const accessExpiresIn = rememberMe ? '7d' : (this.configService.get<string>('jwt.accessExpiresIn') || '15m');
    const refreshExpiresIn = rememberMe ? '30d' : (this.configService.get<string>('jwt.refreshExpiresIn') || '7d');

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: accessExpiresIn,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: refreshExpiresIn,
    });

    const companies = user.companyUsers.map((cu) => ({
      id: cu.company.id,
      name: cu.company.name,
      taxId: cu.company.taxId,
      role: cu.role,
      isDefault: cu.isDefault,
    }));

    // Calculate expiresIn in seconds
    const expiresIn = rememberMe ? 7 * 24 * 60 * 60 : 900; // 7 days or 15 minutes

    return {
      accessToken,
      refreshToken,
      expiresIn,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        companies,
      },
    };
  }

  generateTokens(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  }): TokenResponseDto {
    const payload: JwtPayload = { sub: user.id, email: user.email };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: this.configService.get<string>('jwt.accessExpiresIn') || '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.configService.get<string>('jwt.refreshExpiresIn') || '7d',
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }
}
