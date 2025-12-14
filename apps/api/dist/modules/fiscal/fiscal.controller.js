"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "FiscalController", {
    enumerable: true,
    get: function() {
        return FiscalController;
    }
});
const _common = require("@nestjs/common");
const _express = require("express");
const _swagger = require("@nestjs/swagger");
const _taxpredictionservice = require("./tax-prediction.service.js");
const _predicttaxdto = require("./dto/predict-tax.dto.js");
const _modelo347service = require("./modelo347.service.js");
const _siiservice = require("./sii.service.js");
const _libroregistroservice = require("./libro-registro.service.js");
const _generatemodelo347dto = require("./dto/generate-modelo347.dto.js");
const _generatelibroregistrodto = require("./dto/generate-libro-registro.dto.js");
const _jwtauthguard = require("../auth/guards/jwt-auth.guard.js");
const _rolesguard = require("../auth/guards/roles.guard.js");
const _rolesdecorator = require("../auth/decorators/roles.decorator.js");
const _getcompanydecorator = require("../auth/decorators/get-company.decorator.js");
const _client = require("@prisma/client");
const _auditabledecorator = require("../audit/decorators/auditable.decorator.js");
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
let FiscalController = class FiscalController {
    getCompanyId(headers) {
        const companyId = headers['x-company-id'];
        if (!companyId) {
            throw new _common.BadRequestException('X-Company-Id header is required');
        }
        return companyId;
    }
    async predictTaxImpact(headers, dto) {
        const companyId = this.getCompanyId(headers);
        return this.taxPredictionService.predictTaxImpact(companyId, dto);
    }
    /**
   * Calculate Modelo 347 data (preview)
   */ async calculateModelo347(companyId, dto) {
        return this.modelo347.calculateModelo347(companyId, dto.fiscalYear);
    }
    /**
   * Download Modelo 347 as XML (AEAT format)
   */ async downloadModelo347XML(companyId, dto, res) {
        const xml = await this.modelo347.generateXML(companyId, dto.fiscalYear);
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Content-Disposition', `attachment; filename="modelo347_${dto.fiscalYear}.xml"`);
        res.status(_common.HttpStatus.OK).send(xml);
    }
    /**
   * Download Modelo 347 as CSV (for accounting software)
   */ async downloadModelo347CSV(companyId, dto, res) {
        const csv = await this.modelo347.generateCSV(companyId, dto.fiscalYear);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="modelo347_${dto.fiscalYear}.csv"`);
        res.status(_common.HttpStatus.OK).send('\uFEFF' + csv); // Add BOM for Excel
    }
    /**
   * Get invoices pending SII submission
   */ async getSIIPendingInvoices(companyId) {
        return this.sii.getPendingSubmissions(companyId);
    }
    /**
   * Submit issued invoices to SII
   */ async submitIssuedInvoices(companyId, body) {
        return this.sii.submitIssuedInvoices(companyId, body.invoiceIds);
    }
    /**
   * Submit received invoices to SII
   */ async submitReceivedInvoices(companyId, body) {
        return this.sii.submitReceivedInvoices(companyId, body.invoiceIds);
    }
    /**
   * Generate Libro Registro de Facturas
   */ async generateLibroRegistro(companyId, dto) {
        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);
        return this.libroRegistro.generateLibroRegistro(companyId, startDate, endDate);
    }
    /**
   * Export Libro Registro to CSV
   */ async exportLibroRegistroCSV(companyId, dto, res) {
        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);
        const csv = await this.libroRegistro.exportToCSV(companyId, startDate, endDate, dto.type === 'emitidas' ? 'emitidas' : 'recibidas');
        const filename = `libro_registro_${dto.type}_${dto.startDate}_${dto.endDate}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(_common.HttpStatus.OK).send('\uFEFF' + csv); // Add BOM for Excel
    }
    /**
   * Export Libro Registro to Excel
   */ async exportLibroRegistroExcel(companyId, dto, res) {
        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);
        const filename = `libro_registro_${dto.startDate}_${dto.endDate}.xlsx`;
        const tmpFilePath = `/tmp/${filename}`;
        await this.libroRegistro.exportToExcel(companyId, startDate, endDate, tmpFilePath);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(_common.HttpStatus.OK).sendFile(tmpFilePath);
    }
    constructor(taxPredictionService, modelo347, sii, libroRegistro){
        this.taxPredictionService = taxPredictionService;
        this.modelo347 = modelo347;
        this.sii = sii;
        this.libroRegistro = libroRegistro;
    }
};
_ts_decorate([
    (0, _common.Post)('predict-tax-impact'),
    (0, _swagger.ApiOperation)({
        summary: 'Predict tax impact of a prospective crypto transaction',
        description: 'Simulates the tax consequences of selling or buying crypto assets using FIFO method. ' + 'Does not persist any data to the database. Returns capital gains/losses and estimated tax.'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Tax prediction calculated successfully',
        type: _predicttaxdto.TaxPredictionResponseDto
    }),
    (0, _swagger.ApiResponse)({
        status: 400,
        description: 'Invalid request parameters'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Crypto asset or company not found'
    }),
    _ts_param(0, (0, _common.Headers)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record,
        typeof _predicttaxdto.PredictTaxImpactDto === "undefined" ? Object : _predicttaxdto.PredictTaxImpactDto
    ]),
    _ts_metadata("design:returntype", Promise)
], FiscalController.prototype, "predictTaxImpact", null);
_ts_decorate([
    (0, _common.Get)('modelo347/calculate'),
    (0, _rolesdecorator.Roles)(_client.UserRole.ADMIN, _client.UserRole.OWNER),
    (0, _swagger.ApiOperation)({
        summary: 'Calculate Modelo 347 (preview)',
        description: 'Detects all operations with third parties exceeding 3,005.01€ for a fiscal year'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Modelo 347 calculated successfully'
    }),
    _ts_param(0, (0, _getcompanydecorator.GetCompany)()),
    _ts_param(1, (0, _common.Query)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _generatemodelo347dto.GenerateModelo347Dto === "undefined" ? Object : _generatemodelo347dto.GenerateModelo347Dto
    ]),
    _ts_metadata("design:returntype", Promise)
], FiscalController.prototype, "calculateModelo347", null);
_ts_decorate([
    (0, _common.Get)('modelo347/xml'),
    (0, _rolesdecorator.Roles)(_client.UserRole.ADMIN, _client.UserRole.OWNER),
    (0, _auditabledecorator.Auditable)('Modelo347'),
    (0, _swagger.ApiOperation)({
        summary: 'Download Modelo 347 XML',
        description: 'Generate and download Modelo 347 in AEAT XML format for submission'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'XML file generated successfully'
    }),
    _ts_param(0, (0, _getcompanydecorator.GetCompany)()),
    _ts_param(1, (0, _common.Query)()),
    _ts_param(2, (0, _common.Res)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _generatemodelo347dto.GenerateModelo347Dto === "undefined" ? Object : _generatemodelo347dto.GenerateModelo347Dto,
        typeof _express.Response === "undefined" ? Object : _express.Response
    ]),
    _ts_metadata("design:returntype", Promise)
], FiscalController.prototype, "downloadModelo347XML", null);
_ts_decorate([
    (0, _common.Get)('modelo347/csv'),
    (0, _rolesdecorator.Roles)(_client.UserRole.ADMIN, _client.UserRole.OWNER),
    (0, _auditabledecorator.Auditable)('Modelo347'),
    (0, _swagger.ApiOperation)({
        summary: 'Download Modelo 347 CSV',
        description: 'Generate and download Modelo 347 as CSV for accounting software'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'CSV file generated successfully'
    }),
    _ts_param(0, (0, _getcompanydecorator.GetCompany)()),
    _ts_param(1, (0, _common.Query)()),
    _ts_param(2, (0, _common.Res)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _generatemodelo347dto.GenerateModelo347Dto === "undefined" ? Object : _generatemodelo347dto.GenerateModelo347Dto,
        typeof _express.Response === "undefined" ? Object : _express.Response
    ]),
    _ts_metadata("design:returntype", Promise)
], FiscalController.prototype, "downloadModelo347CSV", null);
_ts_decorate([
    (0, _common.Get)('sii/pending'),
    (0, _rolesdecorator.Roles)(_client.UserRole.ADMIN, _client.UserRole.OWNER),
    (0, _swagger.ApiOperation)({
        summary: 'Get invoices pending SII submission',
        description: 'Returns invoices issued >4 days ago that have not been submitted to AEAT SII'
    }),
    _ts_param(0, (0, _getcompanydecorator.GetCompany)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], FiscalController.prototype, "getSIIPendingInvoices", null);
_ts_decorate([
    (0, _common.Post)('sii/submit-issued'),
    (0, _rolesdecorator.Roles)(_client.UserRole.ADMIN, _client.UserRole.OWNER),
    (0, _auditabledecorator.Auditable)('SII'),
    (0, _swagger.ApiOperation)({
        summary: 'Submit issued invoices to SII',
        description: 'Send issued invoices (Facturas Emitidas) to AEAT SII system'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Invoices submitted successfully'
    }),
    _ts_param(0, (0, _getcompanydecorator.GetCompany)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], FiscalController.prototype, "submitIssuedInvoices", null);
_ts_decorate([
    (0, _common.Post)('sii/submit-received'),
    (0, _rolesdecorator.Roles)(_client.UserRole.ADMIN, _client.UserRole.OWNER),
    (0, _auditabledecorator.Auditable)('SII'),
    (0, _swagger.ApiOperation)({
        summary: 'Submit received invoices to SII',
        description: 'Send received invoices (Facturas Recibidas) to AEAT SII system'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Invoices submitted successfully'
    }),
    _ts_param(0, (0, _getcompanydecorator.GetCompany)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], FiscalController.prototype, "submitReceivedInvoices", null);
_ts_decorate([
    (0, _common.Get)('libro-registro'),
    (0, _rolesdecorator.Roles)(_client.UserRole.ADMIN, _client.UserRole.OWNER),
    (0, _swagger.ApiOperation)({
        summary: 'Generate Libro Registro de Facturas',
        description: 'Generate the official invoice registry book for a given period'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Libro Registro generated successfully'
    }),
    _ts_param(0, (0, _getcompanydecorator.GetCompany)()),
    _ts_param(1, (0, _common.Query)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _generatelibroregistrodto.GenerateLibroRegistroDto === "undefined" ? Object : _generatelibroregistrodto.GenerateLibroRegistroDto
    ]),
    _ts_metadata("design:returntype", Promise)
], FiscalController.prototype, "generateLibroRegistro", null);
_ts_decorate([
    (0, _common.Get)('libro-registro/csv'),
    (0, _rolesdecorator.Roles)(_client.UserRole.ADMIN, _client.UserRole.OWNER),
    (0, _auditabledecorator.Auditable)('LibroRegistro'),
    (0, _swagger.ApiOperation)({
        summary: 'Export Libro Registro to CSV',
        description: 'Download Libro Registro as CSV file'
    }),
    _ts_param(0, (0, _getcompanydecorator.GetCompany)()),
    _ts_param(1, (0, _common.Query)()),
    _ts_param(2, (0, _common.Res)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _generatelibroregistrodto.GenerateLibroRegistroDto === "undefined" ? Object : _generatelibroregistrodto.GenerateLibroRegistroDto,
        typeof _express.Response === "undefined" ? Object : _express.Response
    ]),
    _ts_metadata("design:returntype", Promise)
], FiscalController.prototype, "exportLibroRegistroCSV", null);
_ts_decorate([
    (0, _common.Get)('libro-registro/excel'),
    (0, _rolesdecorator.Roles)(_client.UserRole.ADMIN, _client.UserRole.OWNER),
    (0, _auditabledecorator.Auditable)('LibroRegistro'),
    (0, _swagger.ApiOperation)({
        summary: 'Export Libro Registro to Excel',
        description: 'Download Libro Registro as Excel file with formatted sheets'
    }),
    _ts_param(0, (0, _getcompanydecorator.GetCompany)()),
    _ts_param(1, (0, _common.Query)()),
    _ts_param(2, (0, _common.Res)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _generatelibroregistrodto.GenerateLibroRegistroDto === "undefined" ? Object : _generatelibroregistrodto.GenerateLibroRegistroDto,
        typeof _express.Response === "undefined" ? Object : _express.Response
    ]),
    _ts_metadata("design:returntype", Promise)
], FiscalController.prototype, "exportLibroRegistroExcel", null);
FiscalController = _ts_decorate([
    (0, _swagger.ApiTags)('fiscal'),
    (0, _swagger.ApiBearerAuth)(),
    (0, _common.Controller)('fiscal'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard, _rolesguard.RolesGuard),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _taxpredictionservice.TaxPredictionService === "undefined" ? Object : _taxpredictionservice.TaxPredictionService,
        typeof _modelo347service.Modelo347Service === "undefined" ? Object : _modelo347service.Modelo347Service,
        typeof _siiservice.SIIService === "undefined" ? Object : _siiservice.SIIService,
        typeof _libroregistroservice.LibroRegistroService === "undefined" ? Object : _libroregistroservice.LibroRegistroService
    ])
], FiscalController);

//# sourceMappingURL=fiscal.controller.js.map