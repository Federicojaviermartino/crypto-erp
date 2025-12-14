"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "BlockchainSyncProcessor", {
    enumerable: true,
    get: function() {
        return BlockchainSyncProcessor;
    }
});
const _bullmq = require("@nestjs/bullmq");
const _common = require("@nestjs/common");
const _bullmq1 = require("bullmq");
const _schedule = require("@nestjs/schedule");
const _database = require("../../../../libs/database/src");
const _config = require("@nestjs/config");
const _axios = /*#__PURE__*/ _interop_require_default(require("axios"));
const _client = require("@prisma/client");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
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
const QUEUE_NAME = 'blockchain-sync';
let BlockchainSyncProcessor = class BlockchainSyncProcessor extends _bullmq.WorkerHost {
    async scheduledSync() {
        this.logger.log('Scheduled blockchain sync started');
        try {
            const wallets = await this.prisma.wallet.findMany({
                where: {
                    isActive: true
                },
                select: {
                    id: true,
                    companyId: true,
                    chain: true,
                    address: true
                }
            });
            this.logger.log(`Found ${wallets.length} active wallets to sync`);
            for (const wallet of wallets){
                await this.syncQueue.add('sync-wallet', {
                    walletId: wallet.id,
                    companyId: wallet.companyId,
                    chain: wallet.chain,
                    address: wallet.address
                }, {
                    jobId: `sync-${wallet.id}-${Date.now()}`,
                    priority: 10
                });
            }
        } catch (error) {
            this.logger.error('Failed to schedule wallet syncs', error);
        }
    }
    async process(job) {
        const { walletId, chain, address } = job.data;
        this.logger.log(`Processing sync for wallet ${walletId} (${chain}:${address.substring(0, 10)}...)`);
        if (!this.covalentApiKey) {
            this.logger.warn('Covalent API key not configured - skipping sync');
            return {
                walletId,
                success: false,
                transactionsProcessed: 0,
                newTransactions: 0,
                error: 'Covalent API key not configured'
            };
        }
        try {
            await this.prisma.wallet.update({
                where: {
                    id: walletId
                },
                data: {
                    syncStatus: 'SYNCING'
                }
            });
            const wallet = await this.prisma.wallet.findUnique({
                where: {
                    id: walletId
                }
            });
            const chainId = this.getChainId(chain);
            const startBlock = wallet?.lastSyncBlock ? Number(wallet.lastSyncBlock) + 1 : undefined;
            const transactions = await this.fetchTransactions(chainId, address, startBlock);
            let newTransactions = 0;
            let lastBlock;
            for (const tx of transactions){
                const exists = await this.prisma.cryptoTransaction.findFirst({
                    where: {
                        walletId,
                        txHash: tx.tx_hash
                    }
                });
                if (!exists) {
                    await this.createTransaction(walletId, tx, chain);
                    newTransactions++;
                }
                const blockNum = BigInt(tx.block_height);
                if (!lastBlock || blockNum > lastBlock) {
                    lastBlock = blockNum;
                }
            }
            await this.prisma.wallet.update({
                where: {
                    id: walletId
                },
                data: {
                    syncStatus: 'SYNCED',
                    lastSyncAt: new Date(),
                    lastSyncBlock: lastBlock,
                    syncError: null
                }
            });
            this.logger.log(`Sync complete for wallet ${walletId}: ${newTransactions} new transactions`);
            return {
                walletId,
                success: true,
                transactionsProcessed: transactions.length,
                newTransactions,
                lastBlock: lastBlock?.toString()
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.prisma.wallet.update({
                where: {
                    id: walletId
                },
                data: {
                    syncStatus: 'ERROR',
                    syncError: errorMessage
                }
            });
            this.logger.error(`Failed to sync wallet ${walletId}: ${errorMessage}`);
            return {
                walletId,
                success: false,
                transactionsProcessed: 0,
                newTransactions: 0,
                error: errorMessage
            };
        }
    }
    async fetchTransactions(chainId, address, startBlock) {
        const params = {
            'page-size': 100
        };
        if (startBlock) {
            params['starting-block'] = startBlock;
        }
        const response = await _axios.default.get(`${this.covalentBaseUrl}/${chainId}/address/${address}/transactions_v3/`, {
            params,
            auth: {
                username: this.covalentApiKey,
                password: ''
            },
            timeout: 30000
        });
        return response.data?.data?.items || [];
    }
    async createTransaction(walletId, tx, chain) {
        const isIncoming = tx.to_address?.toLowerCase() === tx.from_address?.toLowerCase();
        const type = this.determineTransactionType(tx);
        await this.prisma.cryptoTransaction.create({
            data: {
                walletId,
                txHash: tx.tx_hash,
                blockNumber: BigInt(tx.block_height),
                blockTimestamp: new Date(tx.block_signed_at),
                chain,
                type,
                assetIn: isIncoming ? 'ETH' : null,
                amountIn: isIncoming && tx.value ? new _client.Prisma.Decimal(tx.value).div(1e18) : null,
                assetOut: !isIncoming ? 'ETH' : null,
                amountOut: !isIncoming && tx.value ? new _client.Prisma.Decimal(tx.value).div(1e18) : null,
                feeAsset: 'ETH',
                feeAmount: tx.gas_quote ? new _client.Prisma.Decimal(tx.gas_spent).mul(tx.gas_price).div(1e18) : null,
                feeEur: tx.gas_quote ? new _client.Prisma.Decimal(tx.gas_quote.toString()) : null,
                aiCategorized: true,
                aiConfidence: new _client.Prisma.Decimal('0.7'),
                aiReasoning: `Auto-categorized by worker: ${type}`,
                status: 'COMPLETED',
                rawData: tx
            }
        });
    }
    determineTransactionType(tx) {
        if (tx.log_events?.some((log)=>log.decoded?.name === 'Swap' || log.decoded?.name === 'SwapExactTokensForTokens')) {
            return 'SWAP';
        }
        if (tx.to_address && tx.from_address) {
            return tx.value && tx.value !== '0' ? 'TRANSFER_OUT' : 'CONTRACT_INTERACTION';
        }
        return 'UNKNOWN';
    }
    getChainId(chain) {
        const chainIds = {
            ETHEREUM: 1,
            POLYGON: 137,
            ARBITRUM: 42161,
            OPTIMISM: 10,
            BASE: 8453,
            AVALANCHE: 43114,
            BSC: 56
        };
        return chainIds[chain] || 1;
    }
    onCompleted(job) {
        this.logger.debug(`Job ${job.id} completed for wallet ${job.data.walletId}`);
    }
    onFailed(job, error) {
        this.logger.error(`Job ${job.id} failed for wallet ${job.data.walletId}: ${error.message}`);
    }
    constructor(prisma, config, syncQueue){
        super(), this.prisma = prisma, this.config = config, this.syncQueue = syncQueue, this.logger = new _common.Logger(BlockchainSyncProcessor.name), this.covalentBaseUrl = 'https://api.covalenthq.com/v1';
        this.covalentApiKey = this.config.get('COVALENT_API_KEY');
    }
};
_ts_decorate([
    (0, _schedule.Cron)(_schedule.CronExpression.EVERY_10_MINUTES),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], BlockchainSyncProcessor.prototype, "scheduledSync", null);
_ts_decorate([
    (0, _bullmq.OnWorkerEvent)('completed'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _bullmq1.Job === "undefined" ? Object : _bullmq1.Job
    ]),
    _ts_metadata("design:returntype", void 0)
], BlockchainSyncProcessor.prototype, "onCompleted", null);
_ts_decorate([
    (0, _bullmq.OnWorkerEvent)('failed'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _bullmq1.Job === "undefined" ? Object : _bullmq1.Job,
        typeof Error === "undefined" ? Object : Error
    ]),
    _ts_metadata("design:returntype", void 0)
], BlockchainSyncProcessor.prototype, "onFailed", null);
BlockchainSyncProcessor = _ts_decorate([
    (0, _bullmq.Processor)(QUEUE_NAME, {
        concurrency: 2
    }),
    _ts_param(2, (0, _bullmq.InjectQueue)(QUEUE_NAME)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService,
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService,
        typeof _bullmq1.Queue === "undefined" ? Object : _bullmq1.Queue
    ])
], BlockchainSyncProcessor);

//# sourceMappingURL=blockchain-sync.processor.js.map