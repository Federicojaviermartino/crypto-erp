"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ApiUsageInterceptor", {
    enumerable: true,
    get: function() {
        return ApiUsageInterceptor;
    }
});
const _common = require("@nestjs/common");
const _operators = require("rxjs/operators");
const _apiusageservice = require("../api-usage.service.js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let ApiUsageInterceptor = class ApiUsageInterceptor {
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const startTime = Date.now();
        return next.handle().pipe((0, _operators.tap)({
            next: ()=>{
                this.trackRequest(request, response, startTime);
            },
            error: ()=>{
                this.trackRequest(request, response, startTime);
            }
        }));
    }
    trackRequest(request, response, startTime) {
        const responseTime = Date.now() - startTime;
        // Only track if OAuth context is available
        const oauth = request.oauth;
        if (!oauth) {
            return;
        }
        // Extract request details
        const endpoint = request.route?.path || request.url;
        const method = request.method;
        const statusCode = response.statusCode;
        const ipAddress = this.getIpAddress(request);
        const userAgent = request.headers['user-agent'];
        // Record usage asynchronously (don't block response)
        this.apiUsageService.recordRequest({
            appId: oauth.app.id,
            companyId: oauth.companyId,
            userId: oauth.userId,
            endpoint,
            method,
            statusCode,
            responseTime,
            ipAddress,
            userAgent
        }).catch((error)=>{
            console.error('Failed to track API usage:', error);
        });
    }
    getIpAddress(request) {
        // Try various headers for the real IP (behind proxies)
        return request.headers['x-forwarded-for']?.split(',')[0] || request.headers['x-real-ip'] || request.connection?.remoteAddress || request.socket?.remoteAddress;
    }
    constructor(apiUsageService){
        this.apiUsageService = apiUsageService;
    }
};
ApiUsageInterceptor = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _apiusageservice.ApiUsageService === "undefined" ? Object : _apiusageservice.ApiUsageService
    ])
], ApiUsageInterceptor);

//# sourceMappingURL=api-usage.interceptor.js.map