"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AuthModule", {
    enumerable: true,
    get: function() {
        return AuthModule;
    }
});
const _common = require("@nestjs/common");
const _jwt = require("@nestjs/jwt");
const _passport = require("@nestjs/passport");
const _config = require("@nestjs/config");
const _authservice = require("./auth.service.js");
const _authcontroller = require("./auth.controller.js");
const _ssocontroller = require("./controllers/sso.controller.js");
const _index = require("./strategies");
const _googlestrategy = require("./strategies/google.strategy.js");
const _azureadstrategy = require("./strategies/azure-ad.strategy.js");
const _samlstrategy = require("./strategies/saml.strategy.js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let AuthModule = class AuthModule {
};
AuthModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _passport.PassportModule.register({
                defaultStrategy: 'jwt'
            }),
            _jwt.JwtModule.registerAsync({
                inject: [
                    _config.ConfigService
                ],
                useFactory: (configService)=>({
                        secret: configService.get('jwt.secret'),
                        signOptions: {
                            expiresIn: configService.get('jwt.accessExpiresIn') || '15m'
                        }
                    })
            })
        ],
        controllers: [
            _authcontroller.AuthController,
            _ssocontroller.SsoController
        ],
        providers: [
            _authservice.AuthService,
            _index.JwtStrategy,
            _index.JwtRefreshStrategy,
            _index.LocalStrategy,
            _googlestrategy.GoogleStrategy,
            _azureadstrategy.AzureADStrategy,
            _samlstrategy.SamlStrategy
        ],
        exports: [
            _authservice.AuthService,
            _jwt.JwtModule
        ]
    })
], AuthModule);

//# sourceMappingURL=auth.module.js.map