"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "MetricsController", {
    enumerable: true,
    get: function() {
        return MetricsController;
    }
});
const _common = require("@nestjs/common");
const _swagger = require("@nestjs/swagger");
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
let MetricsController = class MetricsController {
    /**
   * Prometheus metrics endpoint
   * This endpoint is scraped by Prometheus server
   */ async getMetrics() {
        return this.metricsService.getMetrics();
    }
    /**
   * Custom metrics summary (JSON format for dashboards)
   */ async getMetricsSummary() {
        // This could return a JSON version of key metrics
        // Useful for custom dashboards or monitoring tools
        return {
            message: 'Use /metrics endpoint for Prometheus scraping',
            endpoints: {
                prometheus: '/metrics',
                health: '/health'
            }
        };
    }
    constructor(metricsService){
        this.metricsService = metricsService;
    }
};
_ts_decorate([
    (0, _common.Get)('metrics'),
    (0, _swagger.ApiExcludeEndpoint)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], MetricsController.prototype, "getMetrics", null);
_ts_decorate([
    (0, _common.Get)('metrics/summary'),
    (0, _swagger.ApiOperation)({
        summary: 'Get metrics summary',
        description: 'Returns a JSON summary of key metrics for custom dashboards'
    }),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], MetricsController.prototype, "getMetricsSummary", null);
MetricsController = _ts_decorate([
    (0, _swagger.ApiTags)('monitoring'),
    (0, _common.Controller)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _metricsservice.MetricsService === "undefined" ? Object : _metricsservice.MetricsService
    ])
], MetricsController);

//# sourceMappingURL=metrics.controller.js.map