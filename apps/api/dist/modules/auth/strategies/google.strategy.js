"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "GoogleStrategy", {
    enumerable: true,
    get: function() {
        return GoogleStrategy;
    }
});
const _common = require("@nestjs/common");
const _passport = require("@nestjs/passport");
const _passportgoogleoauth20 = require("passport-google-oauth20");
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
let GoogleStrategy = class GoogleStrategy extends (0, _passport.PassportStrategy)(_passportgoogleoauth20.Strategy, 'google') {
    async validate(accessToken, refreshToken, profile, done) {
        try {
            const { id, emails, name, photos } = profile;
            if (!emails || emails.length === 0) {
                throw new _common.UnauthorizedException('No email found in Google profile');
            }
            const email = emails[0].value;
            // Auto-provision or find existing SSO user
            const user = await this.authService.findOrCreateSSOUser({
                ssoProvider: 'google',
                ssoId: id,
                email,
                firstName: name.givenName,
                lastName: name.familyName,
                avatarUrl: photos?.[0]?.value,
                ssoMetadata: {
                    accessToken,
                    refreshToken,
                    locale: profile._json.locale
                }
            });
            done(null, user);
        } catch (error) {
            done(error, false);
        }
    }
    constructor(configService, authService){
        super({
            clientID: configService.get('GOOGLE_CLIENT_ID'),
            clientSecret: configService.get('GOOGLE_CLIENT_SECRET'),
            callbackURL: configService.get('GOOGLE_CALLBACK_URL'),
            scope: [
                'email',
                'profile'
            ]
        }), this.configService = configService, this.authService = authService;
    }
};
GoogleStrategy = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService,
        typeof _authservice.AuthService === "undefined" ? Object : _authservice.AuthService
    ])
], GoogleStrategy);

//# sourceMappingURL=google.strategy.js.map