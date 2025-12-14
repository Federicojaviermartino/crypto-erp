"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SyncController", {
    enumerable: true,
    get: function() {
        return SyncController;
    }
});
const _common = require("@nestjs/common");
const _swagger = require("@nestjs/swagger");
const _index = require("../../../common/guards");
const _index1 = require("../../../common/decorators");
const _blockchainsyncservice = require("../services/blockchain-sync.service.js");
const _client = require("@prisma/client");
const _classvalidator = require("class-validator");
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
let UpdateTransactionTypeDto = class UpdateTransactionTypeDto {
};
_ts_decorate([
    (0, _classvalidator.IsEnum)(_client.CryptoTxType),
    _ts_metadata("design:type", typeof _client.CryptoTxType === "undefined" ? Object : _client.CryptoTxType)
], UpdateTransactionTypeDto.prototype, "type", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdateTransactionTypeDto.prototype, "notes", void 0);
let SyncController = class SyncController {
    async syncWallet(companyId, walletId) {
        // TODO: Verify wallet belongs to company
        return this.syncService.syncWallet(walletId);
    }
    async syncAll(companyId) {
        const results = await this.syncService.syncAllWallets(companyId);
        return {
            results
        };
    }
    async getSyncStatus(walletId) {
        return {
            syncing: this.syncService.isSyncing(walletId)
        };
    }
    async getTransactionsNeedingReview(companyId) {
        const transactions = await this.syncService.getTransactionsNeedingReview(companyId);
        return {
            transactions
        };
    }
    async updateTransactionType(companyId, transactionId, dto) {
        await this.syncService.updateTransactionType(companyId, transactionId, dto.type, dto.notes);
        return {
            success: true
        };
    }
    constructor(syncService){
        this.syncService = syncService;
    }
};
_ts_decorate([
    (0, _common.Post)('wallet/:id'),
    (0, _swagger.ApiOperation)({
        summary: 'Sync a wallet with blockchain data'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Wallet ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Wallet sync completed'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], SyncController.prototype, "syncWallet", null);
_ts_decorate([
    (0, _common.Post)('all'),
    (0, _swagger.ApiOperation)({
        summary: 'Sync all active wallets'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'All wallets synced'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], SyncController.prototype, "syncAll", null);
_ts_decorate([
    (0, _common.Get)('wallet/:id/status'),
    (0, _swagger.ApiOperation)({
        summary: 'Check if wallet is currently syncing'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Wallet ID'
    }),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], SyncController.prototype, "getSyncStatus", null);
_ts_decorate([
    (0, _common.Get)('transactions/review'),
    (0, _swagger.ApiOperation)({
        summary: 'Get transactions needing manual review'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'List of transactions needing review'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], SyncController.prototype, "getTransactionsNeedingReview", null);
_ts_decorate([
    (0, _common.Patch)('transactions/:id/type'),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    (0, _swagger.ApiOperation)({
        summary: 'Manually update transaction type'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Transaction ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Transaction type updated'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String,
        typeof UpdateTransactionTypeDto === "undefined" ? Object : UpdateTransactionTypeDto
    ]),
    _ts_metadata("design:returntype", Promise)
], SyncController.prototype, "updateTransactionType", null);
SyncController = _ts_decorate([
    (0, _swagger.ApiTags)('Crypto - Blockchain Sync'),
    (0, _swagger.ApiBearerAuth)(),
    (0, _common.UseGuards)(_index.JwtAuthGuard, _index.TenantGuard),
    (0, _common.Controller)('crypto/sync'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _blockchainsyncservice.BlockchainSyncService === "undefined" ? Object : _blockchainsyncservice.BlockchainSyncService
    ])
], SyncController);

//# sourceMappingURL=sync.controller.js.map