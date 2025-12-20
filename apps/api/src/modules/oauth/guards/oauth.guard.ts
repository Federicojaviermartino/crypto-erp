import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OAuthService } from '../oauth.service.js';

export const OAUTH_SCOPES_KEY = 'oauth_scopes';

/**
 * Decorator to require specific OAuth scopes
 * @example @RequireScopes('read:invoices', 'write:invoices')
 */
export const RequireScopes = (...scopes: string[]) =>
  SetMetadata(OAUTH_SCOPES_KEY, scopes);

/**
 * OAuth Guard
 * Validates OAuth access tokens and checks required scopes
 *
 * Usage:
 * @UseGuards(OAuthGuard)
 * @RequireScopes('read:invoices')
 * async getInvoices() { ... }
 */
@Injectable()
export class OAuthGuard implements CanActivate {
  constructor(
    private readonly oauthService: OAuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Extract access token from Authorization header
    const authHeader = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify access token
    let tokenData;
    try {
      tokenData = await this.oauthService.verifyAccessToken(accessToken);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    // Get required scopes from decorator
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(
      OAUTH_SCOPES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Check if token has required scopes
    if (requiredScopes && requiredScopes.length > 0) {
      const hasAllScopes = requiredScopes.every(scope =>
        tokenData.scopes.includes(scope),
      );

      if (!hasAllScopes) {
        throw new UnauthorizedException(
          `Insufficient scopes. Required: ${requiredScopes.join(', ')}`,
        );
      }
    }

    // Attach token data to request for use in controllers
    request.oauth = {
      userId: tokenData.userId,
      companyId: tokenData.companyId,
      scopes: tokenData.scopes,
      app: tokenData.app,
    };

    // Also set X-Company-Id header for compatibility with existing endpoints
    request.headers['x-company-id'] = tokenData.companyId;

    return true;
  }
}
