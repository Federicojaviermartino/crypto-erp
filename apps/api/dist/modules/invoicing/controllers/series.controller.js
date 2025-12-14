"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SeriesController", {
    enumerable: true,
    get: function() {
        return SeriesController;
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
let SeriesController = class SeriesController {
    async findAll(companyId) {
        return this.seriesService.findAll(companyId);
    }
    async findById(companyId, id) {
        return this.seriesService.findById(companyId, id);
    }
    async getStats(companyId, id) {
        return this.seriesService.getStats(companyId, id);
    }
    async create(companyId, dto) {
        return this.seriesService.create(companyId, dto);
    }
    async update(companyId, id, dto) {
        return this.seriesService.update(companyId, id, dto);
    }
    async delete(companyId, id) {
        await this.seriesService.delete(companyId, id);
    }
    constructor(seriesService){
        this.seriesService = seriesService;
    }
};
_ts_decorate([
    (0, _common.Get)(),
    (0, _swagger.ApiOperation)({
        summary: 'List all invoice series'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Returns list of invoice series'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], SeriesController.prototype, "findAll", null);
_ts_decorate([
    (0, _common.Get)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Get invoice series by ID'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Series ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Returns series details'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Series not found'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], SeriesController.prototype, "findById", null);
_ts_decorate([
    (0, _common.Get)(':id/stats'),
    (0, _swagger.ApiOperation)({
        summary: 'Get invoice series statistics'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Series ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Returns series statistics'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], SeriesController.prototype, "getStats", null);
_ts_decorate([
    (0, _common.Post)(),
    (0, _swagger.ApiOperation)({
        summary: 'Create a new invoice series'
    }),
    (0, _swagger.ApiResponse)({
        status: 201,
        description: 'Series created successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 409,
        description: 'Series with prefix already exists'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _index3.CreateSeriesDto === "undefined" ? Object : _index3.CreateSeriesDto
    ]),
    _ts_metadata("design:returntype", Promise)
], SeriesController.prototype, "create", null);
_ts_decorate([
    (0, _common.Put)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Update an invoice series'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Series ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Series updated successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Series not found'
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
], SeriesController.prototype, "update", null);
_ts_decorate([
    (0, _common.Delete)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Delete an invoice series'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Series ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 204,
        description: 'Series deleted successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 409,
        description: 'Cannot delete series with invoices'
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
], SeriesController.prototype, "delete", null);
SeriesController = _ts_decorate([
    (0, _swagger.ApiTags)('Invoice Series'),
    (0, _swagger.ApiBearerAuth)(),
    (0, _common.UseGuards)(_index.JwtAuthGuard, _index.TenantGuard),
    (0, _common.Controller)('invoice-series'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _index2.SeriesService === "undefined" ? Object : _index2.SeriesService
    ])
], SeriesController);

//# sourceMappingURL=series.controller.js.map