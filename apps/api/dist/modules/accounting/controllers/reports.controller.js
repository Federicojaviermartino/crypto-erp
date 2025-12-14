"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ReportsController", {
    enumerable: true,
    get: function() {
        return ReportsController;
    }
});
const _common = require("@nestjs/common");
const _swagger = require("@nestjs/swagger");
const _index = require("../../../common/guards");
const _index1 = require("../../../common/decorators");
const _index2 = require("../services");
const _index3 = require("../dto");
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
let ReportsController = class ReportsController {
    async getTrialBalance(companyId, query) {
        return this.reportsService.getTrialBalance(companyId, {
            fiscalYearId: query.fiscalYearId,
            startDate: query.startDate ? new Date(query.startDate) : undefined,
            endDate: query.endDate ? new Date(query.endDate) : undefined
        });
    }
    async getBalanceSheet(companyId, asOfDate) {
        return this.reportsService.getBalanceSheet(companyId, asOfDate ? new Date(asOfDate) : new Date());
    }
    async getIncomeStatement(companyId, startDate, endDate) {
        if (!startDate || !endDate) {
            return {
                error: 'Both startDate and endDate are required'
            };
        }
        return this.reportsService.getIncomeStatement(companyId, new Date(startDate), new Date(endDate));
    }
    async getGeneralLedger(companyId, accountId, startDate, endDate) {
        return this.reportsService.getGeneralLedger(companyId, accountId, {
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined
        });
    }
    constructor(reportsService){
        this.reportsService = reportsService;
    }
};
_ts_decorate([
    (0, _common.Get)('trial-balance'),
    (0, _swagger.ApiOperation)({
        summary: 'Generate trial balance report'
    }),
    (0, _swagger.ApiQuery)({
        name: 'fiscalYearId',
        required: false,
        description: 'Filter by fiscal year'
    }),
    (0, _swagger.ApiQuery)({
        name: 'startDate',
        required: false,
        description: 'Start date (YYYY-MM-DD)'
    }),
    (0, _swagger.ApiQuery)({
        name: 'endDate',
        required: false,
        description: 'End date (YYYY-MM-DD)'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Returns trial balance report'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Query)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _index3.QueryReportsDto === "undefined" ? Object : _index3.QueryReportsDto
    ]),
    _ts_metadata("design:returntype", Promise)
], ReportsController.prototype, "getTrialBalance", null);
_ts_decorate([
    (0, _common.Get)('balance-sheet'),
    (0, _swagger.ApiOperation)({
        summary: 'Generate balance sheet report'
    }),
    (0, _swagger.ApiQuery)({
        name: 'asOfDate',
        required: false,
        description: 'As of date (YYYY-MM-DD), defaults to today'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Returns balance sheet report'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Query)('asOfDate')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], ReportsController.prototype, "getBalanceSheet", null);
_ts_decorate([
    (0, _common.Get)('income-statement'),
    (0, _swagger.ApiOperation)({
        summary: 'Generate income statement (P&L) report'
    }),
    (0, _swagger.ApiQuery)({
        name: 'startDate',
        required: true,
        description: 'Start date (YYYY-MM-DD)'
    }),
    (0, _swagger.ApiQuery)({
        name: 'endDate',
        required: true,
        description: 'End date (YYYY-MM-DD)'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Returns income statement report'
    }),
    (0, _swagger.ApiResponse)({
        status: 400,
        description: 'Missing required date parameters'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Query)('startDate')),
    _ts_param(2, (0, _common.Query)('endDate')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], ReportsController.prototype, "getIncomeStatement", null);
_ts_decorate([
    (0, _common.Get)('general-ledger/:accountId'),
    (0, _swagger.ApiOperation)({
        summary: 'Generate general ledger report for an account'
    }),
    (0, _swagger.ApiParam)({
        name: 'accountId',
        description: 'Account ID'
    }),
    (0, _swagger.ApiQuery)({
        name: 'startDate',
        required: false,
        description: 'Start date (YYYY-MM-DD)'
    }),
    (0, _swagger.ApiQuery)({
        name: 'endDate',
        required: false,
        description: 'End date (YYYY-MM-DD)'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Returns general ledger report'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Account not found'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('accountId')),
    _ts_param(2, (0, _common.Query)('startDate')),
    _ts_param(3, (0, _common.Query)('endDate')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], ReportsController.prototype, "getGeneralLedger", null);
ReportsController = _ts_decorate([
    (0, _swagger.ApiTags)('Accounting Reports'),
    (0, _swagger.ApiBearerAuth)(),
    (0, _common.UseGuards)(_index.JwtAuthGuard, _index.TenantGuard),
    (0, _common.Controller)('reports'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _index2.ReportsService === "undefined" ? Object : _index2.ReportsService
    ])
], ReportsController);

//# sourceMappingURL=reports.controller.js.map