"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "OAuthController", {
    enumerable: true,
    get: function() {
        return OAuthController;
    }
});
const _common = require("@nestjs/common");
const _oauthservice = require("./oauth.service.js");
const _createoauthappdto = require("./dto/create-oauth-app.dto.js");
const _authorizedto = require("./dto/authorize.dto.js");
const _jwtauthguard = require("../auth/guards/jwt-auth.guard.js");
const _express = require("express");
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
let OAuthController = class OAuthController {
    getCompanyId(headers) {
        const companyId = headers['x-company-id'];
        if (!companyId) {
            throw new _common.BadRequestException('X-Company-Id header is required');
        }
        return companyId;
    }
    getUserId(req) {
        return req.user?.userId;
    }
    // ============================================================================
    // OAuth App Management
    // ============================================================================
    /**
   * Create a new OAuth application
   * POST /oauth/apps
   */ async createApp(headers, req, dto) {
        const companyId = this.getCompanyId(headers);
        const userId = this.getUserId(req);
        return this.oauthService.createApp(companyId, userId, dto);
    }
    /**
   * List OAuth applications for company
   * GET /oauth/apps
   */ async listApps(headers) {
        const companyId = this.getCompanyId(headers);
        return this.oauthService.listApps(companyId);
    }
    /**
   * Delete OAuth application
   * DELETE /oauth/apps/:id
   */ async deleteApp(headers, appId) {
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
   */ async authorize(headers, req, clientId, redirectUri, responseType, scopeStr, state) {
        if (responseType !== 'code') {
            throw new _common.BadRequestException('Only response_type=code is supported');
        }
        const companyId = this.getCompanyId(headers);
        const userId = this.getUserId(req);
        const scopes = scopeStr.split(' ').filter((s)=>s.length > 0);
        const result = await this.oauthService.generateAuthorizationCode(clientId, userId, companyId, redirectUri, scopes);
        // Return authorization code and redirect URL
        const redirectUrl = new URL(redirectUri);
        redirectUrl.searchParams.set('code', result.code);
        if (state) {
            redirectUrl.searchParams.set('state', state);
        }
        return {
            code: result.code,
            redirectUri: redirectUrl.toString(),
            expiresIn: result.expiresIn
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
   */ async token(dto) {
        if (dto.grantType === 'authorization_code') {
            if (!dto.code || !dto.redirectUri) {
                throw new _common.BadRequestException('code and redirect_uri are required for authorization_code grant');
            }
            return this.oauthService.exchangeCodeForToken(dto.code, dto.clientId, dto.clientSecret, dto.redirectUri);
        } else if (dto.grantType === 'refresh_token') {
            if (!dto.refreshToken) {
                throw new _common.BadRequestException('refresh_token is required for refresh_token grant');
            }
            return this.oauthService.refreshAccessToken(dto.refreshToken, dto.clientId, dto.clientSecret);
        } else {
            throw new _common.BadRequestException('grant_type must be authorization_code or refresh_token');
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
   */ async revoke(dto) {
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
   */ async introspect(token) {
        try {
            const tokenData = await this.oauthService.verifyAccessToken(token);
            return {
                active: true,
                scope: tokenData.scopes.join(' '),
                clientId: tokenData.app.clientId,
                userId: tokenData.userId,
                companyId: tokenData.companyId
            };
        } catch (error) {
            return {
                active: false
            };
        }
    }
    constructor(oauthService){
        this.oauthService = oauthService;
    }
};
_ts_decorate([
    (0, _common.Post)('apps'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_param(0, (0, _common.Headers)()),
    _ts_param(1, (0, _common.Req)()),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record,
        typeof _express.Request === "undefined" ? Object : _express.Request,
        typeof _createoauthappdto.CreateOAuthAppDto === "undefined" ? Object : _createoauthappdto.CreateOAuthAppDto
    ]),
    _ts_metadata("design:returntype", Promise)
], OAuthController.prototype, "createApp", null);
_ts_decorate([
    (0, _common.Get)('apps'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_param(0, (0, _common.Headers)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record
    ]),
    _ts_metadata("design:returntype", Promise)
], OAuthController.prototype, "listApps", null);
_ts_decorate([
    (0, _common.Delete)('apps/:id'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_param(0, (0, _common.Headers)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], OAuthController.prototype, "deleteApp", null);
_ts_decorate([
    (0, _common.Get)('authorize'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_param(0, (0, _common.Headers)()),
    _ts_param(1, (0, _common.Req)()),
    _ts_param(2, (0, _common.Query)('client_id')),
    _ts_param(3, (0, _common.Query)('redirect_uri')),
    _ts_param(4, (0, _common.Query)('response_type')),
    _ts_param(5, (0, _common.Query)('scope')),
    _ts_param(6, (0, _common.Query)('state')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record,
        typeof _express.Request === "undefined" ? Object : _express.Request,
        String,
        String,
        String,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], OAuthController.prototype, "authorize", null);
_ts_decorate([
    (0, _common.Post)('token'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _authorizedto.TokenDto === "undefined" ? Object : _authorizedto.TokenDto
    ]),
    _ts_metadata("design:returntype", Promise)
], OAuthController.prototype, "token", null);
_ts_decorate([
    (0, _common.Post)('revoke'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _authorizedto.RevokeTokenDto === "undefined" ? Object : _authorizedto.RevokeTokenDto
    ]),
    _ts_metadata("design:returntype", Promise)
], OAuthController.prototype, "revoke", null);
_ts_decorate([
    (0, _common.Post)('introspect'),
    _ts_param(0, (0, _common.Body)('token')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], OAuthController.prototype, "introspect", null);
OAuthController = _ts_decorate([
    (0, _common.Controller)('oauth'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _oauthservice.OAuthService === "undefined" ? Object : _oauthservice.OAuthService
    ])
], OAuthController);

//# sourceMappingURL=oauth.controller.js.map