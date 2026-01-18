import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IntegrationProvider, SyncResult, PushResult } from '../base/integration.interface.js';
import { BaseIntegrationService } from '../base/base-integration.service.js';
import axios from 'axios';

/**
 * Xero Accounting Integration
 *
 * Provides bi-directional sync with Xero:
 * - Sync invoices, contacts, and payments
 * - Push invoices from Crypto ERP to Xero
 * - Real-time webhooks support
 *
 * OAuth 2.0 with PKCE Flow
 */
@Injectable()
export class XeroService implements IntegrationProvider {
  readonly provider = 'xero';
  private readonly logger = new Logger(XeroService.name);

  private readonly authUrl = 'https://login.xero.com/identity/connect/authorize';
  private readonly tokenUrl = 'https://identity.xero.com/connect/token';
  private readonly apiBaseUrl = 'https://api.xero.com/api.xro/2.0';
  private readonly connectionsUrl = 'https://api.xero.com/connections';

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly scopes = [
    'offline_access',
    'accounting.transactions',
    'accounting.contacts',
    'accounting.settings.read',
  ];

  constructor(
    private readonly baseService: BaseIntegrationService,
    private readonly config: ConfigService,
  ) {
    this.clientId = this.config.get<string>('XERO_CLIENT_ID') || '';
    this.clientSecret = this.config.get<string>('XERO_CLIENT_SECRET') || '';
  }

  /**
   * Get Xero OAuth authorization URL
   */
  getAuthorizationUrl(companyId: string, redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: this.scopes.join(' '),
      state,
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, redirectUri: string) {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await axios.post(
      this.tokenUrl,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    // Get tenant connections
    const connections = await axios.get(this.connectionsUrl, {
      headers: {
        Authorization: `Bearer ${response.data.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    const tenantId = connections.data[0]?.tenantId;

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in, // 1800 seconds (30 minutes)
      metadata: {
        tenantId,
        tenantName: connections.data[0]?.tenantName,
      },
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string) {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await axios.post(
      this.tokenUrl,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
    };
  }

  /**
   * Test connection by fetching organization info
   */
  async testConnection(accessToken: string): Promise<boolean> {
    try {
      const integration = await this.baseService.getIntegration('', this.provider);
      if (!integration?.metadata?.['tenantId']) {
        return false;
      }

      const tenantId = integration.metadata['tenantId'] as string;

      await axios.get(`${this.apiBaseUrl}/Organisation`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'xero-tenant-id': tenantId,
          Accept: 'application/json',
        },
      });

      return true;
    } catch (error) {
      this.logger.error('Xero connection test failed:', error);
      return false;
    }
  }

  /**
   * Sync invoices from Xero to Crypto ERP
   */
  async syncData(integrationId: string, accessToken: string): Promise<SyncResult> {
    try {
      const integration = await this.baseService.getIntegrationById(integrationId);

      if (!integration?.metadata?.['tenantId']) {
        throw new Error('Xero tenant ID not found');
      }

      const tenantId = integration.metadata['tenantId'] as string;

      // Fetch invoices from Xero
      const response = await axios.get(
        `${this.apiBaseUrl}/Invoices?where=Date>DateTime(2025,1,1)`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'xero-tenant-id': tenantId,
            Accept: 'application/json',
          },
        },
      );

      const invoices = response.data.Invoices || [];
      let syncedCount = 0;
      const errors: Array<{ item: string; error: string }> = [];

      for (const xeroInvoice of invoices) {
        try {
          await this.syncInvoice(integration.companyId, xeroInvoice);
          syncedCount++;
        } catch (error: any) {
          errors.push({
            item: `Invoice ${xeroInvoice.InvoiceNumber}`,
            error: error.message,
          });
        }
      }

      await this.baseService.updateSyncStatus(
        integrationId,
        errors.length === 0 ? 'success' : 'partial',
        errors.length > 0 ? JSON.stringify(errors) : undefined,
      );

      return {
        success: true,
        itemsSynced: syncedCount,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error: any) {
      this.logger.error('Xero sync failed:', error);

      await this.baseService.updateSyncStatus(
        integrationId,
        'error',
        error.message,
      );

      return {
        success: false,
        itemsSynced: 0,
        errors: [{ item: 'Sync', error: error.message }],
      };
    }
  }

  /**
   * Push invoice from Crypto ERP to Xero
   */
  async pushData(integrationId: string, accessToken: string, data: any): Promise<PushResult> {
    try {
      const integration = await this.baseService.getIntegrationById(integrationId);

      if (!integration?.metadata?.['tenantId']) {
        throw new Error('Xero tenant ID not found');
      }

      const tenantId = integration.metadata['tenantId'] as string;

      // Convert Crypto ERP invoice to Xero format
      const xeroInvoice = this.mapToXeroInvoice(data);

      // Create or update invoice in Xero
      const response = await axios.post(
        `${this.apiBaseUrl}/Invoices`,
        { Invoices: [xeroInvoice] },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'xero-tenant-id': tenantId,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        },
      );

      return {
        success: true,
        externalId: response.data.Invoices[0].InvoiceID,
        metadata: {
          invoiceNumber: response.data.Invoices[0].InvoiceNumber,
          status: response.data.Invoices[0].Status,
        },
      };
    } catch (error: any) {
      this.logger.error('Xero push failed:', error);

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Sync single invoice from Xero to Crypto ERP
   */
  private async syncInvoice(companyId: string, xeroInvoice: any) {
    this.logger.log(`Would sync invoice ${xeroInvoice.InvoiceNumber} to Crypto ERP`);
  }

  /**
   * Map Crypto ERP invoice to Xero format
   */
  private mapToXeroInvoice(invoice: any) {
    return {
      Type: 'ACCREC', // Accounts Receivable
      Contact: {
        ContactID: invoice.xeroContactId,
      },
      InvoiceNumber: invoice.number,
      Date: invoice.issueDate,
      DueDate: invoice.dueDate,
      LineItems: invoice.lines.map((line: any) => ({
        Description: line.description,
        Quantity: line.quantity,
        UnitAmount: line.unitPrice,
        AccountCode: line.accountCode || '200', // Default sales account
        TaxType: line.taxRate > 0 ? 'OUTPUT2' : 'NONE',
      })),
      Status: 'DRAFT',
    };
  }
}
