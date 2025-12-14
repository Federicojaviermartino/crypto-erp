"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AzureADStrategy", {
    enumerable: true,
    get: function() {
        return AzureADStrategy;
    }
});
const _common = require("@nestjs/common");
const _passport = require("@nestjs/passport");
const _passportazuread = require("passport-azure-ad");
const _config = require("@nestjs/config");
const _authservice = require("../auth.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let AzureADStrategy = class AzureADStrategy extends (0, _passport.PassportStrategy)(_passportazuread.BearerStrategy, 'azure-ad') {
    async validate(payload) {
        try {
            const { oid, preferred_username, name, email } = payload;
            if (!email && !preferred_username) {
                throw new _common.UnauthorizedException('No email found in Azure AD profile');
            }
            const userEmail = email || preferred_username;
            const nameParts = name?.split(' ') || [
                '',
                ''
            ];
            // Auto-provision or find existing SSO user
            const user = await this.authService.findOrCreateSSOUser({
                ssoProvider: 'azure',
                ssoId: oid,
                email: userEmail,
                firstName: nameParts[0],
                lastName: nameParts.slice(1).join(' ') || nameParts[0],
                ssoMetadata: {
                    tenantId: payload.tid,
                    upn: payload.upn,
                    roles: payload.roles || []
                }
            });
            return user;
        } catch (error) {
            throw new _common.UnauthorizedException(error.message);
        }
    }
    constructor(configService, authService){
        super({
            identityMetadata: `https://login.microsoftonline.com/${configService.get('AZURE_TENANT_ID')}/v2.0/.well-known/openid-configuration`,
            clientID: configService.get('AZURE_CLIENT_ID'),
            validateIssuer: true,
            issuer: `https://login.microsoftonline.com/${configService.get('AZURE_TENANT_ID')}/v2.0`,
            passReqToCallback: false,
            loggingLevel: 'warn',
            scope: [
                'email',
                'profile',
                'openid'
            ]
        }), this.configService = configService, this.authService = authService;
    }
};
AzureADStrategy = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService,
        typeof _authservice.AuthService === "undefined" ? Object : _authservice.AuthService
    ])
], AzureADStrategy);

//# sourceMappingURL=azure-ad.strategy.js.map