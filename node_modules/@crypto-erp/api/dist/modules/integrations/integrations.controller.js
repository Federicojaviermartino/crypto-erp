"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "IntegrationsController", {
    enumerable: true,
    get: function() {
        return IntegrationsController;
    }
});
const _common = require("@nestjs/common");
const _jwtauthguard = require("../auth/guards/jwt-auth.guard.js");
const _baseintegrationservice = require("./base/base-integration.service.js");
const _quickbooksservice = require("./quickbooks/quickbooks.service.js");
const _xeroservice = require("./xero/xero.service.js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
function _ts_param(paramIndex, decorator) {
    return function(target, key) {
        decorator(target, key, paramIndex);
    };
}
let IntegrationsController = class IntegrationsController {
    getCompanyId(headers) {
        const companyId = headers['x-company-id'];
        if (!companyId) {
            throw new _common.BadRequestException('X-Company-Id header is required');
        }
        return companyId;
    }
    /**
   * List all integrations for company
   * GET /integrations
   */ async listIntegrations(headers) {
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
   */ async getAuthorizationUrl(headers, provider, redirectUri) {
        const companyId = this.getCompanyId(headers);
        if (!redirectUri) {
            throw new _common.BadRequestException('redirectUri query parameter is required');
        }
        // Generate random state for CSRF protection
        const state = `${companyId}:${Math.random().toString(36).substring(7)}`;
        let authorizationUrl;
        switch(provider){
            case 'quickbooks':
                authorizationUrl = this.quickbooksService.getAuthorizationUrl(companyId, redirectUri, state);
                break;
            case 'xero':
                authorizationUrl = this.xeroService.getAuthorizationUrl(companyId, redirectUri, state);
                break;
            default:
                throw new _common.BadRequestException(`Provider ${provider} is not supported`);
        }
        return {
            authorizationUrl,
            state
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
   */ async handleCallback(headers, provider, code, redirectUri, state) {
        const companyId = this.getCompanyId(headers);
        if (!code || !redirectUri) {
            throw new _common.BadRequestException('code and redirectUri are required');
        }
        // Verify state contains companyId (CSRF protection)
        if (state && !state.startsWith(companyId)) {
            throw new _common.BadRequestException('Invalid state parameter');
        }
        let providerService;
        let name;
        switch(provider){
            case 'quickbooks':
                providerService = this.quickbooksService;
                name = 'QuickBooks Online';
                break;
            case 'xero':
                providerService = this.xeroService;
                name = 'Xero Accounting';
                break;
            default:
                throw new _common.BadRequestException(`Provider ${provider} is not supported`);
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
            metadata: tokenResponse.metadata
        });
        return {
            success: true,
            integration: {
                id: integration.id,
                provider: integration.provider,
                name: integration.name,
                createdAt: integration.createdAt
            }
        };
    }
    /**
   * Trigger manual sync for an integration
   * POST /integrations/:id/sync
   */ async syncIntegration(headers, integrationId) {
        const companyId = this.getCompanyId(headers);
        // Get integration
        const integration = await this.baseService.prisma.integration.findFirst({
            where: {
                id: integrationId,
                companyId
            }
        });
        if (!integration) {
            throw new _common.BadRequestException('Integration not found');
        }
        // Get decrypted access token
        const accessToken = this.baseService.getDecryptedAccessToken(integration);
        if (!accessToken) {
            throw new _common.BadRequestException('Integration has no valid access token');
        }
        // Get provider service
        let providerService;
        switch(integration.provider){
            case 'quickbooks':
                providerService = this.quickbooksService;
                break;
            case 'xero':
                providerService = this.xeroService;
                break;
            default:
                throw new _common.BadRequestException(`Provider ${integration.provider} is not supported`);
        }
        // Trigger sync
        const result = await providerService.syncData(integrationId, accessToken);
        return {
            success: result.success,
            itemsSynced: result.itemsSynced,
            errors: result.errors
        };
    }
    /**
   * Disconnect an integration
   * DELETE /integrations/:id
   */ async disconnectIntegration(headers, integrationId) {
        const companyId = this.getCompanyId(headers);
        await this.baseService.disconnectIntegration(integrationId, companyId);
        return {
            success: true,
            message: 'Integration disconnected successfully'
        };
    }
    constructor(baseService, quickbooksService, xeroService){
        this.baseService = baseService;
        this.quickbooksService = quickbooksService;
        this.xeroService = xeroService;
    }
};
_ts_decorate([
    (0, _common.Get)(),
    _ts_param(0, (0, _common.Headers)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record
    ]),
    _ts_metadata("design:returntype", Promise)
], IntegrationsController.prototype, "listIntegrations", null);
_ts_decorate([
    (0, _common.Get)(':provider/connect'),
    _ts_param(0, (0, _common.Headers)()),
    _ts_param(1, (0, _common.Param)('provider')),
    _ts_param(2, (0, _common.Query)('redirectUri')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], IntegrationsController.prototype, "getAuthorizationUrl", null);
_ts_decorate([
    (0, _common.Post)(':provider/callback'),
    _ts_param(0, (0, _common.Headers)()),
    _ts_param(1, (0, _common.Param)('provider')),
    _ts_param(2, (0, _common.Query)('code')),
    _ts_param(3, (0, _common.Query)('redirectUri')),
    _ts_param(4, (0, _common.Query)('state')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record,
        String,
        String,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], IntegrationsController.prototype, "handleCallback", null);
_ts_decorate([
    (0, _common.Post)(':id/sync'),
    _ts_param(0, (0, _common.Headers)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], IntegrationsController.prototype, "syncIntegration", null);
_ts_decorate([
    (0, _common.Delete)(':id'),
    _ts_param(0, (0, _common.Headers)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], IntegrationsController.prototype, "disconnectIntegration", null);
IntegrationsController = _ts_decorate([
    (0, _common.Controller)('integrations'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _baseintegrationservice.BaseIntegrationService === "undefined" ? Object : _baseintegrationservice.BaseIntegrationService,
        typeof _quickbooksservice.QuickBooksService === "undefined" ? Object : _quickbooksservice.QuickBooksService,
        typeof _xeroservice.XeroService === "undefined" ? Object : _xeroservice.XeroService
    ])
], IntegrationsController);

//# sourceMappingURL=integrations.controller.js.map