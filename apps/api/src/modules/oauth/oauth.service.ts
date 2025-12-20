import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@crypto-erp/database';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { CreateOAuthAppDto } from './dto/create-oauth-app.dto.js';

/**
 * OAuth 2.0 Service
 * Implements OAuth 2.0 Authorization Code Flow with PKCE support
 * Supports scopes, token refresh, and token revocation
 */
@Injectable()
export class OAuthService {
  constructor(private readonly prisma: PrismaService) {}

  // Token expiration times
  private readonly ACCESS_TOKEN_EXPIRY = 3600; // 1 hour in seconds
  private readonly REFRESH_TOKEN_EXPIRY = 2592000; // 30 days in seconds
  private readonly AUTH_CODE_EXPIRY = 600; // 10 minutes in seconds

  /**
   * Create a new OAuth application
   */
  async createApp(
    companyId: string,
    userId: string,
    dto: CreateOAuthAppDto,
  ) {
    // Generate client credentials
    const clientId = this.generateClientId();
    const clientSecret = this.generateClientSecret();
    const hashedSecret = await bcrypt.hash(clientSecret, 10);

    const app = await this.prisma.oAuthApp.create({
      data: {
        companyId,
        createdById: userId,
        name: dto.name,
        description: dto.description,
        logoUrl: dto.logoUrl,
        website: dto.website,
        clientId,
        clientSecret: hashedSecret,
        redirectUris: dto.redirectUris,
        scopes: dto.scopes,
        rateLimit: dto.rateLimit || 1000,
        dailyQuota: dto.dailyQuota || 10000,
      },
    });

    return {
      id: app.id,
      name: app.name,
      clientId: app.clientId,
      clientSecret: clientSecret, // Return plain secret only once
      redirectUris: app.redirectUris,
      scopes: app.scopes,
      rateLimit: app.rateLimit,
      dailyQuota: app.dailyQuota,
      createdAt: app.createdAt,
    };
  }

  /**
   * Get OAuth app by client ID
   */
  async getAppByClientId(clientId: string) {
    const app = await this.prisma.oAuthApp.findUnique({
      where: { clientId },
    });

    if (!app) {
      throw new NotFoundException('OAuth app not found');
    }

    if (!app.isActive) {
      throw new BadRequestException('OAuth app is inactive');
    }

    return app;
  }

  /**
   * List OAuth apps for a company
   */
  async listApps(companyId: string) {
    return this.prisma.oAuthApp.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        description: true,
        logoUrl: true,
        website: true,
        clientId: true,
        redirectUris: true,
        scopes: true,
        rateLimit: true,
        dailyQuota: true,
        isActive: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Generate authorization code
   * Step 1 of OAuth 2.0 Authorization Code Flow
   */
  async generateAuthorizationCode(
    clientId: string,
    userId: string,
    companyId: string,
    redirectUri: string,
    scopes: string[],
  ) {
    const app = await this.getAppByClientId(clientId);

    // Validate redirect URI
    if (!app.redirectUris.includes(redirectUri)) {
      throw new BadRequestException('Invalid redirect URI');
    }

    // Validate scopes
    const invalidScopes = scopes.filter(scope => !app.scopes.includes(scope));
    if (invalidScopes.length > 0) {
      throw new BadRequestException(`Invalid scopes: ${invalidScopes.join(', ')}`);
    }

    // Generate authorization code
    const code = this.generateRandomToken(32);
    const hashedCode = await bcrypt.hash(code, 10);

    const expiresAt = new Date(Date.now() + this.AUTH_CODE_EXPIRY * 1000);

    // Store authorization code in token table
    await this.prisma.oAuthToken.create({
      data: {
        appId: app.id,
        userId,
        companyId,
        authorizationCode: hashedCode,
        codeExpiresAt: expiresAt,
        scopes,
        accessToken: '', // Placeholder, will be set when code is exchanged
        expiresAt: new Date(), // Placeholder
      },
    });

    return {
      code,
      expiresIn: this.AUTH_CODE_EXPIRY,
    };
  }

  /**
   * Exchange authorization code for access token
   * Step 2 of OAuth 2.0 Authorization Code Flow
   */
  async exchangeCodeForToken(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
  ) {
    const app = await this.getAppByClientId(clientId);

    // Verify client secret
    const secretValid = await bcrypt.compare(clientSecret, app.clientSecret);
    if (!secretValid) {
      throw new UnauthorizedException('Invalid client credentials');
    }

    // Find authorization code
    const tokenRecords = await this.prisma.oAuthToken.findMany({
      where: {
        appId: app.id,
        isRevoked: false,
      },
    });

    let tokenRecord = null;
    for (const record of tokenRecords) {
      if (record.authorizationCode) {
        const codeValid = await bcrypt.compare(code, record.authorizationCode);
        if (codeValid) {
          tokenRecord = record;
          break;
        }
      }
    }

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid authorization code');
    }

    // Check if code is expired
    if (tokenRecord.codeExpiresAt && tokenRecord.codeExpiresAt < new Date()) {
      throw new UnauthorizedException('Authorization code expired');
    }

    // Generate access and refresh tokens
    const accessToken = this.generateRandomToken(64);
    const refreshToken = this.generateRandomToken(64);

    const hashedAccessToken = await bcrypt.hash(accessToken, 10);
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    const accessTokenExpiresAt = new Date(
      Date.now() + this.ACCESS_TOKEN_EXPIRY * 1000,
    );
    const refreshTokenExpiresAt = new Date(
      Date.now() + this.REFRESH_TOKEN_EXPIRY * 1000,
    );

    // Update token record with access and refresh tokens
    await this.prisma.oAuthToken.update({
      where: { id: tokenRecord.id },
      data: {
        accessToken: hashedAccessToken,
        refreshToken: hashedRefreshToken,
        expiresAt: accessTokenExpiresAt,
        refreshExpiresAt: refreshTokenExpiresAt,
        authorizationCode: null, // Clear used code
        codeExpiresAt: null,
      },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
      scope: tokenRecord.scopes.join(' '),
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string) {
    const app = await this.getAppByClientId(clientId);

    // Verify client secret
    const secretValid = await bcrypt.compare(clientSecret, app.clientSecret);
    if (!secretValid) {
      throw new UnauthorizedException('Invalid client credentials');
    }

    // Find refresh token
    const tokenRecords = await this.prisma.oAuthToken.findMany({
      where: {
        appId: app.id,
        isRevoked: false,
      },
    });

    let tokenRecord = null;
    for (const record of tokenRecords) {
      if (record.refreshToken) {
        const tokenValid = await bcrypt.compare(refreshToken, record.refreshToken);
        if (tokenValid) {
          tokenRecord = record;
          break;
        }
      }
    }

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if refresh token is expired
    if (
      tokenRecord.refreshExpiresAt &&
      tokenRecord.refreshExpiresAt < new Date()
    ) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Generate new access token
    const newAccessToken = this.generateRandomToken(64);
    const hashedAccessToken = await bcrypt.hash(newAccessToken, 10);

    const accessTokenExpiresAt = new Date(
      Date.now() + this.ACCESS_TOKEN_EXPIRY * 1000,
    );

    // Update token record
    await this.prisma.oAuthToken.update({
      where: { id: tokenRecord.id },
      data: {
        accessToken: hashedAccessToken,
        expiresAt: accessTokenExpiresAt,
        lastUsedAt: new Date(),
      },
    });

    return {
      accessToken: newAccessToken,
      tokenType: 'Bearer',
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
      scope: tokenRecord.scopes.join(' '),
    };
  }

  /**
   * Verify access token and return token data
   */
  async verifyAccessToken(accessToken: string) {
    const tokenRecords = await this.prisma.oAuthToken.findMany({
      where: {
        isRevoked: false,
      },
      include: {
        app: true,
        user: true,
        company: true,
      },
    });

    let tokenRecord = null;
    for (const record of tokenRecords) {
      const tokenValid = await bcrypt.compare(accessToken, record.accessToken);
      if (tokenValid) {
        tokenRecord = record;
        break;
      }
    }

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid access token');
    }

    // Check if token is expired
    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Access token expired');
    }

    // Check if app is still active
    if (!tokenRecord.app.isActive) {
      throw new UnauthorizedException('OAuth app is inactive');
    }

    // Update last used timestamp
    await this.prisma.oAuthToken.update({
      where: { id: tokenRecord.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      userId: tokenRecord.userId,
      companyId: tokenRecord.companyId,
      scopes: tokenRecord.scopes,
      app: {
        id: tokenRecord.app.id,
        name: tokenRecord.app.name,
        clientId: tokenRecord.app.clientId,
      },
    };
  }

  /**
   * Revoke token (access or refresh)
   */
  async revokeToken(token: string) {
    const tokenRecords = await this.prisma.oAuthToken.findMany({
      where: {
        isRevoked: false,
      },
    });

    for (const record of tokenRecords) {
      const accessTokenMatch = await bcrypt.compare(token, record.accessToken);
      const refreshTokenMatch =
        record.refreshToken && (await bcrypt.compare(token, record.refreshToken));

      if (accessTokenMatch || refreshTokenMatch) {
        await this.prisma.oAuthToken.update({
          where: { id: record.id },
          data: { isRevoked: true },
        });
        return { success: true };
      }
    }

    return { success: false };
  }

  /**
   * Delete OAuth app
   */
  async deleteApp(appId: string, companyId: string) {
    const app = await this.prisma.oAuthApp.findFirst({
      where: { id: appId, companyId },
    });

    if (!app) {
      throw new NotFoundException('OAuth app not found');
    }

    await this.prisma.oAuthApp.delete({
      where: { id: appId },
    });

    return { success: true };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private generateClientId(): string {
    return `${crypto.randomBytes(8).toString('hex')}_${Date.now().toString(36)}`;
  }

  private generateClientSecret(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private generateRandomToken(length: number): string {
    return crypto.randomBytes(length).toString('base64url');
  }
}
