"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CryptoAssetsController", {
    enumerable: true,
    get: function() {
        return CryptoAssetsController;
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
let CryptoAssetsController = class CryptoAssetsController {
    async findAll(companyId) {
        return this.cryptoAssetsService.findAll(companyId);
    }
    async findById(companyId, id) {
        return this.cryptoAssetsService.findById(companyId, id);
    }
    async findBySymbol(companyId, symbol) {
        const asset = await this.cryptoAssetsService.findBySymbol(companyId, symbol);
        if (!asset) {
            return {
                error: 'Asset not found',
                symbol
            };
        }
        return asset;
    }
    async create(companyId, dto) {
        return this.cryptoAssetsService.create(companyId, dto);
    }
    async update(companyId, id, dto) {
        return this.cryptoAssetsService.update(companyId, id, dto);
    }
    async delete(companyId, id) {
        await this.cryptoAssetsService.delete(companyId, id);
    }
    constructor(cryptoAssetsService){
        this.cryptoAssetsService = cryptoAssetsService;
    }
};
_ts_decorate([
    (0, _common.Get)(),
    (0, _swagger.ApiOperation)({
        summary: 'List all crypto assets'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Returns list of crypto assets'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], CryptoAssetsController.prototype, "findAll", null);
_ts_decorate([
    (0, _common.Get)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Get crypto asset by ID'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Asset ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Returns asset details'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Asset not found'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], CryptoAssetsController.prototype, "findById", null);
_ts_decorate([
    (0, _common.Get)('symbol/:symbol'),
    (0, _swagger.ApiOperation)({
        summary: 'Get crypto asset by symbol'
    }),
    (0, _swagger.ApiParam)({
        name: 'symbol',
        description: 'Asset symbol (e.g., BTC, ETH)'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Returns asset details'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('symbol')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], CryptoAssetsController.prototype, "findBySymbol", null);
_ts_decorate([
    (0, _common.Post)(),
    (0, _swagger.ApiOperation)({
        summary: 'Create a new crypto asset'
    }),
    (0, _swagger.ApiResponse)({
        status: 201,
        description: 'Asset created successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 409,
        description: 'Asset with symbol already exists'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _index3.CreateCryptoAssetDto === "undefined" ? Object : _index3.CreateCryptoAssetDto
    ]),
    _ts_metadata("design:returntype", Promise)
], CryptoAssetsController.prototype, "create", null);
_ts_decorate([
    (0, _common.Put)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Update a crypto asset'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Asset ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Asset updated successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Asset not found'
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
], CryptoAssetsController.prototype, "update", null);
_ts_decorate([
    (0, _common.Delete)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Delete a crypto asset'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Asset ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 204,
        description: 'Asset deleted successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 409,
        description: 'Cannot delete asset with transactions'
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
], CryptoAssetsController.prototype, "delete", null);
CryptoAssetsController = _ts_decorate([
    (0, _swagger.ApiTags)('Crypto Assets'),
    (0, _swagger.ApiBearerAuth)(),
    (0, _common.UseGuards)(_index.JwtAuthGuard, _index.TenantGuard),
    (0, _common.Controller)('crypto/assets'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _index2.CryptoAssetsService === "undefined" ? Object : _index2.CryptoAssetsService
    ])
], CryptoAssetsController);

//# sourceMappingURL=crypto-assets.controller.js.map