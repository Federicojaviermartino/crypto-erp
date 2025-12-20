"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "OAuthRateLimitGuard", {
    enumerable: true,
    get: function() {
        return OAuthRateLimitGuard;
    }
});
const _common = require("@nestjs/common");
const _apiusageservice = require("../api-usage.service.js");
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
let OAuthRateLimitGuard = class OAuthRateLimitGuard {
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        // Check if request has OAuth context (set by OAuthGuard)
        const oauth = request.oauth;
        if (!oauth || !oauth.app) {
            // Not an OAuth request, allow through
            return true;
        }
        const appId = oauth.app.id;
        // Get app details for rate limits
        const app = await this.oauthService.getAppByClientId(oauth.app.clientId);
        // Check hourly rate limit
        const hourlyCount = await this.apiUsageService.getHourlyRequestCount(appId);
        if (hourlyCount >= app.rateLimit) {
            const resetTime = new Date(Math.ceil(Date.now() / (60 * 60 * 1000)) * 60 * 60 * 1000);
            response.setHeader('X-RateLimit-Limit', app.rateLimit.toString());
            response.setHeader('X-RateLimit-Remaining', '0');
            response.setHeader('X-RateLimit-Reset', Math.floor(resetTime.getTime() / 1000).toString());
            response.setHeader('Retry-After', Math.ceil((resetTime.getTime() - Date.now()) / 1000).toString());
            throw new _common.HttpException({
                statusCode: _common.HttpStatus.TOO_MANY_REQUESTS,
                message: `Rate limit exceeded. Limit: ${app.rateLimit} requests per hour`,
                error: 'Too Many Requests',
                retryAfter: Math.ceil((resetTime.getTime() - Date.now()) / 1000)
            }, _common.HttpStatus.TOO_MANY_REQUESTS);
        }
        // Check daily quota
        const dailyCount = await this.apiUsageService.getDailyRequestCount(appId);
        if (dailyCount >= app.dailyQuota) {
            const resetTime = new Date();
            resetTime.setHours(24, 0, 0, 0); // Midnight next day
            response.setHeader('X-DailyQuota-Limit', app.dailyQuota.toString());
            response.setHeader('X-DailyQuota-Remaining', '0');
            response.setHeader('X-DailyQuota-Reset', Math.floor(resetTime.getTime() / 1000).toString());
            throw new _common.HttpException({
                statusCode: _common.HttpStatus.TOO_MANY_REQUESTS,
                message: `Daily quota exceeded. Limit: ${app.dailyQuota} requests per day`,
                error: 'Too Many Requests',
                retryAfter: Math.ceil((resetTime.getTime() - Date.now()) / 1000)
            }, _common.HttpStatus.TOO_MANY_REQUESTS);
        }
        // Set rate limit headers
        response.setHeader('X-RateLimit-Limit', app.rateLimit.toString());
        response.setHeader('X-RateLimit-Remaining', (app.rateLimit - hourlyCount - 1).toString());
        const hourlyResetTime = new Date(Math.ceil(Date.now() / (60 * 60 * 1000)) * 60 * 60 * 1000);
        response.setHeader('X-RateLimit-Reset', Math.floor(hourlyResetTime.getTime() / 1000).toString());
        response.setHeader('X-DailyQuota-Limit', app.dailyQuota.toString());
        response.setHeader('X-DailyQuota-Remaining', (app.dailyQuota - dailyCount - 1).toString());
        const dailyResetTime = new Date();
        dailyResetTime.setHours(24, 0, 0, 0);
        response.setHeader('X-DailyQuota-Reset', Math.floor(dailyResetTime.getTime() / 1000).toString());
        return true;
    }
    constructor(apiUsageService, oauthService){
        this.apiUsageService = apiUsageService;
        this.oauthService = oauthService;
    }
};
OAuthRateLimitGuard = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _apiusageservice.ApiUsageService === "undefined" ? Object : _apiusageservice.ApiUsageService,
        typeof _oauthservice.OAuthService === "undefined" ? Object : _oauthservice.OAuthService
    ])
], OAuthRateLimitGuard);

//# sourceMappingURL=rate-limit.guard.js.map