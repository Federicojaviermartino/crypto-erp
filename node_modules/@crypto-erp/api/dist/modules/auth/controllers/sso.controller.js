"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SsoController", {
    enumerable: true,
    get: function() {
        return SsoController;
    }
});
const _common = require("@nestjs/common");
const _passport = require("@nestjs/passport");
const _express = require("express");
const _authservice = require("../auth.service");
const _config = require("@nestjs/config");
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
let SsoController = class SsoController {
    // Google OAuth Login
    async googleLogin() {
    // Initiates Google OAuth flow
    }
    async googleCallback(req, res) {
        const user = req.user;
        // Generate JWT tokens
        const tokens = await this.authService.generateTokens(user);
        // Redirect to frontend with tokens
        const frontendUrl = this.configService.get('WEB_URL');
        const redirectUrl = `${frontendUrl}/auth/callback?token=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;
        res.redirect(redirectUrl);
    }
    // Azure AD Login
    async azureLogin() {
    // Initiates Azure AD OAuth flow
    }
    async azureCallback(req, res) {
        const user = req.user;
        // Generate JWT tokens
        const tokens = await this.authService.generateTokens(user);
        // Redirect to frontend with tokens
        const frontendUrl = this.configService.get('WEB_URL');
        const redirectUrl = `${frontendUrl}/auth/callback?token=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;
        res.redirect(redirectUrl);
    }
    // SAML Login
    async samlLogin() {
    // Initiates SAML flow
    }
    async samlCallback(req, res) {
        const user = req.user;
        // Generate JWT tokens
        const tokens = await this.authService.generateTokens(user);
        // Redirect to frontend with tokens
        const frontendUrl = this.configService.get('WEB_URL');
        const redirectUrl = `${frontendUrl}/auth/callback?token=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;
        res.redirect(redirectUrl);
    }
    // SAML Metadata endpoint (for IdP configuration)
    async samlMetadata(res) {
        const metadata = this.authService.getSamlMetadata();
        res.type('application/xml');
        res.send(metadata);
    }
    constructor(authService, configService){
        this.authService = authService;
        this.configService = configService;
    }
};
_ts_decorate([
    (0, _common.Get)('google'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('google')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], SsoController.prototype, "googleLogin", null);
_ts_decorate([
    (0, _common.Get)('google/callback'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('google')),
    _ts_param(0, (0, _common.Req)()),
    _ts_param(1, (0, _common.Res)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _express.Request === "undefined" ? Object : _express.Request,
        typeof _express.Response === "undefined" ? Object : _express.Response
    ]),
    _ts_metadata("design:returntype", Promise)
], SsoController.prototype, "googleCallback", null);
_ts_decorate([
    (0, _common.Get)('azure'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('azure-ad')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], SsoController.prototype, "azureLogin", null);
_ts_decorate([
    (0, _common.Get)('azure/callback'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('azure-ad')),
    _ts_param(0, (0, _common.Req)()),
    _ts_param(1, (0, _common.Res)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _express.Request === "undefined" ? Object : _express.Request,
        typeof _express.Response === "undefined" ? Object : _express.Response
    ]),
    _ts_metadata("design:returntype", Promise)
], SsoController.prototype, "azureCallback", null);
_ts_decorate([
    (0, _common.Get)('saml'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('saml')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], SsoController.prototype, "samlLogin", null);
_ts_decorate([
    (0, _common.Post)('saml/callback'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('saml')),
    _ts_param(0, (0, _common.Req)()),
    _ts_param(1, (0, _common.Res)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _express.Request === "undefined" ? Object : _express.Request,
        typeof _express.Response === "undefined" ? Object : _express.Response
    ]),
    _ts_metadata("design:returntype", Promise)
], SsoController.prototype, "samlCallback", null);
_ts_decorate([
    (0, _common.Get)('saml/metadata'),
    _ts_param(0, (0, _common.Res)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _express.Response === "undefined" ? Object : _express.Response
    ]),
    _ts_metadata("design:returntype", Promise)
], SsoController.prototype, "samlMetadata", null);
SsoController = _ts_decorate([
    (0, _common.Controller)('auth/sso'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _authservice.AuthService === "undefined" ? Object : _authservice.AuthService,
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService
    ])
], SsoController);

//# sourceMappingURL=sso.controller.js.map