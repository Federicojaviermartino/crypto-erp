"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AnalyticsController", {
    enumerable: true,
    get: function() {
        return AnalyticsController;
    }
});
const _common = require("@nestjs/common");
const _analyticsservice = require("./analytics.service.js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
function _ts_param(paramIndex, decorator) {
    return function(target, key) {
        decorator(target, key, paramIndex);
    };
}
let AnalyticsController = class AnalyticsController {
    getCompanyId(headers) {
        const companyId = headers['x-company-id'];
        if (!companyId) {
            throw new _common.BadRequestException('X-Company-Id header is required');
        }
        return companyId;
    }
    async getDashboardMetrics(headers) {
        const companyId = this.getCompanyId(headers);
        return this.analyticsService.getDashboardMetrics(companyId);
    }
    async getPortfolioOverview(headers) {
        const companyId = this.getCompanyId(headers);
        return this.analyticsService.getPortfolioOverview(companyId);
    }
    async getTransactionStats(headers, startDateStr, endDateStr) {
        const companyId = this.getCompanyId(headers);
        const startDate = startDateStr ? new Date(startDateStr) : undefined;
        const endDate = endDateStr ? new Date(endDateStr) : undefined;
        return this.analyticsService.getTransactionStats(companyId, startDate, endDate);
    }
    async getMonthlyData(headers, monthsStr) {
        const companyId = this.getCompanyId(headers);
        const months = monthsStr ? parseInt(monthsStr, 10) : 12;
        if (isNaN(months) || months < 1 || months > 24) {
            throw new _common.BadRequestException('Months must be between 1 and 24');
        }
        return this.analyticsService.getMonthlyData(companyId, months);
    }
    // ============================================================================
    // PHASE 4 - ADVANCED ANALYTICS ENDPOINTS
    // ============================================================================
    /**
   * Get revenue analytics (MRR, ARR, total revenue, growth)
   * GET /analytics/revenue?startDate=2025-01-01&endDate=2025-12-31
   */ async getRevenueMetrics(headers, startDateStr, endDateStr) {
        const companyId = this.getCompanyId(headers);
        // Default to current month if not provided
        const now = new Date();
        const startDate = startDateStr ? new Date(startDateStr) : new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = endDateStr ? new Date(endDateStr) : now;
        return this.analyticsService.getRevenueMetrics(companyId, startDate, endDate);
    }
    /**
   * Get user behavior analytics (active users, churn rate)
   * GET /analytics/users?startDate=2025-01-01&endDate=2025-12-31
   */ async getUserMetrics(headers, startDateStr, endDateStr) {
        const companyId = this.getCompanyId(headers);
        const now = new Date();
        const startDate = startDateStr ? new Date(startDateStr) : new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = endDateStr ? new Date(endDateStr) : now;
        return this.analyticsService.getUserMetrics(companyId, startDate, endDate);
    }
    constructor(analyticsService){
        this.analyticsService = analyticsService;
    }
};
_ts_decorate([
    (0, _common.Get)('dashboard'),
    _ts_param(0, (0, _common.Headers)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record
    ]),
    _ts_metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getDashboardMetrics", null);
_ts_decorate([
    (0, _common.Get)('portfolio'),
    _ts_param(0, (0, _common.Headers)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record
    ]),
    _ts_metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getPortfolioOverview", null);
_ts_decorate([
    (0, _common.Get)('transactions/stats'),
    _ts_param(0, (0, _common.Headers)()),
    _ts_param(1, (0, _common.Query)('startDate')),
    _ts_param(2, (0, _common.Query)('endDate')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getTransactionStats", null);
_ts_decorate([
    (0, _common.Get)('charts/monthly'),
    _ts_param(0, (0, _common.Headers)()),
    _ts_param(1, (0, _common.Query)('months')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getMonthlyData", null);
_ts_decorate([
    (0, _common.Get)('revenue'),
    _ts_param(0, (0, _common.Headers)()),
    _ts_param(1, (0, _common.Query)('startDate')),
    _ts_param(2, (0, _common.Query)('endDate')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getRevenueMetrics", null);
_ts_decorate([
    (0, _common.Get)('users'),
    _ts_param(0, (0, _common.Headers)()),
    _ts_param(1, (0, _common.Query)('startDate')),
    _ts_param(2, (0, _common.Query)('endDate')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getUserMetrics", null);
AnalyticsController = _ts_decorate([
    (0, _common.Controller)('analytics'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _analyticsservice.AnalyticsService === "undefined" ? Object : _analyticsservice.AnalyticsService
    ])
], AnalyticsController);

//# sourceMappingURL=analytics.controller.js.map