"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "MetricsInterceptor", {
    enumerable: true,
    get: function() {
        return MetricsInterceptor;
    }
});
const _common = require("@nestjs/common");
const _operators = require("rxjs/operators");
const _metricsservice = require("./metrics.service.js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let MetricsInterceptor = class MetricsInterceptor {
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const startTime = Date.now();
        const method = request.method;
        const route = this.getRoute(request);
        return next.handle().pipe((0, _operators.tap)({
            next: ()=>{
                const duration = (Date.now() - startTime) / 1000; // Convert to seconds
                const statusCode = response.statusCode;
                this.metricsService.trackHttpRequest(method, route, statusCode, duration);
            },
            error: (error)=>{
                const duration = (Date.now() - startTime) / 1000;
                const statusCode = error.status || 500;
                this.metricsService.trackHttpRequest(method, route, statusCode, duration);
            }
        }));
    }
    /**
   * Get normalized route path (remove IDs)
   */ getRoute(request) {
        // Use route pattern if available, otherwise use path
        const route = request.route?.path || request.path;
        // Normalize: remove UUIDs and numeric IDs
        return route.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id').replace(/\/\d+/g, '/:id');
    }
    constructor(metricsService){
        this.metricsService = metricsService;
    }
};
MetricsInterceptor = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _metricsservice.MetricsService === "undefined" ? Object : _metricsservice.MetricsService
    ])
], MetricsInterceptor);

//# sourceMappingURL=metrics.interceptor.js.map