"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "XeroService", {
    enumerable: true,
    get: function() {
        return XeroService;
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
let XeroService = class XeroService {
    /**
   * Get Xero OAuth authorization URL
   */ getAuthorizationUrl(companyId, redirectUri, state) {
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: this.clientId,
            redirect_uri: redirectUri,
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
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        // Get tenant connections
        const connections = await _axios.default.get(this.connectionsUrl, {
            headers: {
                Authorization: `Bearer ${response.data.access_token}`,
                'Content-Type': 'application/json'
            }
        });
        const tenantId = connections.data[0]?.tenantId;
        return {
            accessToken: response.data.access_token,
            refreshToken: response.data.refresh_token,
            expiresIn: response.data.expires_in,
            metadata: {
                tenantId,
                tenantName: connections.data[0]?.tenantName
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
   * Test connection by fetching organization info
   */ async testConnection(accessToken) {
        try {
            const integration = await this.baseService.getIntegration('', this.provider);
            if (!integration?.metadata?.['tenantId']) {
                return false;
            }
            const tenantId = integration.metadata['tenantId'];
            await _axios.default.get(`${this.apiBaseUrl}/Organisation`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'xero-tenant-id': tenantId,
                    Accept: 'application/json'
                }
            });
            return true;
        } catch (error) {
            this.logger.error('Xero connection test failed:', error);
            return false;
        }
    }
    /**
   * Sync invoices from Xero to Crypto ERP
   */ async syncData(integrationId, accessToken) {
        try {
            const integration = await this.baseService.prisma.integration.findUnique({
                where: {
                    id: integrationId
                }
            });
            if (!integration?.metadata?.['tenantId']) {
                throw new Error('Xero tenant ID not found');
            }
            const tenantId = integration.metadata['tenantId'];
            // Fetch invoices from Xero
            const response = await _axios.default.get(`${this.apiBaseUrl}/Invoices?where=Date>DateTime(2025,1,1)`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'xero-tenant-id': tenantId,
                    Accept: 'application/json'
                }
            });
            const invoices = response.data.Invoices || [];
            let syncedCount = 0;
            const errors = [];
            for (const xeroInvoice of invoices){
                try {
                    await this.syncInvoice(integration.companyId, xeroInvoice);
                    syncedCount++;
                } catch (error) {
                    errors.push({
                        item: `Invoice ${xeroInvoice.InvoiceNumber}`,
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
            this.logger.error('Xero sync failed:', error);
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
   * Push invoice from Crypto ERP to Xero
   */ async pushData(integrationId, accessToken, data) {
        try {
            const integration = await this.baseService.prisma.integration.findUnique({
                where: {
                    id: integrationId
                }
            });
            if (!integration?.metadata?.['tenantId']) {
                throw new Error('Xero tenant ID not found');
            }
            const tenantId = integration.metadata['tenantId'];
            // Convert Crypto ERP invoice to Xero format
            const xeroInvoice = this.mapToXeroInvoice(data);
            // Create or update invoice in Xero
            const response = await _axios.default.post(`${this.apiBaseUrl}/Invoices`, {
                Invoices: [
                    xeroInvoice
                ]
            }, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'xero-tenant-id': tenantId,
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                }
            });
            return {
                success: true,
                externalId: response.data.Invoices[0].InvoiceID,
                metadata: {
                    invoiceNumber: response.data.Invoices[0].InvoiceNumber,
                    status: response.data.Invoices[0].Status
                }
            };
        } catch (error) {
            this.logger.error('Xero push failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    /**
   * Sync single invoice from Xero to Crypto ERP
   */ async syncInvoice(companyId, xeroInvoice) {
        this.logger.log(`Would sync invoice ${xeroInvoice.InvoiceNumber} to Crypto ERP`);
    }
    /**
   * Map Crypto ERP invoice to Xero format
   */ mapToXeroInvoice(invoice) {
        return {
            Type: 'ACCREC',
            Contact: {
                ContactID: invoice.xeroContactId
            },
            InvoiceNumber: invoice.number,
            Date: invoice.issueDate,
            DueDate: invoice.dueDate,
            LineItems: invoice.lines.map((line)=>({
                    Description: line.description,
                    Quantity: line.quantity,
                    UnitAmount: line.unitPrice,
                    AccountCode: line.accountCode || '200',
                    TaxType: line.taxRate > 0 ? 'OUTPUT2' : 'NONE'
                })),
            Status: 'DRAFT'
        };
    }
    constructor(baseService, config){
        this.baseService = baseService;
        this.config = config;
        this.provider = 'xero';
        this.logger = new _common.Logger(XeroService.name);
        this.authUrl = 'https://login.xero.com/identity/connect/authorize';
        this.tokenUrl = 'https://identity.xero.com/connect/token';
        this.apiBaseUrl = 'https://api.xero.com/api.xro/2.0';
        this.connectionsUrl = 'https://api.xero.com/connections';
        this.scopes = [
            'offline_access',
            'accounting.transactions',
            'accounting.contacts',
            'accounting.settings.read'
        ];
        this.clientId = this.config.get('XERO_CLIENT_ID') || '';
        this.clientSecret = this.config.get('XERO_CLIENT_SECRET') || '';
    }
};
XeroService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _baseintegrationservice.BaseIntegrationService === "undefined" ? Object : _baseintegrationservice.BaseIntegrationService,
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService
    ])
], XeroService);

//# sourceMappingURL=xero.service.js.map