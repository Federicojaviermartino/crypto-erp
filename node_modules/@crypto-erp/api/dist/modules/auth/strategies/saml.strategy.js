"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SamlStrategy", {
    enumerable: true,
    get: function() {
        return SamlStrategy;
    }
});
const _common = require("@nestjs/common");
const _passport = require("@nestjs/passport");
const _passportsaml = require("passport-saml");
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
let SamlStrategy = class SamlStrategy extends (0, _passport.PassportStrategy)(_passportsaml.Strategy, 'saml') {
    async validate(profile) {
        try {
            const { nameID, email, firstName, lastName, displayName } = profile;
            if (!email && !nameID) {
                throw new _common.UnauthorizedException('No email found in SAML profile');
            }
            const userEmail = email || nameID;
            const fname = firstName || displayName?.split(' ')[0] || 'User';
            const lname = lastName || displayName?.split(' ').slice(1).join(' ') || 'User';
            // Auto-provision or find existing SSO user
            const user = await this.authService.findOrCreateSSOUser({
                ssoProvider: 'saml',
                ssoId: nameID,
                email: userEmail,
                firstName: fname,
                lastName: lname,
                ssoMetadata: {
                    sessionIndex: profile.sessionIndex,
                    attributes: profile
                }
            });
            return user;
        } catch (error) {
            throw new _common.UnauthorizedException(error.message);
        }
    }
    constructor(configService, authService){
        super({
            entryPoint: configService.get('SAML_ENTRY_POINT'),
            issuer: configService.get('SAML_ISSUER'),
            callbackUrl: configService.get('SAML_CALLBACK_URL'),
            cert: configService.get('SAML_CERT'),
            acceptedClockSkewMs: -1,
            identifierFormat: null,
            signatureAlgorithm: 'sha256',
            digestAlgorithm: 'sha256'
        }), this.configService = configService, this.authService = authService;
    }
};
SamlStrategy = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService,
        typeof _authservice.AuthService === "undefined" ? Object : _authservice.AuthService
    ])
], SamlStrategy);

//# sourceMappingURL=saml.strategy.js.map