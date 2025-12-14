"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "Modelo721Controller", {
    enumerable: true,
    get: function() {
        return Modelo721Controller;
    }
});
const _common = require("@nestjs/common");
const _express = require("express");
const _modelo721service = require("./modelo721.service.js");
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
let Modelo721Controller = class Modelo721Controller {
    getCompanyId(headers) {
        const companyId = headers['x-company-id'];
        if (!companyId) {
            throw new _common.BadRequestException('X-Company-Id header is required');
        }
        return companyId;
    }
    async getModelo721(headers, yearStr) {
        const companyId = this.getCompanyId(headers);
        const year = parseInt(yearStr, 10);
        if (isNaN(year) || year < 2020 || year > new Date().getFullYear()) {
            throw new _common.BadRequestException('Invalid year');
        }
        return this.modelo721Service.generateModelo721(companyId, year);
    }
    async validateModelo721(headers, yearStr) {
        const companyId = this.getCompanyId(headers);
        const year = parseInt(yearStr, 10);
        if (isNaN(year) || year < 2020 || year > new Date().getFullYear()) {
            throw new _common.BadRequestException('Invalid year');
        }
        return this.modelo721Service.validateForSubmission(companyId, year);
    }
    async exportAEAT(headers, yearStr, res) {
        const companyId = this.getCompanyId(headers);
        const year = parseInt(yearStr, 10);
        if (isNaN(year) || year < 2020 || year > new Date().getFullYear()) {
            throw new _common.BadRequestException('Invalid year');
        }
        const content = await this.modelo721Service.exportToAEATFormat(companyId, year);
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Content-Disposition', `attachment; filename=modelo721_${year}.xml`);
        res.send(content);
    }
    async exportCSV(headers, yearStr, res) {
        const companyId = this.getCompanyId(headers);
        const year = parseInt(yearStr, 10);
        if (isNaN(year) || year < 2020 || year > new Date().getFullYear()) {
            throw new _common.BadRequestException('Invalid year');
        }
        const content = await this.modelo721Service.exportToCSV(companyId, year);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=modelo721_${year}.csv`);
        res.send('\uFEFF' + content); // BOM for Excel UTF-8
    }
    async getModelo720Crypto(headers, yearStr) {
        const companyId = this.getCompanyId(headers);
        const year = parseInt(yearStr, 10);
        if (isNaN(year) || year < 2020 || year > new Date().getFullYear()) {
            throw new _common.BadRequestException('Invalid year');
        }
        return this.modelo721Service.generateModelo720Crypto(companyId, year);
    }
    async exportModelo720AEAT(headers, yearStr, res) {
        const companyId = this.getCompanyId(headers);
        const year = parseInt(yearStr, 10);
        if (isNaN(year) || year < 2020 || year > new Date().getFullYear()) {
            throw new _common.BadRequestException('Invalid year');
        }
        const content = await this.modelo721Service.exportModelo720ToAEATFormat(companyId, year);
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Content-Disposition', `attachment; filename=modelo720_subgrupo8_${year}.xml`);
        res.send(content);
    }
    async getSummary(headers, yearStr) {
        const companyId = this.getCompanyId(headers);
        const year = parseInt(yearStr, 10);
        if (isNaN(year) || year < 2020 || year > new Date().getFullYear()) {
            throw new _common.BadRequestException('Invalid year');
        }
        return this.modelo721Service.getSummary(companyId, year);
    }
    constructor(modelo721Service){
        this.modelo721Service = modelo721Service;
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
], Modelo721Controller.prototype, "getModelo721", null);
_ts_decorate([
    (0, _common.Get)(':year/validate'),
    _ts_param(0, (0, _common.Headers)()),
    _ts_param(1, (0, _common.Param)('year')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], Modelo721Controller.prototype, "validateModelo721", null);
_ts_decorate([
    (0, _common.Get)(':year/export/aeat'),
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
], Modelo721Controller.prototype, "exportAEAT", null);
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
], Modelo721Controller.prototype, "exportCSV", null);
_ts_decorate([
    (0, _common.Get)(':year/modelo720'),
    _ts_param(0, (0, _common.Headers)()),
    _ts_param(1, (0, _common.Param)('year')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], Modelo721Controller.prototype, "getModelo720Crypto", null);
_ts_decorate([
    (0, _common.Get)(':year/modelo720/export/aeat'),
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
], Modelo721Controller.prototype, "exportModelo720AEAT", null);
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
], Modelo721Controller.prototype, "getSummary", null);
Modelo721Controller = _ts_decorate([
    (0, _common.Controller)('fiscal/modelo721'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _modelo721service.Modelo721Service === "undefined" ? Object : _modelo721service.Modelo721Service
    ])
], Modelo721Controller);

//# sourceMappingURL=modelo721.controller.js.map