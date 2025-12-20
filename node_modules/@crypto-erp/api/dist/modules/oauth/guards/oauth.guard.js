"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get OAUTH_SCOPES_KEY () {
        return OAUTH_SCOPES_KEY;
    },
    get OAuthGuard () {
        return OAuthGuard;
    },
    get RequireScopes () {
        return RequireScopes;
    }
});
const _common = require("@nestjs/common");
const _core = require("@nestjs/core");
const _oauthservice = require("../oauth.service.js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
const OAUTH_SCOPES_KEY = 'oauth_scopes';
const RequireScopes = (...scopes)=>(0, _common.SetMetadata)(OAUTH_SCOPES_KEY, scopes);
let OAuthGuard = class OAuthGuard {
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        // Extract access token from Authorization header
        const authHeader = request.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new _common.UnauthorizedException('Missing or invalid Authorization header');
        }
        const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix
        // Verify access token
        let tokenData;
        try {
            tokenData = await this.oauthService.verifyAccessToken(accessToken);
        } catch (error) {
            throw new _common.UnauthorizedException('Invalid or expired access token');
        }
        // Get required scopes from decorator
        const requiredScopes = this.reflector.getAllAndOverride(OAUTH_SCOPES_KEY, [
            context.getHandler(),
            context.getClass()
        ]);
        // Check if token has required scopes
        if (requiredScopes && requiredScopes.length > 0) {
            const hasAllScopes = requiredScopes.every((scope)=>tokenData.scopes.includes(scope));
            if (!hasAllScopes) {
                throw new _common.UnauthorizedException(`Insufficient scopes. Required: ${requiredScopes.join(', ')}`);
            }
        }
        // Attach token data to request for use in controllers
        request.oauth = {
            userId: tokenData.userId,
            companyId: tokenData.companyId,
            scopes: tokenData.scopes,
            app: tokenData.app
        };
        // Also set X-Company-Id header for compatibility with existing endpoints
        request.headers['x-company-id'] = tokenData.companyId;
        return true;
    }
    constructor(oauthService, reflector){
        this.oauthService = oauthService;
        this.reflector = reflector;
    }
};
OAuthGuard = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _oauthservice.OAuthService === "undefined" ? Object : _oauthservice.OAuthService,
        typeof _core.Reflector === "undefined" ? Object : _core.Reflector
    ])
], OAuthGuard);

//# sourceMappingURL=oauth.guard.js.map