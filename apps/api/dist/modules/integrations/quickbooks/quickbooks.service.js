"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "QuickBooksService", {
    enumerable: true,
    get: function() {
        return QuickBooksService;
    }
});
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
const _baseintegrationservice = require("../base/base-integration.service.js");
const _axios = /*#__PURE__*/ _interop_require_default(require("axios"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let QuickBooksService = class QuickBooksService {
    /**
   * Get QuickBooks OAuth authorization URL
   */ getAuthorizationUrl(companyId, redirectUri, state) {
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: this.scopes.join(' '),
            state
        });
        return `${this.authUrl}?${params.toString()}`;
    }
    /**
   * Exchange authorization code for access token
   */ async exchangeCodeForToken(code, redirectUri) {
        const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
        const response = await _axios.default.post(this.tokenUrl, new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri
        }), {
            headers: {
                Accept: 'application/json',
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        return {
            accessToken: response.data.access_token,
            refreshToken: response.data.refresh_token,
            expiresIn: response.data.expires_in,
            metadata: {
                realmId: response.data.realmId
            }
        };
    }
    /**
   * Refresh access token
   */ async refreshAccessToken(refreshToken) {
        const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
        const response = await _axios.default.post(this.tokenUrl, new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken
        }), {
            headers: {
                Accept: 'application/json',
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        return {
            accessToken: response.data.access_token,
            refreshToken: response.data.refresh_token,
            expiresIn: response.data.expires_in
        };
    }
    /**
   * Test connection by fetching company info
   */ async testConnection(accessToken) {
        try {
            // Get company info to test connection
            const integration = await this.baseService.getIntegration('', this.provider);
            if (!integration?.metadata?.['realmId']) {
                return false;
            }
            const realmId = integration.metadata['realmId'];
            await _axios.default.get(`${this.apiBaseUrl}/${realmId}/companyinfo/${realmId}`, {
                headers: {
                    Accept: 'application/json',
                    Authorization: `Bearer ${accessToken}`
                }
            });
            return true;
        } catch (error) {
            this.logger.error('QuickBooks connection test failed:', error);
            return false;
        }
    }
    /**
   * Sync invoices from QuickBooks to Crypto ERP
   */ async syncData(integrationId, accessToken) {
        try {
            const integration = await this.baseService.prisma.integration.findUnique({
                where: {
                    id: integrationId
                }
            });
            if (!integration?.metadata?.['realmId']) {
                throw new Error('QuickBooks realm ID not found');
            }
            const realmId = integration.metadata['realmId'];
            // Fetch invoices from QuickBooks
            const response = await _axios.default.get(`${this.apiBaseUrl}/${realmId}/query?query=SELECT * FROM Invoice WHERE TxnDate > '2025-01-01' MAXRESULTS 100`, {
                headers: {
                    Accept: 'application/json',
                    Authorization: `Bearer ${accessToken}`
                }
            });
            const invoices = response.data.QueryResponse?.Invoice || [];
            let syncedCount = 0;
            const errors = [];
            // Sync each invoice to Crypto ERP
            for (const qbInvoice of invoices){
                try {
                    await this.syncInvoice(integration.companyId, qbInvoice);
                    syncedCount++;
                } catch (error) {
                    errors.push({
                        item: `Invoice ${qbInvoice.DocNumber}`,
                        error: error.message
                    });
                }
            }
            await this.baseService.updateSyncStatus(integrationId, errors.length === 0 ? 'success' : 'partial', errors.length > 0 ? JSON.stringify(errors) : undefined);
            return {
                success: true,
                itemsSynced: syncedCount,
                errors: errors.length > 0 ? errors : undefined
            };
        } catch (error) {
            this.logger.error('QuickBooks sync failed:', error);
            await this.baseService.updateSyncStatus(integrationId, 'error', error.message);
            return {
                success: false,
                itemsSynced: 0,
                errors: [
                    {
                        item: 'Sync',
                        error: error.message
                    }
                ]
            };
        }
    }
    /**
   * Push invoice from Crypto ERP to QuickBooks
   */ async pushData(integrationId, accessToken, data) {
        try {
            const integration = await this.baseService.prisma.integration.findUnique({
                where: {
                    id: integrationId
                }
            });
            if (!integration?.metadata?.['realmId']) {
                throw new Error('QuickBooks realm ID not found');
            }
            const realmId = integration.metadata['realmId'];
            // Convert Crypto ERP invoice to QuickBooks format
            const qbInvoice = this.mapToQuickBooksInvoice(data);
            // Create or update invoice in QuickBooks
            const response = await _axios.default.post(`${this.apiBaseUrl}/${realmId}/invoice`, qbInvoice, {
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`
                }
            });
            return {
                success: true,
                externalId: response.data.Invoice.Id,
                metadata: {
                    docNumber: response.data.Invoice.DocNumber,
                    syncToken: response.data.Invoice.SyncToken
                }
            };
        } catch (error) {
            this.logger.error('QuickBooks push failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    /**
   * Sync single invoice from QuickBooks to Crypto ERP
   */ async syncInvoice(companyId, qbInvoice) {
        // Map QuickBooks invoice to Crypto ERP format
        const invoice = {
            companyId,
            contactId: await this.getOrCreateContact(companyId, qbInvoice.CustomerRef),
            number: qbInvoice.DocNumber,
            issueDate: new Date(qbInvoice.TxnDate),
            dueDate: qbInvoice.DueDate ? new Date(qbInvoice.DueDate) : null,
            subtotal: parseFloat(qbInvoice.TotalAmt || '0'),
            totalAmount: parseFloat(qbInvoice.TotalAmt || '0'),
            currency: qbInvoice.CurrencyRef?.value || 'USD',
            status: this.mapQuickBooksStatus(qbInvoice.Balance),
            metadata: {
                quickbooksId: qbInvoice.Id,
                syncToken: qbInvoice.SyncToken
            }
        };
        // Upsert invoice in Crypto ERP
        // This is a placeholder - actual implementation would use InvoicesService
        this.logger.log(`Would sync invoice ${invoice.number} to Crypto ERP`);
    }
    /**
   * Map QuickBooks invoice to Crypto ERP format
   */ mapToQuickBooksInvoice(invoice) {
        return {
            CustomerRef: {
                value: invoice.quickbooksCustomerId
            },
            Line: invoice.lines.map((line)=>({
                    Amount: line.total,
                    DetailType: 'SalesItemLineDetail',
                    SalesItemLineDetail: {
                        ItemRef: {
                            value: line.quickbooksItemId || '1'
                        },
                        Qty: line.quantity,
                        UnitPrice: line.unitPrice
                    },
                    Description: line.description
                })),
            TxnDate: invoice.issueDate,
            DueDate: invoice.dueDate
        };
    }
    /**
   * Map QuickBooks invoice status to Crypto ERP status
   */ mapQuickBooksStatus(balance) {
        if (balance === 0) {
            return 'PAID';
        } else if (balance > 0) {
            return 'PENDING';
        }
        return 'DRAFT';
    }
    /**
   * Get or create contact from QuickBooks customer
   */ async getOrCreateContact(companyId, customerRef) {
        // Placeholder - would actually query/create contact
        return 'contact-uuid';
    }
    constructor(baseService, config){
        this.baseService = baseService;
        this.config = config;
        this.provider = 'quickbooks';
        this.logger = new _common.Logger(QuickBooksService.name);
        this.authUrl = 'https://appcenter.intuit.com/connect/oauth2';
        this.tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
        this.apiBaseUrl = 'https://quickbooks.api.intuit.com/v3/company';
        this.revokeUrl = 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke';
        this.scopes = [
            'com.intuit.quickbooks.accounting'
        ];
        this.clientId = this.config.get('QUICKBOOKS_CLIENT_ID') || '';
        this.clientSecret = this.config.get('QUICKBOOKS_CLIENT_SECRET') || '';
    }
};
QuickBooksService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _baseintegrationservice.BaseIntegrationService === "undefined" ? Object : _baseintegrationservice.BaseIntegrationService,
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService
    ])
], QuickBooksService);

//# sourceMappingURL=quickbooks.service.js.map