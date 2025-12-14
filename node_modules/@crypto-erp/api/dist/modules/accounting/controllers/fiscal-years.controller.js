"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "FiscalYearsController", {
    enumerable: true,
    get: function() {
        return FiscalYearsController;
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
let FiscalYearsController = class FiscalYearsController {
    async findAll(companyId) {
        return this.fiscalYearsService.findAll(companyId);
    }
    async findCurrent(companyId) {
        const fiscalYear = await this.fiscalYearsService.findCurrent(companyId);
        if (!fiscalYear) {
            return {
                error: 'No active fiscal year found for current date'
            };
        }
        return fiscalYear;
    }
    async findById(companyId, id) {
        return this.fiscalYearsService.findById(companyId, id);
    }
    async getStats(companyId, id) {
        return this.fiscalYearsService.getStats(companyId, id);
    }
    async create(companyId, dto) {
        return this.fiscalYearsService.create(companyId, dto);
    }
    async update(companyId, id, dto) {
        return this.fiscalYearsService.update(companyId, id, dto);
    }
    async close(companyId, id) {
        return this.fiscalYearsService.close(companyId, id);
    }
    async reopen(companyId, id) {
        return this.fiscalYearsService.reopen(companyId, id);
    }
    async delete(companyId, id) {
        await this.fiscalYearsService.delete(companyId, id);
    }
    constructor(fiscalYearsService){
        this.fiscalYearsService = fiscalYearsService;
    }
};
_ts_decorate([
    (0, _common.Get)(),
    (0, _swagger.ApiOperation)({
        summary: 'List all fiscal years'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Returns list of fiscal years'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], FiscalYearsController.prototype, "findAll", null);
_ts_decorate([
    (0, _common.Get)('current'),
    (0, _swagger.ApiOperation)({
        summary: 'Get current fiscal year'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Returns current fiscal year'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'No active fiscal year found'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], FiscalYearsController.prototype, "findCurrent", null);
_ts_decorate([
    (0, _common.Get)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Get fiscal year by ID'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Fiscal year ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Returns fiscal year details'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Fiscal year not found'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], FiscalYearsController.prototype, "findById", null);
_ts_decorate([
    (0, _common.Get)(':id/stats'),
    (0, _swagger.ApiOperation)({
        summary: 'Get fiscal year statistics'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Fiscal year ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Returns fiscal year statistics'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], FiscalYearsController.prototype, "getStats", null);
_ts_decorate([
    (0, _common.Post)(),
    (0, _swagger.ApiOperation)({
        summary: 'Create a new fiscal year'
    }),
    (0, _swagger.ApiResponse)({
        status: 201,
        description: 'Fiscal year created successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 409,
        description: 'Overlapping or duplicate fiscal year'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _index3.CreateFiscalYearDto === "undefined" ? Object : _index3.CreateFiscalYearDto
    ]),
    _ts_metadata("design:returntype", Promise)
], FiscalYearsController.prototype, "create", null);
_ts_decorate([
    (0, _common.Put)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Update a fiscal year'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Fiscal year ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Fiscal year updated successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Fiscal year not found'
    }),
    (0, _swagger.ApiResponse)({
        status: 409,
        description: 'Cannot modify closed fiscal year'
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
], FiscalYearsController.prototype, "update", null);
_ts_decorate([
    (0, _common.Patch)(':id/close'),
    (0, _swagger.ApiOperation)({
        summary: 'Close a fiscal year'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Fiscal year ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Fiscal year closed successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 400,
        description: 'Draft entries exist'
    }),
    (0, _swagger.ApiResponse)({
        status: 409,
        description: 'Already closed'
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
], FiscalYearsController.prototype, "close", null);
_ts_decorate([
    (0, _common.Patch)(':id/reopen'),
    (0, _swagger.ApiOperation)({
        summary: 'Reopen a closed fiscal year'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Fiscal year ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Fiscal year reopened successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 409,
        description: 'Fiscal year is not closed'
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
], FiscalYearsController.prototype, "reopen", null);
_ts_decorate([
    (0, _common.Delete)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Delete a fiscal year'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Fiscal year ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 204,
        description: 'Fiscal year deleted successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Fiscal year not found'
    }),
    (0, _swagger.ApiResponse)({
        status: 409,
        description: 'Cannot delete fiscal year with entries'
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
], FiscalYearsController.prototype, "delete", null);
FiscalYearsController = _ts_decorate([
    (0, _swagger.ApiTags)('Fiscal Years'),
    (0, _swagger.ApiBearerAuth)(),
    (0, _common.UseGuards)(_index.JwtAuthGuard, _index.TenantGuard),
    (0, _common.Controller)('fiscal-years'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _index2.FiscalYearsService === "undefined" ? Object : _index2.FiscalYearsService
    ])
], FiscalYearsController);

//# sourceMappingURL=fiscal-years.controller.js.map