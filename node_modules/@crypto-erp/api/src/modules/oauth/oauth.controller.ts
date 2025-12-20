import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  BadRequestException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { OAuthService } from './oauth.service.js';
import { CreateOAuthAppDto } from './dto/create-oauth-app.dto.js';
import { AuthorizeDto, TokenDto, RevokeTokenDto } from './dto/authorize.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { Request } from 'express';

/**
 * OAuth 2.0 Controller
 * Implements OAuth 2.0 Authorization Code Flow endpoints
 *
 * Flow:
 * 1. POST /oauth/apps - Create OAuth app (get client_id and client_secret)
 * 2. GET /oauth/authorize - User authorizes app (returns authorization code)
 * 3. POST /oauth/token - Exchange code for access token
 * 4. Use access token in Authorization: Bearer <token> header
 * 5. POST /oauth/token (grant_type=refresh_token) - Refresh access token
 * 6. POST /oauth/revoke - Revoke token
 */
@Controller('oauth')
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  private getCompanyId(headers: Record<string, string>): string {
    const companyId = headers['x-company-id'];
    if (!companyId) {
      throw new BadRequestException('X-Company-Id header is required');
    }
    return companyId;
  }

  private getUserId(req: any): string {
    return req.user?.userId;
  }

  // ============================================================================
  // OAuth App Management
  // ============================================================================

  /**
   * Create a new OAuth application
   * POST /oauth/apps
   */
  @Post('apps')
  @UseGuards(JwtAuthGuard)
  async createApp(
    @Headers() headers: Record<string, string>,
    @Req() req: Request,
    @Body() dto: CreateOAuthAppDto,
  ) {
    const companyId = this.getCompanyId(headers);
    const userId = this.getUserId(req);

    return this.oauthService.createApp(companyId, userId, dto);
  }

  /**
   * List OAuth applications for company
   * GET /oauth/apps
   */
  @Get('apps')
  @UseGuards(JwtAuthGuard)
  async listApps(@Headers() headers: Record<string, string>) {
    const companyId = this.getCompanyId(headers);
    return this.oauthService.listApps(companyId);
  }

  /**
   * Delete OAuth application
   * DELETE /oauth/apps/:id
   */
  @Delete('apps/:id')
  @UseGuards(JwtAuthGuard)
  async deleteApp(
    @Headers() headers: Record<string, string>,
    @Param('id') appId: string,
  ) {
    const companyId = this.getCompanyId(headers);
    return this.oauthService.deleteApp(appId, companyId);
  }

  // ============================================================================
  // OAuth 2.0 Authorization Flow
  // ============================================================================

  /**
   * OAuth 2.0 Authorization Endpoint
   * GET /oauth/authorize?client_id=...&redirect_uri=...&response_type=code&scope=...&state=...
   *
   * User authorizes the application and receives authorization code
   *
   * Example:
   * GET /oauth/authorize?client_id=abc123&redirect_uri=https://app.com/callback&response_type=code&scope=read:invoices write:invoices&state=xyz
   *
   * Response: Redirect to https://app.com/callback?code=AUTH_CODE&state=xyz
   */
  @Get('authorize')
  @UseGuards(JwtAuthGuard)
  async authorize(
    @Headers() headers: Record<string, string>,
    @Req() req: Request,
    @Query('client_id') clientId: string,
    @Query('redirect_uri') redirectUri: string,
    @Query('response_type') responseType: string,
    @Query('scope') scopeStr: string,
    @Query('state') state?: string,
  ) {
    if (responseType !== 'code') {
      throw new BadRequestException('Only response_type=code is supported');
    }

    const companyId = this.getCompanyId(headers);
    const userId = this.getUserId(req);
    const scopes = scopeStr.split(' ').filter(s => s.length > 0);

    const result = await this.oauthService.generateAuthorizationCode(
      clientId,
      userId,
      companyId,
      redirectUri,
      scopes,
    );

    // Return authorization code and redirect URL
    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set('code', result.code);
    if (state) {
      redirectUrl.searchParams.set('state', state);
    }

    return {
      code: result.code,
      redirectUri: redirectUrl.toString(),
      expiresIn: result.expiresIn,
    };
  }

  /**
   * OAuth 2.0 Token Endpoint
   * POST /oauth/token
   *
   * Exchange authorization code for access token or refresh access token
   *
   * Example (authorization code):
   * POST /oauth/token
   * Body: {
   *   "grant_type": "authorization_code",
   *   "code": "AUTH_CODE",
   *   "client_id": "abc123",
   *   "client_secret": "secret",
   *   "redirect_uri": "https://app.com/callback"
   * }
   *
   * Example (refresh token):
   * POST /oauth/token
   * Body: {
   *   "grant_type": "refresh_token",
   *   "refresh_token": "REFRESH_TOKEN",
   *   "client_id": "abc123",
   *   "client_secret": "secret"
   * }
   *
   * Response: {
   *   "access_token": "ACCESS_TOKEN",
   *   "refresh_token": "REFRESH_TOKEN",
   *   "token_type": "Bearer",
   *   "expires_in": 3600,
   *   "scope": "read:invoices write:invoices"
   * }
   */
  @Post('token')
  async token(@Body() dto: TokenDto) {
    if (dto.grantType === 'authorization_code') {
      if (!dto.code || !dto.redirectUri) {
        throw new BadRequestException(
          'code and redirect_uri are required for authorization_code grant',
        );
      }

      return this.oauthService.exchangeCodeForToken(
        dto.code,
        dto.clientId,
        dto.clientSecret,
        dto.redirectUri,
      );
    } else if (dto.grantType === 'refresh_token') {
      if (!dto.refreshToken) {
        throw new BadRequestException(
          'refresh_token is required for refresh_token grant',
        );
      }

      return this.oauthService.refreshAccessToken(
        dto.refreshToken,
        dto.clientId,
        dto.clientSecret,
      );
    } else {
      throw new BadRequestException(
        'grant_type must be authorization_code or refresh_token',
      );
    }
  }

  /**
   * OAuth 2.0 Token Revocation Endpoint
   * POST /oauth/revoke
   *
   * Revoke an access or refresh token
   *
   * Example:
   * POST /oauth/revoke
   * Body: {
   *   "token": "ACCESS_TOKEN",
   *   "token_type_hint": "access_token"
   * }
   */
  @Post('revoke')
  async revoke(@Body() dto: RevokeTokenDto) {
    return this.oauthService.revokeToken(dto.token);
  }

  /**
   * OAuth 2.0 Token Introspection Endpoint
   * POST /oauth/introspect
   *
   * Get information about a token (for debugging)
   *
   * Example:
   * POST /oauth/introspect
   * Body: { "token": "ACCESS_TOKEN" }
   *
   * Response: {
   *   "active": true,
   *   "scope": "read:invoices write:invoices",
   *   "client_id": "abc123",
   *   "user_id": "user-uuid",
   *   "company_id": "company-uuid"
   * }
   */
  @Post('introspect')
  async introspect(@Body('token') token: string) {
    try {
      const tokenData = await this.oauthService.verifyAccessToken(token);
      return {
        active: true,
        scope: tokenData.scopes.join(' '),
        clientId: tokenData.app.clientId,
        userId: tokenData.userId,
        companyId: tokenData.companyId,
      };
    } catch (error) {
      return {
        active: false,
      };
    }
  }
}
