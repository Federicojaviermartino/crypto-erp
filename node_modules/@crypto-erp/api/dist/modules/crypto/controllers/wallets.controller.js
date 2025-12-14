"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "WalletsController", {
    enumerable: true,
    get: function() {
        return WalletsController;
    }
});
const _common = require("@nestjs/common");
const _swagger = require("@nestjs/swagger");
const _index = require("../../../common/guards");
const _index1 = require("../../../common/decorators");
const _walletsservice = require("../services/wallets.service.js");
const _index2 = require("../dto");
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
let WalletsController = class WalletsController {
    async findAll(companyId) {
        const wallets = await this.walletsService.findAll(companyId);
        return {
            wallets
        };
    }
    async findById(companyId, id) {
        return this.walletsService.findById(companyId, id);
    }
    async getWithBalances(companyId, id) {
        return this.walletsService.getWalletWithBalances(companyId, id);
    }
    async getStats(companyId, id) {
        return this.walletsService.getWalletStats(companyId, id);
    }
    async create(companyId, dto) {
        return this.walletsService.create(companyId, dto);
    }
    async update(companyId, id, dto) {
        return this.walletsService.update(companyId, id, dto);
    }
    async delete(companyId, id) {
        await this.walletsService.delete(companyId, id);
    }
    constructor(walletsService){
        this.walletsService = walletsService;
    }
};
_ts_decorate([
    (0, _common.Get)(),
    (0, _swagger.ApiOperation)({
        summary: 'List all wallets'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'List of wallets'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], WalletsController.prototype, "findAll", null);
_ts_decorate([
    (0, _common.Get)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Get wallet by ID'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Wallet ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Wallet details'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], WalletsController.prototype, "findById", null);
_ts_decorate([
    (0, _common.Get)(':id/balances'),
    (0, _swagger.ApiOperation)({
        summary: 'Get wallet with current balances from blockchain'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Wallet ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Wallet with current blockchain balances'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], WalletsController.prototype, "getWithBalances", null);
_ts_decorate([
    (0, _common.Get)(':id/stats'),
    (0, _swagger.ApiOperation)({
        summary: 'Get wallet statistics'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Wallet ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Wallet statistics'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], WalletsController.prototype, "getStats", null);
_ts_decorate([
    (0, _common.Post)(),
    (0, _swagger.ApiOperation)({
        summary: 'Add a new wallet'
    }),
    (0, _swagger.ApiResponse)({
        status: 201,
        description: 'Wallet created successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 409,
        description: 'Wallet already exists'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _index2.CreateWalletDto === "undefined" ? Object : _index2.CreateWalletDto
    ]),
    _ts_metadata("design:returntype", Promise)
], WalletsController.prototype, "create", null);
_ts_decorate([
    (0, _common.Put)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Update wallet'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Wallet ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Wallet updated successfully'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String,
        typeof _index2.UpdateWalletDto === "undefined" ? Object : _index2.UpdateWalletDto
    ]),
    _ts_metadata("design:returntype", Promise)
], WalletsController.prototype, "update", null);
_ts_decorate([
    (0, _common.Delete)(':id'),
    (0, _common.HttpCode)(_common.HttpStatus.NO_CONTENT),
    (0, _swagger.ApiOperation)({
        summary: 'Delete wallet'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Wallet ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 204,
        description: 'Wallet deleted successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 409,
        description: 'Cannot delete wallet with transactions'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], WalletsController.prototype, "delete", null);
WalletsController = _ts_decorate([
    (0, _swagger.ApiTags)('Crypto - Wallets'),
    (0, _swagger.ApiBearerAuth)(),
    (0, _common.UseGuards)(_index.JwtAuthGuard, _index.TenantGuard),
    (0, _common.Controller)('crypto/wallets'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _walletsservice.WalletsService === "undefined" ? Object : _walletsservice.WalletsService
    ])
], WalletsController);

//# sourceMappingURL=wallets.controller.js.map