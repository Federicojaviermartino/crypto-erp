"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "BlockchainSyncService", {
    enumerable: true,
    get: function() {
        return BlockchainSyncService;
    }
});
const _common = require("@nestjs/common");
const _database = require("../../../../../../libs/database/src");
const _client = require("@prisma/client");
const _covalentclient = require("../blockchain/covalent.client.js");
const _transactionparser = require("../blockchain/transaction-parser.js");
const _walletsservice = require("./wallets.service.js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let BlockchainSyncService = class BlockchainSyncService {
    async syncWallet(walletId) {
        // Prevent concurrent syncs for the same wallet
        if (this.syncInProgress.get(walletId)) {
            return {
                walletId,
                success: false,
                transactionsProcessed: 0,
                newTransactions: 0,
                error: 'Sync already in progress'
            };
        }
        this.syncInProgress.set(walletId, true);
        try {
            const wallet = await this.prisma.wallet.findUnique({
                where: {
                    id: walletId
                }
            });
            if (!wallet) {
                throw new Error('Wallet not found');
            }
            if (!this.covalent.isConfigured()) {
                throw new Error('Covalent API not configured');
            }
            // Mark as syncing
            await this.walletsService.setSyncStatus(walletId, 'SYNCING');
            const chainName = this.covalent.getChainName(wallet.chain);
            const startBlock = wallet.lastSyncBlock ? Number(wallet.lastSyncBlock) + 1 : undefined;
            let totalProcessed = 0;
            let newTransactions = 0;
            let lastBlock = wallet.lastSyncBlock;
            let hasMore = true;
            let pageNumber = 0;
            while(hasMore){
                const result = await this.covalent.getTransactions(wallet.chain, wallet.address, {
                    pageSize: 100,
                    pageNumber,
                    startBlock
                });
                for (const tx of result.transactions){
                    const created = await this.processTransaction(wallet, tx, chainName);
                    totalProcessed++;
                    if (created) newTransactions++;
                    // Track highest block
                    const blockNum = BigInt(tx.block_height);
                    if (!lastBlock || blockNum > lastBlock) {
                        lastBlock = blockNum;
                    }
                }
                hasMore = result.hasMore;
                pageNumber++;
                // Safety limit to prevent infinite loops
                if (pageNumber > 100) {
                    this.logger.warn(`Sync limit reached for wallet ${walletId}`);
                    break;
                }
            }
            // Also sync ERC20 transfers to capture token movements
            await this.syncERC20Transfers(wallet, chainName, startBlock);
            // Mark as synced
            await this.walletsService.setSyncStatus(walletId, 'SYNCED', null, lastBlock || undefined);
            return {
                walletId,
                success: true,
                transactionsProcessed: totalProcessed,
                newTransactions,
                lastBlock: lastBlock || undefined
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Sync failed for wallet ${walletId}:`, error);
            await this.walletsService.setSyncStatus(walletId, 'ERROR', errorMessage);
            return {
                walletId,
                success: false,
                transactionsProcessed: 0,
                newTransactions: 0,
                error: errorMessage
            };
        } finally{
            this.syncInProgress.delete(walletId);
        }
    }
    async processTransaction(wallet, tx, chainName) {
        // Check if transaction already exists
        const existing = await this.prisma.cryptoTransaction.findFirst({
            where: {
                walletId: wallet.id,
                txHash: tx.tx_hash
            }
        });
        if (existing) {
            return false;
        }
        // Parse the transaction
        const parsed = this.parser.parseTransaction(tx, wallet.address, chainName);
        // Create the transaction record
        await this.prisma.cryptoTransaction.create({
            data: {
                walletId: wallet.id,
                txHash: tx.tx_hash,
                blockNumber: BigInt(tx.block_height),
                blockTimestamp: new Date(tx.block_signed_at),
                chain: wallet.chain,
                type: parsed.type,
                subtype: parsed.subtype,
                assetIn: parsed.assetIn,
                amountIn: parsed.amountIn ? new _client.Prisma.Decimal(parsed.amountIn) : null,
                assetOut: parsed.assetOut,
                amountOut: parsed.amountOut ? new _client.Prisma.Decimal(parsed.amountOut) : null,
                feeAsset: parsed.feeAsset,
                feeAmount: parsed.feeAmount ? new _client.Prisma.Decimal(parsed.feeAmount) : null,
                feeEur: tx.gas_quote ? new _client.Prisma.Decimal(tx.gas_quote.toString()) : null,
                aiCategorized: true,
                aiConfidence: new _client.Prisma.Decimal(parsed.confidence.toString()),
                aiReasoning: parsed.reasoning,
                status: parsed.confidence >= 0.8 ? 'COMPLETED' : 'NEEDS_REVIEW',
                rawData: tx
            }
        });
        return true;
    }
    async syncERC20Transfers(wallet, chainName, startBlock) {
        try {
            const result = await this.covalent.getERC20Transfers(wallet.chain, wallet.address, {
                pageSize: 100,
                startBlock
            });
            for (const item of result.transfers){
                // Each item may have multiple transfers in a single transaction
                for (const transfer of item.transfers || []){
                    // Check if we already have this transaction
                    const existing = await this.prisma.cryptoTransaction.findFirst({
                        where: {
                            walletId: wallet.id,
                            txHash: item.tx_hash
                        }
                    });
                    // If transaction exists, skip (we already processed it from the main sync)
                    if (existing) continue;
                    // Create transfer transaction
                    const isIncoming = transfer.transfer_type === 'IN';
                    const amount = this.formatTokenAmount(transfer.delta, transfer.contract_decimals);
                    await this.prisma.cryptoTransaction.create({
                        data: {
                            walletId: wallet.id,
                            txHash: item.tx_hash,
                            blockNumber: BigInt(item.block_height),
                            blockTimestamp: new Date(item.block_signed_at),
                            chain: wallet.chain,
                            type: isIncoming ? 'TRANSFER_IN' : 'TRANSFER_OUT',
                            assetIn: isIncoming ? transfer.contract_ticker_symbol : null,
                            amountIn: isIncoming ? new _client.Prisma.Decimal(amount) : null,
                            assetOut: !isIncoming ? transfer.contract_ticker_symbol : null,
                            amountOut: !isIncoming ? new _client.Prisma.Decimal(amount) : null,
                            priceInEur: isIncoming && transfer.delta_quote ? new _client.Prisma.Decimal(transfer.delta_quote.toString()) : null,
                            priceOutEur: !isIncoming && transfer.delta_quote ? new _client.Prisma.Decimal(transfer.delta_quote.toString()) : null,
                            aiCategorized: true,
                            aiConfidence: new _client.Prisma.Decimal('0.9'),
                            aiReasoning: `ERC20 transfer ${transfer.transfer_type} from Covalent`,
                            status: 'COMPLETED'
                        }
                    });
                }
            }
        } catch (error) {
            this.logger.warn(`Failed to sync ERC20 transfers for wallet ${wallet.id}:`, error);
        // Don't fail the main sync for ERC20 transfer errors
        }
    }
    formatTokenAmount(amount, decimals) {
        const value = BigInt(amount);
        const divisor = BigInt(10 ** decimals);
        const intPart = value / divisor;
        const fracPart = value % divisor;
        const fracStr = fracPart.toString().padStart(decimals, '0');
        return `${intPart}.${fracStr}`;
    }
    async syncAllWallets(companyId) {
        const wallets = await this.walletsService.getWalletsForSync(companyId);
        const results = [];
        for (const wallet of wallets){
            const result = await this.syncWallet(wallet.id);
            results.push(result);
        }
        return results;
    }
    async getTransactionsNeedingReview(companyId) {
        return this.prisma.cryptoTransaction.findMany({
            where: {
                wallet: {
                    companyId
                },
                status: 'NEEDS_REVIEW'
            },
            include: {
                wallet: {
                    select: {
                        label: true,
                        address: true,
                        chain: true
                    }
                }
            },
            orderBy: {
                blockTimestamp: 'desc'
            },
            take: 100
        });
    }
    async updateTransactionType(companyId, transactionId, newType, notes) {
        // Verify transaction belongs to company
        const tx = await this.prisma.cryptoTransaction.findFirst({
            where: {
                id: transactionId,
                wallet: {
                    companyId
                }
            }
        });
        if (!tx) {
            throw new Error('Transaction not found');
        }
        await this.prisma.cryptoTransaction.update({
            where: {
                id: transactionId
            },
            data: {
                manualType: newType,
                manualNotes: notes,
                status: 'COMPLETED'
            }
        });
    }
    isSyncing(walletId) {
        return this.syncInProgress.get(walletId) || false;
    }
    constructor(prisma, covalent, parser, walletsService){
        this.prisma = prisma;
        this.covalent = covalent;
        this.parser = parser;
        this.walletsService = walletsService;
        this.logger = new _common.Logger(BlockchainSyncService.name);
        this.syncInProgress = new Map();
    }
};
BlockchainSyncService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService,
        typeof _covalentclient.CovalentClient === "undefined" ? Object : _covalentclient.CovalentClient,
        typeof _transactionparser.TransactionParser === "undefined" ? Object : _transactionparser.TransactionParser,
        typeof _walletsservice.WalletsService === "undefined" ? Object : _walletsservice.WalletsService
    ])
], BlockchainSyncService);

//# sourceMappingURL=blockchain-sync.service.js.map