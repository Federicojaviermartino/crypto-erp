/**
 * Base Integration Interface
 * All integration providers must implement this interface
 */

export interface IntegrationProvider {
  /**
   * Provider identifier (quickbooks, xero, hubspot, etc.)
   */
  readonly provider: string;

  /**
   * Get OAuth authorization URL
   */
  getAuthorizationUrl(companyId: string, redirectUri: string, state: string): string;

  /**
   * Exchange authorization code for access token
   */
  exchangeCodeForToken(code: string, redirectUri: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    metadata?: Record<string, any>;
  }>;

  /**
   * Refresh access token using refresh token
   */
  refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
  }>;

  /**
   * Test connection with current credentials
   */
  testConnection(accessToken: string): Promise<boolean>;

  /**
   * Sync data from integration to Crypto ERP
   */
  syncData(integrationId: string, accessToken: string): Promise<SyncResult>;

  /**
   * Push data from Crypto ERP to integration
   */
  pushData(integrationId: string, accessToken: string, data: any): Promise<PushResult>;
}

export interface SyncResult {
  success: boolean;
  itemsSynced: number;
  errors?: Array<{
    item: string;
    error: string;
  }>;
  metadata?: Record<string, any>;
}

export interface PushResult {
  success: boolean;
  externalId?: string; // ID in the external system
  error?: string;
  metadata?: Record<string, any>;
}

export interface IntegrationConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  apiBaseUrl?: string;
}
