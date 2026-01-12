import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Headers,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { BaseIntegrationService } from './base/base-integration.service.js';
import { QuickBooksService } from './quickbooks/quickbooks.service.js';
import { XeroService } from './xero/xero.service.js';

/**
 * Allowed redirect URI domains to prevent open redirect attacks.
 * Add production domains here when deploying.
 */
const ALLOWED_REDIRECT_DOMAINS = [
  'localhost:4200',
  'localhost:5200',
  'localhost:3000',
  '127.0.0.1:4200',
  '127.0.0.1:5200',
];

/**
 * Validates that a redirect URI is from an allowed domain
 */
function isValidRedirectUri(uri: string, allowedDomains: string[]): boolean {
  try {
    const url = new URL(uri);
    // Only allow https in production (http ok for localhost)
    const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (!isLocalhost && url.protocol !== 'https:') {
      return false;
    }
    // Check if host matches allowed domains
    return allowedDomains.some(
      domain => url.host === domain || url.host.endsWith(`.${domain.split(':')[0]}`)
    );
  } catch {
    return false;
  }
}

/**
 * Integrations Controller
 * Manages third-party integrations (QuickBooks, Xero, HubSpot, Salesforce, etc.)
 *
 * Flow:
 * 1. GET /integrations/:provider/connect - Get OAuth URL
 * 2. User authorizes on provider's site
 * 3. Provider redirects to callback with code
 * 4. POST /integrations/:provider/callback - Exchange code for token
 * 5. GET /integrations - List all connected integrations
 * 6. POST /integrations/:id/sync - Trigger manual sync
 * 7. DELETE /integrations/:id - Disconnect integration
 */
@Controller('integrations')
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
  private allowedRedirectDomains: string[];

  constructor(
    private readonly baseService: BaseIntegrationService,
    private readonly quickbooksService: QuickBooksService,
    private readonly xeroService: XeroService,
    private readonly configService: ConfigService,
  ) {
    // Build allowed domains list from env or use defaults
    const envDomains = this.configService.get<string>('ALLOWED_REDIRECT_DOMAINS');
    if (envDomains) {
      this.allowedRedirectDomains = [...ALLOWED_REDIRECT_DOMAINS, ...envDomains.split(',').map(d => d.trim())];
    } else {
      this.allowedRedirectDomains = [...ALLOWED_REDIRECT_DOMAINS];
    }
    // Add frontend URL from config
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    if (frontendUrl) {
      try {
        const url = new URL(frontendUrl);
        this.allowedRedirectDomains.push(url.host);
      } catch { /* ignore invalid URL */ }
    }
  }

  private getCompanyId(headers: Record<string, string>): string {
    const companyId = headers['x-company-id'];
    if (!companyId) {
      throw new BadRequestException('X-Company-Id header is required');
    }
    return companyId;
  }

  /**
   * Validates redirect URI to prevent open redirect attacks
   */
  private validateRedirectUri(redirectUri: string): void {
    if (!isValidRedirectUri(redirectUri, this.allowedRedirectDomains)) {
      throw new BadRequestException(
        'Invalid redirect URI. Must be from an allowed domain.'
      );
    }
  }

  /**
   * List all integrations for company
   * GET /integrations
   */
  @Get()
  async listIntegrations(@Headers() headers: Record<string, string>) {
    const companyId = this.getCompanyId(headers);
    return this.baseService.listIntegrations(companyId);
  }

  /**
   * Get OAuth authorization URL for a provider
   * GET /integrations/:provider/connect?redirectUri=...
   *
   * Example:
   * GET /integrations/quickbooks/connect?redirectUri=https://app.crypto-erp.com/integrations/callback
   *
   * Response:
   * {
   *   "authorizationUrl": "https://appcenter.intuit.com/connect/oauth2?...",
   *   "state": "random_state_token"
   * }
   */
  @Get(':provider/connect')
  async getAuthorizationUrl(
    @Headers() headers: Record<string, string>,
    @Param('provider') provider: string,
    @Query('redirectUri') redirectUri?: string,
  ) {
    const companyId = this.getCompanyId(headers);

    if (!redirectUri) {
      throw new BadRequestException('redirectUri query parameter is required');
    }

    // Validate redirect URI to prevent open redirect attacks
    this.validateRedirectUri(redirectUri);

    // Generate random state for CSRF protection
    const state = `${companyId}:${Math.random().toString(36).substring(7)}`;

    let authorizationUrl: string;

    switch (provider) {
      case 'quickbooks':
        authorizationUrl = this.quickbooksService.getAuthorizationUrl(
          companyId,
          redirectUri,
          state,
        );
        break;
      case 'xero':
        authorizationUrl = this.xeroService.getAuthorizationUrl(
          companyId,
          redirectUri,
          state,
        );
        break;
      default:
        throw new BadRequestException(`Provider ${provider} is not supported`);
    }

    return {
      authorizationUrl,
      state,
    };
  }

  /**
   * Handle OAuth callback and exchange code for token
   * POST /integrations/:provider/callback
   *
   * Body:
   * {
   *   "code": "AUTH_CODE",
   *   "redirectUri": "https://app.crypto-erp.com/integrations/callback",
   *   "state": "company_id:random"
   * }
   *
   * Response:
   * {
   *   "success": true,
   *   "integration": { ... }
   * }
   */
  @Post(':provider/callback')
  async handleCallback(
    @Headers() headers: Record<string, string>,
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('redirectUri') redirectUri: string,
    @Query('state') state?: string,
  ) {
    const companyId = this.getCompanyId(headers);

    if (!code || !redirectUri) {
      throw new BadRequestException('code and redirectUri are required');
    }

    // Validate redirect URI to prevent open redirect attacks
    this.validateRedirectUri(redirectUri);

    // Verify state contains companyId (CSRF protection)
    if (state && !state.startsWith(companyId)) {
      throw new BadRequestException('Invalid state parameter');
    }

    let providerService;
    let name: string;

    switch (provider) {
      case 'quickbooks':
        providerService = this.quickbooksService;
        name = 'QuickBooks Online';
        break;
      case 'xero':
        providerService = this.xeroService;
        name = 'Xero Accounting';
        break;
      default:
        throw new BadRequestException(`Provider ${provider} is not supported`);
    }

    // Exchange code for access token
    const tokenResponse = await providerService.exchangeCodeForToken(code, redirectUri);

    // Save integration to database
    const integration = await this.baseService.saveIntegration({
      companyId,
      provider,
      name,
      accessToken: tokenResponse.accessToken,
      refreshToken: tokenResponse.refreshToken,
      expiresIn: tokenResponse.expiresIn,
      metadata: tokenResponse.metadata,
    });

    return {
      success: true,
      integration: {
        id: integration.id,
        provider: integration.provider,
        name: integration.name,
        createdAt: integration.createdAt,
      },
    };
  }

  /**
   * Trigger manual sync for an integration
   * POST /integrations/:id/sync
   */
  @Post(':id/sync')
  async syncIntegration(
    @Headers() headers: Record<string, string>,
    @Param('id') integrationId: string,
  ) {
    const companyId = this.getCompanyId(headers);

    // Get integration
    const integration = await this.baseService.prisma.integration.findFirst({
      where: {
        id: integrationId,
        companyId,
      },
    });

    if (!integration) {
      throw new BadRequestException('Integration not found');
    }

    // Get decrypted access token
    const accessToken = this.baseService.getDecryptedAccessToken(integration);
    if (!accessToken) {
      throw new BadRequestException('Integration has no valid access token');
    }

    // Get provider service
    let providerService;

    switch (integration.provider) {
      case 'quickbooks':
        providerService = this.quickbooksService;
        break;
      case 'xero':
        providerService = this.xeroService;
        break;
      default:
        throw new BadRequestException(`Provider ${integration.provider} is not supported`);
    }

    // Trigger sync
    const result = await providerService.syncData(integrationId, accessToken);

    return {
      success: result.success,
      itemsSynced: result.itemsSynced,
      errors: result.errors,
    };
  }

  /**
   * Disconnect an integration
   * DELETE /integrations/:id
   */
  @Delete(':id')
  async disconnectIntegration(
    @Headers() headers: Record<string, string>,
    @Param('id') integrationId: string,
  ) {
    const companyId = this.getCompanyId(headers);

    await this.baseService.disconnectIntegration(integrationId, companyId);

    return {
      success: true,
      message: 'Integration disconnected successfully',
    };
  }
}
