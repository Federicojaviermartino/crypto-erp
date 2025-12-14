"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CryptoTransactionsController", {
    enumerable: true,
    get: function() {
        return CryptoTransactionsController;
    }
});
const _common = require("@nestjs/common");
const _swagger = require("@nestjs/swagger");
const _bullmq = require("@nestjs/bullmq");
const _bullmq1 = require("bullmq");
const _index = require("../../../common/guards");
const _index1 = require("../../../common/decorators");
const _index2 = require("../services");
const _batchcategorizedto = require("../dto/batch-categorize.dto.js");
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
let CryptoTransactionsController = class CryptoTransactionsController {
    async findAll(companyId, type, walletId, chain, startDate, endDate, skip, take) {
        return this.transactionsService.findAll(companyId, {
            type,
            walletId,
            chain,
            startDate,
            endDate,
            skip: skip ? parseInt(skip, 10) : undefined,
            take: take ? parseInt(take, 10) : undefined
        });
    }
    async getPortfolioSummary(companyId) {
        return this.transactionsService.getPortfolioSummary(companyId);
    }
    async getStats(companyId) {
        return this.transactionsService.getTransactionStats(companyId);
    }
    async getTaxReport(companyId, startDate, endDate) {
        if (!startDate || !endDate) {
            return {
                entries: [],
                summary: {
                    totalProceeds: 0,
                    totalCostBasis: 0,
                    totalGainLoss: 0,
                    shortTermGainLoss: 0,
                    longTermGainLoss: 0
                }
            };
        }
        return this.transactionsService.getTaxReport(companyId, startDate, endDate);
    }
    async getLots(companyId, assetId, includeExhausted) {
        return this.costBasisService.getLotsForAsset(companyId, assetId, includeExhausted === 'true');
    }
    async findById(companyId, id) {
        return this.transactionsService.findById(companyId, id);
    }
    async recalculateCostBasis(companyId, assetId) {
        await this.costBasisService.recalculateForAsset(companyId, assetId);
        return {
            success: true,
            message: 'Cost basis recalculated'
        };
    }
    async recategorize(companyId, id, body) {
        return this.transactionsService.recategorizeTransaction(companyId, id, body.type, body.notes);
    }
    async batchCategorize(companyId, dto) {
        let transactionIds = [];
        // Option 1: Specific transaction IDs provided
        if (dto.transactionIds && dto.transactionIds.length > 0) {
            transactionIds = dto.transactionIds;
        } else if (dto.walletId) {
            const where = {
                walletId: dto.walletId,
                aiCategorized: false
            };
            if (dto.startDate || dto.endDate) {
                where.blockTimestamp = {};
                if (dto.startDate) where.blockTimestamp.gte = new Date(dto.startDate);
                if (dto.endDate) where.blockTimestamp.lte = new Date(dto.endDate);
            }
            const transactions = await this.transactionsService.findAllForBatch(companyId, where);
            transactionIds = transactions.map((tx)=>tx.id);
        } else if (dto.startDate || dto.endDate) {
            const where = {
                aiCategorized: false,
                blockTimestamp: {}
            };
            if (dto.startDate) where.blockTimestamp.gte = new Date(dto.startDate);
            if (dto.endDate) where.blockTimestamp.lte = new Date(dto.endDate);
            const transactions = await this.transactionsService.findAllForBatch(companyId, where);
            transactionIds = transactions.map((tx)=>tx.id);
        } else {
            throw new _common.BadRequestException('Must provide either transactionIds, walletId, or date range (startDate/endDate)');
        }
        if (transactionIds.length === 0) {
            throw new _common.BadRequestException('No transactions found matching criteria');
        }
        // Queue the job
        const jobId = `batch-cat-${Date.now()}-${companyId}`;
        await this.categorizeQueue.add('categorize-batch', {
            transactionIds,
            companyId
        }, {
            jobId,
            priority: 10
        });
        // Estimate time: ~3 seconds per transaction (AI calls can be slow)
        const estimatedTime = transactionIds.length * 3;
        return {
            jobId,
            transactionCount: transactionIds.length,
            estimatedTime
        };
    }
    async getBatchStatus(jobId) {
        const job = await this.categorizeQueue.getJob(jobId);
        if (!job) {
            throw new _common.BadRequestException(`Job ${jobId} not found`);
        }
        const state = await job.getState();
        const progress = job.progress || 0;
        const response = {
            jobId,
            state,
            progress
        };
        // Include result if completed
        if (state === 'completed') {
            response.result = job.returnvalue;
        }
        // Include error if failed
        if (state === 'failed') {
            response.error = job.failedReason;
        }
        return response;
    }
    constructor(transactionsService, costBasisService, categorizeQueue){
        this.transactionsService = transactionsService;
        this.costBasisService = costBasisService;
        this.categorizeQueue = categorizeQueue;
    }
};
_ts_decorate([
    (0, _common.Get)(),
    (0, _swagger.ApiOperation)({
        summary: 'List all crypto transactions'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Returns paginated list of transactions'
    }),
    (0, _swagger.ApiQuery)({
        name: 'type',
        required: false,
        description: 'Transaction type filter'
    }),
    (0, _swagger.ApiQuery)({
        name: 'walletId',
        required: false,
        description: 'Wallet ID filter'
    }),
    (0, _swagger.ApiQuery)({
        name: 'chain',
        required: false,
        description: 'Blockchain filter'
    }),
    (0, _swagger.ApiQuery)({
        name: 'startDate',
        required: false,
        description: 'Start date filter'
    }),
    (0, _swagger.ApiQuery)({
        name: 'endDate',
        required: false,
        description: 'End date filter'
    }),
    (0, _swagger.ApiQuery)({
        name: 'skip',
        required: false,
        description: 'Pagination offset'
    }),
    (0, _swagger.ApiQuery)({
        name: 'take',
        required: false,
        description: 'Pagination limit'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Query)('type')),
    _ts_param(2, (0, _common.Query)('walletId')),
    _ts_param(3, (0, _common.Query)('chain')),
    _ts_param(4, (0, _common.Query)('startDate')),
    _ts_param(5, (0, _common.Query)('endDate')),
    _ts_param(6, (0, _common.Query)('skip')),
    _ts_param(7, (0, _common.Query)('take')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String,
        String,
        String,
        String,
        String,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], CryptoTransactionsController.prototype, "findAll", null);
_ts_decorate([
    (0, _common.Get)('portfolio'),
    (0, _swagger.ApiOperation)({
        summary: 'Get portfolio summary with cost basis'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Returns portfolio positions'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], CryptoTransactionsController.prototype, "getPortfolioSummary", null);
_ts_decorate([
    (0, _common.Get)('stats'),
    (0, _swagger.ApiOperation)({
        summary: 'Get transaction statistics'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Returns transaction statistics'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], CryptoTransactionsController.prototype, "getStats", null);
_ts_decorate([
    (0, _common.Get)('tax-report'),
    (0, _swagger.ApiOperation)({
        summary: 'Generate tax report for realized gains/losses'
    }),
    (0, _swagger.ApiQuery)({
        name: 'startDate',
        required: true,
        description: 'Start date (YYYY-MM-DD)'
    }),
    (0, _swagger.ApiQuery)({
        name: 'endDate',
        required: true,
        description: 'End date (YYYY-MM-DD)'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Returns tax report'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Query)('startDate')),
    _ts_param(2, (0, _common.Query)('endDate')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], CryptoTransactionsController.prototype, "getTaxReport", null);
_ts_decorate([
    (0, _common.Get)('lots/:assetId'),
    (0, _swagger.ApiOperation)({
        summary: 'Get cost basis lots for an asset'
    }),
    (0, _swagger.ApiParam)({
        name: 'assetId',
        description: 'Asset ID'
    }),
    (0, _swagger.ApiQuery)({
        name: 'includeExhausted',
        required: false,
        description: 'Include exhausted lots'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Returns cost basis lots'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('assetId')),
    _ts_param(2, (0, _common.Query)('includeExhausted')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], CryptoTransactionsController.prototype, "getLots", null);
_ts_decorate([
    (0, _common.Get)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Get transaction by ID'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Transaction ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Returns transaction details'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Transaction not found'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], CryptoTransactionsController.prototype, "findById", null);
_ts_decorate([
    (0, _common.Post)('recalculate/:assetId'),
    (0, _swagger.ApiOperation)({
        summary: 'Recalculate cost basis for an asset'
    }),
    (0, _swagger.ApiParam)({
        name: 'assetId',
        description: 'Asset ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Cost basis recalculated'
    }),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('assetId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], CryptoTransactionsController.prototype, "recalculateCostBasis", null);
_ts_decorate([
    (0, _common.Patch)(':id/recategorize'),
    (0, _swagger.ApiOperation)({
        summary: 'Recategorize a transaction'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Transaction ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Transaction recategorized'
    }),
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
], CryptoTransactionsController.prototype, "recategorize", null);
_ts_decorate([
    (0, _common.Post)('batch-categorize'),
    (0, _swagger.ApiOperation)({
        summary: 'Batch categorize transactions with AI',
        description: 'Queues transactions for AI categorization. Provide either specific transaction IDs, ' + 'a wallet ID to categorize all uncategorized transactions, or a date range.'
    }),
    (0, _swagger.ApiResponse)({
        status: 201,
        description: 'Batch categorization job created',
        type: _batchcategorizedto.BatchCategorizeResponseDto
    }),
    (0, _swagger.ApiResponse)({
        status: 400,
        description: 'Invalid request - must provide transactionIds, walletId, or date range'
    }),
    (0, _common.HttpCode)(_common.HttpStatus.CREATED),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _batchcategorizedto.BatchCategorizeDto === "undefined" ? Object : _batchcategorizedto.BatchCategorizeDto
    ]),
    _ts_metadata("design:returntype", Promise)
], CryptoTransactionsController.prototype, "batchCategorize", null);
_ts_decorate([
    (0, _common.Get)('batch-categorize/:jobId/status'),
    (0, _swagger.ApiOperation)({
        summary: 'Get batch categorization job status'
    }),
    (0, _swagger.ApiParam)({
        name: 'jobId',
        description: 'Job ID returned from batch-categorize'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Job status retrieved',
        type: _batchcategorizedto.BatchJobStatusResponseDto
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Job not found'
    }),
    _ts_param(0, (0, _common.Param)('jobId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], CryptoTransactionsController.prototype, "getBatchStatus", null);
CryptoTransactionsController = _ts_decorate([
    (0, _swagger.ApiTags)('Crypto Transactions'),
    (0, _swagger.ApiBearerAuth)(),
    (0, _common.UseGuards)(_index.JwtAuthGuard, _index.TenantGuard),
    (0, _common.Controller)('crypto/transactions'),
    _ts_param(2, (0, _bullmq.InjectQueue)('ai-categorize')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _index2.CryptoTransactionsService === "undefined" ? Object : _index2.CryptoTransactionsService,
        typeof _index2.CostBasisService === "undefined" ? Object : _index2.CostBasisService,
        typeof _bullmq1.Queue === "undefined" ? Object : _bullmq1.Queue
    ])
], CryptoTransactionsController);

//# sourceMappingURL=crypto-transactions.controller.js.map