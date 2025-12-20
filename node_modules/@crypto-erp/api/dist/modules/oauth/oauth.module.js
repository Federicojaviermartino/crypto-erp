"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "OAuthModule", {
    enumerable: true,
    get: function() {
        return OAuthModule;
    }
});
const _common = require("@nestjs/common");
const _oauthcontroller = require("./oauth.controller.js");
const _oauthservice = require("./oauth.service.js");
const _apiusageservice = require("./api-usage.service.js");
const _database = require("../../../../../libs/database/src");
const _core = require("@nestjs/core");
const _apiusageinterceptor = require("./interceptors/api-usage.interceptor.js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let OAuthModule = class OAuthModule {
};
OAuthModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _database.PrismaModule
        ],
        controllers: [
            _oauthcontroller.OAuthController
        ],
        providers: [
            _oauthservice.OAuthService,
            _apiusageservice.ApiUsageService,
            {
                provide: _core.APP_INTERCEPTOR,
                useClass: _apiusageinterceptor.ApiUsageInterceptor
            }
        ],
        exports: [
            _oauthservice.OAuthService,
            _apiusageservice.ApiUsageService
        ]
    })
], OAuthModule);

//# sourceMappingURL=oauth.module.js.map