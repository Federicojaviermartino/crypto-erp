"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "VerifactuController", {
    enumerable: true,
    get: function() {
        return VerifactuController;
    }
});
const _common = require("@nestjs/common");
const _express = require("express");
const _verifactuservice = require("./verifactu.service.js");
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
let VerifactuController = class VerifactuController {
    getCompanyId(headers) {
        const companyId = headers['x-company-id'];
        if (!companyId) {
            throw new _common.BadRequestException('X-Company-Id header is required');
        }
        return companyId;
    }
    async generateRecord(headers, invoiceId) {
        const companyId = this.getCompanyId(headers);
        return this.verifactuService.generateVerifactuRecord(companyId, invoiceId);
    }
    async sendToAEAT(headers, invoiceId) {
        const companyId = this.getCompanyId(headers);
        return this.verifactuService.sendToAEAT(companyId, invoiceId);
    }
    async getStatus(headers, invoiceId) {
        const companyId = this.getCompanyId(headers);
        return this.verifactuService.getVerificationStatus(companyId, invoiceId);
    }
    async getXML(headers, invoiceId, res) {
        const companyId = this.getCompanyId(headers);
        const record = await this.verifactuService.generateVerifactuRecord(companyId, invoiceId);
        const xml = this.verifactuService.generateXML(record);
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Content-Disposition', `attachment; filename=verifactu_${invoiceId}.xml`);
        res.send(xml);
    }
    async validateChain(headers) {
        const companyId = this.getCompanyId(headers);
        return this.verifactuService.validateChainIntegrity(companyId);
    }
    constructor(verifactuService){
        this.verifactuService = verifactuService;
    }
};
_ts_decorate([
    (0, _common.Post)('invoices/:invoiceId/generate'),
    _ts_param(0, (0, _common.Headers)()),
    _ts_param(1, (0, _common.Param)('invoiceId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], VerifactuController.prototype, "generateRecord", null);
_ts_decorate([
    (0, _common.Post)('invoices/:invoiceId/send'),
    _ts_param(0, (0, _common.Headers)()),
    _ts_param(1, (0, _common.Param)('invoiceId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], VerifactuController.prototype, "sendToAEAT", null);
_ts_decorate([
    (0, _common.Get)('invoices/:invoiceId/status'),
    _ts_param(0, (0, _common.Headers)()),
    _ts_param(1, (0, _common.Param)('invoiceId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], VerifactuController.prototype, "getStatus", null);
_ts_decorate([
    (0, _common.Get)('invoices/:invoiceId/xml'),
    _ts_param(0, (0, _common.Headers)()),
    _ts_param(1, (0, _common.Param)('invoiceId')),
    _ts_param(2, (0, _common.Res)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record,
        String,
        typeof _express.Response === "undefined" ? Object : _express.Response
    ]),
    _ts_metadata("design:returntype", Promise)
], VerifactuController.prototype, "getXML", null);
_ts_decorate([
    (0, _common.Get)('chain/validate'),
    _ts_param(0, (0, _common.Headers)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record
    ]),
    _ts_metadata("design:returntype", Promise)
], VerifactuController.prototype, "validateChain", null);
VerifactuController = _ts_decorate([
    (0, _common.Controller)('invoicing/verifactu'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _verifactuservice.VerifactuService === "undefined" ? Object : _verifactuservice.VerifactuService
    ])
], VerifactuController);

//# sourceMappingURL=verifactu.controller.js.map