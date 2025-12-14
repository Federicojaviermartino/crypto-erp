"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "TaxReportController", {
    enumerable: true,
    get: function() {
        return TaxReportController;
    }
});
const _common = require("@nestjs/common");
const _express = require("express");
const _taxreportservice = require("./tax-report.service.js");
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
let TaxReportController = class TaxReportController {
    getCompanyId(headers) {
        const companyId = headers['x-company-id'];
        if (!companyId) {
            throw new _common.BadRequestException('X-Company-Id header is required');
        }
        return companyId;
    }
    async getTaxReport(headers, yearStr) {
        const companyId = this.getCompanyId(headers);
        const year = parseInt(yearStr, 10);
        if (isNaN(year) || year < 2015 || year > new Date().getFullYear()) {
            throw new _common.BadRequestException('Invalid year');
        }
        return this.taxReportService.generateTaxReport(companyId, year);
    }
    async getTaxSummary(headers, yearStr) {
        const companyId = this.getCompanyId(headers);
        const year = parseInt(yearStr, 10);
        if (isNaN(year) || year < 2015 || year > new Date().getFullYear()) {
            throw new _common.BadRequestException('Invalid year');
        }
        const report = await this.taxReportService.generateTaxReport(companyId, year);
        // Return only summary without full transaction list
        return {
            year: report.year,
            generatedAt: report.generatedAt,
            shortTermGains: report.shortTermGains,
            shortTermLosses: report.shortTermLosses,
            longTermGains: report.longTermGains,
            longTermLosses: report.longTermLosses,
            totalGains: report.totalGains,
            totalLosses: report.totalLosses,
            netCapitalGain: report.netCapitalGain,
            estimatedTax: report.estimatedTax,
            transactionCount: report.transactions.length,
            byAsset: report.byAsset
        };
    }
    async getIRPFData(headers, yearStr) {
        const companyId = this.getCompanyId(headers);
        const year = parseInt(yearStr, 10);
        if (isNaN(year) || year < 2015 || year > new Date().getFullYear()) {
            throw new _common.BadRequestException('Invalid year');
        }
        return this.taxReportService.generateIRPFData(companyId, year);
    }
    async exportCSV(headers, yearStr, res) {
        const companyId = this.getCompanyId(headers);
        const year = parseInt(yearStr, 10);
        if (isNaN(year) || year < 2015 || year > new Date().getFullYear()) {
            throw new _common.BadRequestException('Invalid year');
        }
        const csv = await this.taxReportService.exportToCSV(companyId, year);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=tax_report_${year}.csv`);
        res.send('\uFEFF' + csv); // BOM for Excel UTF-8
    }
    constructor(taxReportService){
        this.taxReportService = taxReportService;
    }
};
_ts_decorate([
    (0, _common.Get)(':year'),
    _ts_param(0, (0, _common.Headers)()),
    _ts_param(1, (0, _common.Param)('year')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], TaxReportController.prototype, "getTaxReport", null);
_ts_decorate([
    (0, _common.Get)(':year/summary'),
    _ts_param(0, (0, _common.Headers)()),
    _ts_param(1, (0, _common.Param)('year')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], TaxReportController.prototype, "getTaxSummary", null);
_ts_decorate([
    (0, _common.Get)(':year/irpf'),
    _ts_param(0, (0, _common.Headers)()),
    _ts_param(1, (0, _common.Param)('year')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], TaxReportController.prototype, "getIRPFData", null);
_ts_decorate([
    (0, _common.Get)(':year/export/csv'),
    _ts_param(0, (0, _common.Headers)()),
    _ts_param(1, (0, _common.Param)('year')),
    _ts_param(2, (0, _common.Res)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record,
        String,
        typeof _express.Response === "undefined" ? Object : _express.Response
    ]),
    _ts_metadata("design:returntype", Promise)
], TaxReportController.prototype, "exportCSV", null);
TaxReportController = _ts_decorate([
    (0, _common.Controller)('fiscal/tax-report'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _taxreportservice.TaxReportService === "undefined" ? Object : _taxreportservice.TaxReportService
    ])
], TaxReportController);

//# sourceMappingURL=tax-report.controller.js.map