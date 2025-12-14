"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "InvoicesController", {
    enumerable: true,
    get: function() {
        return InvoicesController;
    }
});
const _common = require("@nestjs/common");
const _swagger = require("@nestjs/swagger");
const _express = require("express");
const _index = require("../../../common/guards");
const _index1 = require("../../../common/decorators");
const _index2 = require("../services");
const _invoicepdfservice = require("../services/invoice-pdf.service.js");
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
let InvoicesController = class InvoicesController {
    async findAll(companyId, query) {
        return this.invoicesService.findAll(companyId, query);
    }
    async findById(companyId, id) {
        return this.invoicesService.findById(companyId, id);
    }
    async getVerifactuQR(companyId, id) {
        const qrData = await this.invoicesService.getVerifactuQR(companyId, id);
        return {
            qrData
        };
    }
    async createSales(companyId, user, dto) {
        return this.invoicesService.create(companyId, user.sub, dto, 'ISSUED');
    }
    async createPurchase(companyId, user, dto) {
        return this.invoicesService.create(companyId, user.sub, dto, 'RECEIVED');
    }
    async update(companyId, id, dto) {
        return this.invoicesService.update(companyId, id, dto);
    }
    async issue(companyId, id) {
        return this.invoicesService.issue(companyId, id);
    }
    async markAsPaid(companyId, id, body) {
        return this.invoicesService.markAsPaid(companyId, id, body.paidAt ? new Date(body.paidAt) : undefined);
    }
    async cancel(companyId, id) {
        return this.invoicesService.cancel(companyId, id);
    }
    async delete(companyId, id) {
        await this.invoicesService.delete(companyId, id);
    }
    async downloadPdf(companyId, id, lang = 'es', res) {
        const invoice = await this.invoicesService.findById(companyId, id);
        const pdfBuffer = await this.pdfService.generatePdf(companyId, id, {
            language: lang,
            includeQR: true
        });
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="factura-${invoice.fullNumber}.pdf"`,
            'Content-Length': pdfBuffer.length
        });
        res.end(pdfBuffer);
    }
    async previewPdf(companyId, id, lang = 'es', res) {
        const invoice = await this.invoicesService.findById(companyId, id);
        const pdfBuffer = await this.pdfService.generatePdf(companyId, id, {
            language: lang,
            includeQR: true
        });
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="factura-${invoice.fullNumber}.pdf"`,
            'Content-Length': pdfBuffer.length
        });
        res.end(pdfBuffer);
    }
    constructor(invoicesService, pdfService){
        this.invoicesService = invoicesService;
        this.pdfService = pdfService;
    }
};
_ts_decorate([
    (0, _common.Get)(),
    (0, _swagger.ApiOperation)({
        summary: 'List all invoices'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Returns paginated list of invoices'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Query)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _index3.QueryInvoicesDto === "undefined" ? Object : _index3.QueryInvoicesDto
    ]),
    _ts_metadata("design:returntype", Promise)
], InvoicesController.prototype, "findAll", null);
_ts_decorate([
    (0, _common.Get)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Get invoice by ID'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Invoice ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Returns invoice details with lines'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Invoice not found'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], InvoicesController.prototype, "findById", null);
_ts_decorate([
    (0, _common.Get)(':id/verifactu-qr'),
    (0, _swagger.ApiOperation)({
        summary: 'Get Verifactu QR code data for an invoice'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Invoice ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Returns QR code data for Verifactu'
    }),
    (0, _swagger.ApiResponse)({
        status: 400,
        description: 'Invoice not registered with Verifactu'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], InvoicesController.prototype, "getVerifactuQR", null);
_ts_decorate([
    (0, _common.Post)('sales'),
    (0, _swagger.ApiOperation)({
        summary: 'Create a new sales invoice'
    }),
    (0, _swagger.ApiResponse)({
        status: 201,
        description: 'Sales invoice created successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 400,
        description: 'Invalid data'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _index1.CurrentUser)()),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof JwtPayload === "undefined" ? Object : JwtPayload,
        typeof _index3.CreateInvoiceDto === "undefined" ? Object : _index3.CreateInvoiceDto
    ]),
    _ts_metadata("design:returntype", Promise)
], InvoicesController.prototype, "createSales", null);
_ts_decorate([
    (0, _common.Post)('purchases'),
    (0, _swagger.ApiOperation)({
        summary: 'Create a new purchase invoice'
    }),
    (0, _swagger.ApiResponse)({
        status: 201,
        description: 'Purchase invoice created successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 400,
        description: 'Invalid data'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _index1.CurrentUser)()),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof JwtPayload === "undefined" ? Object : JwtPayload,
        typeof _index3.CreateInvoiceDto === "undefined" ? Object : _index3.CreateInvoiceDto
    ]),
    _ts_metadata("design:returntype", Promise)
], InvoicesController.prototype, "createPurchase", null);
_ts_decorate([
    (0, _common.Put)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Update a draft invoice'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Invoice ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Invoice updated successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Invoice not found'
    }),
    (0, _swagger.ApiResponse)({
        status: 409,
        description: 'Only draft invoices can be modified'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String,
        typeof Partial === "undefined" ? Object : Partial
    ]),
    _ts_metadata("design:returntype", Promise)
], InvoicesController.prototype, "update", null);
_ts_decorate([
    (0, _common.Patch)(':id/issue'),
    (0, _swagger.ApiOperation)({
        summary: 'Issue an invoice (registers with Verifactu for sales)'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Invoice ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Invoice issued successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 400,
        description: 'Verifactu registration failed'
    }),
    (0, _swagger.ApiResponse)({
        status: 409,
        description: 'Only draft invoices can be issued'
    }),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], InvoicesController.prototype, "issue", null);
_ts_decorate([
    (0, _common.Patch)(':id/paid'),
    (0, _swagger.ApiOperation)({
        summary: 'Mark an invoice as paid'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Invoice ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Invoice marked as paid'
    }),
    (0, _swagger.ApiResponse)({
        status: 409,
        description: 'Only issued/sent invoices can be marked as paid'
    }),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], InvoicesController.prototype, "markAsPaid", null);
_ts_decorate([
    (0, _common.Patch)(':id/cancel'),
    (0, _swagger.ApiOperation)({
        summary: 'Cancel an invoice'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Invoice ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Invoice cancelled'
    }),
    (0, _swagger.ApiResponse)({
        status: 400,
        description: 'Cannot cancel Verifactu-registered invoice'
    }),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], InvoicesController.prototype, "cancel", null);
_ts_decorate([
    (0, _common.Delete)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Delete a draft invoice'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Invoice ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 204,
        description: 'Invoice deleted successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 409,
        description: 'Only draft invoices can be deleted'
    }),
    (0, _common.HttpCode)(_common.HttpStatus.NO_CONTENT),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], InvoicesController.prototype, "delete", null);
_ts_decorate([
    (0, _common.Get)(':id/pdf'),
    (0, _swagger.ApiOperation)({
        summary: 'Download invoice as PDF'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Invoice ID'
    }),
    (0, _swagger.ApiQuery)({
        name: 'lang',
        required: false,
        enum: [
            'es',
            'en'
        ],
        description: 'PDF language'
    }),
    (0, _swagger.ApiProduces)('application/pdf'),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Returns PDF file'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Invoice not found'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Query)('lang')),
    _ts_param(3, (0, _common.Res)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String,
        String,
        typeof _express.Response === "undefined" ? Object : _express.Response
    ]),
    _ts_metadata("design:returntype", Promise)
], InvoicesController.prototype, "downloadPdf", null);
_ts_decorate([
    (0, _common.Get)(':id/pdf/preview'),
    (0, _swagger.ApiOperation)({
        summary: 'Preview invoice PDF in browser'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Invoice ID'
    }),
    (0, _swagger.ApiQuery)({
        name: 'lang',
        required: false,
        enum: [
            'es',
            'en'
        ],
        description: 'PDF language'
    }),
    (0, _swagger.ApiProduces)('application/pdf'),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Returns PDF for inline viewing'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Invoice not found'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Query)('lang')),
    _ts_param(3, (0, _common.Res)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String,
        String,
        typeof _express.Response === "undefined" ? Object : _express.Response
    ]),
    _ts_metadata("design:returntype", Promise)
], InvoicesController.prototype, "previewPdf", null);
InvoicesController = _ts_decorate([
    (0, _swagger.ApiTags)('Invoices'),
    (0, _swagger.ApiBearerAuth)(),
    (0, _common.UseGuards)(_index.JwtAuthGuard, _index.TenantGuard),
    (0, _common.Controller)('invoices'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _index2.InvoicesService === "undefined" ? Object : _index2.InvoicesService,
        typeof _invoicepdfservice.InvoicePdfService === "undefined" ? Object : _invoicepdfservice.InvoicePdfService
    ])
], InvoicesController);

//# sourceMappingURL=invoices.controller.js.map