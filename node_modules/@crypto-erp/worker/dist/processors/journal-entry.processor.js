"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "JournalEntryProcessor", {
    enumerable: true,
    get: function() {
        return JournalEntryProcessor;
    }
});
const _bullmq = require("@nestjs/bullmq");
const _common = require("@nestjs/common");
const _bullmq1 = require("bullmq");
const _database = require("../../../../libs/database/src");
const _decimal = require("decimal.js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
const QUEUE_NAME = 'journal-entry';
// Spanish PGC account mapping for crypto operations
const CRYPTO_ACCOUNTS = {
    // Assets
    CRYPTO_WALLET: '5700',
    CRYPTO_INVENTORY: '305',
    LONG_TERM_CRYPTO: '250',
    BANK: '572',
    // Income
    EXCHANGE_GAIN: '768',
    OTHER_FINANCIAL_INCOME: '769',
    SALES: '700',
    // Expenses
    EXCHANGE_LOSS: '668',
    FEES: '662',
    PURCHASES: '600'
};
let JournalEntryProcessor = class JournalEntryProcessor extends _bullmq.WorkerHost {
    async process(job) {
        const { transactionId, companyId, autoPost = false } = job.data;
        this.logger.log(`Processing journal entry for transaction ${transactionId}`);
        const result = {
            success: false,
            errors: []
        };
        try {
            // Get transaction with related data
            const transaction = await this.prisma.cryptoTransaction.findUnique({
                where: {
                    id: transactionId
                },
                include: {
                    wallet: true
                }
            });
            if (!transaction) {
                throw new Error(`Transaction ${transactionId} not found`);
            }
            // Check if journal entry already exists
            const existingEntry = await this.prisma.journalEntry.findFirst({
                where: {
                    companyId,
                    reference: `CRYPTO-${transaction.txHash.slice(0, 16)}`
                }
            });
            if (existingEntry) {
                this.logger.warn(`Journal entry already exists for transaction ${transactionId}`);
                result.success = true;
                result.journalEntryId = existingEntry.id;
                return result;
            }
            // Get current fiscal year (using isClosed = false for open years)
            const fiscalYear = await this.prisma.fiscalYear.findFirst({
                where: {
                    companyId,
                    isClosed: false,
                    startDate: {
                        lte: transaction.blockTimestamp
                    },
                    endDate: {
                        gte: transaction.blockTimestamp
                    }
                }
            });
            if (!fiscalYear) {
                throw new Error('No open fiscal year found for transaction date');
            }
            // Generate journal entry based on transaction type
            const entryData = await this.generateEntryData(transaction, companyId);
            if (!entryData) {
                this.logger.warn(`No journal entry generated for transaction type: ${transaction.type}`);
                result.success = true;
                return result;
            }
            // Create journal entry with proper line numbers
            const journalEntry = await this.prisma.journalEntry.create({
                data: {
                    companyId,
                    fiscalYearId: fiscalYear.id,
                    number: await this.getNextEntryNumber(companyId, fiscalYear.id),
                    date: transaction.blockTimestamp,
                    description: entryData.description,
                    reference: `CRYPTO-${transaction.txHash.slice(0, 16)}`,
                    status: autoPost ? 'POSTED' : 'DRAFT',
                    lines: {
                        create: entryData.lines.map((line)=>({
                                accountId: line.accountId,
                                lineNumber: line.lineNumber,
                                debit: line.debit,
                                credit: line.credit,
                                description: line.description
                            }))
                    }
                }
            });
            // Link transaction to journal entry (use COMPLETED status)
            await this.prisma.cryptoTransaction.update({
                where: {
                    id: transactionId
                },
                data: {
                    journalEntryId: journalEntry.id,
                    status: 'COMPLETED'
                }
            });
            result.success = true;
            result.journalEntryId = journalEntry.id;
            this.logger.log(`Journal entry ${journalEntry.id} created for transaction ${transactionId}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            result.errors?.push(errorMessage);
            this.logger.error(`Failed to create journal entry: ${errorMessage}`);
            throw error;
        }
        return result;
    }
    /**
   * Generate journal entry data based on transaction type
   */ async generateEntryData(transaction, companyId) {
        const amountIn = new _decimal.Decimal(String(transaction.amountIn || '0'));
        const amountOut = new _decimal.Decimal(String(transaction.amountOut || '0'));
        const priceInEur = new _decimal.Decimal(String(transaction.priceInEur || '0'));
        const priceOutEur = new _decimal.Decimal(String(transaction.priceOutEur || '0'));
        const feeEur = new _decimal.Decimal(String(transaction.feeEur || '0'));
        const valueInEur = amountIn.mul(priceInEur);
        const valueOutEur = amountOut.mul(priceOutEur);
        // Get or create wallet account
        const walletAccount = await this.getOrCreateAccount(companyId, `${CRYPTO_ACCOUNTS.CRYPTO_WALLET}${transaction.walletId.slice(-4)}`, `Wallet ${transaction.wallet?.label || transaction.walletId.slice(-8)}`);
        let lineNumber = 1;
        const lines = [];
        switch(transaction.type){
            case 'TRANSFER_IN':
                // Incoming transfer - crypto enters the wallet
                lines.push({
                    accountId: walletAccount.id,
                    lineNumber: lineNumber++,
                    debit: valueInEur,
                    credit: new _decimal.Decimal(0),
                    description: `${transaction.assetIn} @ ${priceInEur.toFixed(4)} EUR`
                });
                lines.push({
                    accountId: await this.getAccountId(companyId, CRYPTO_ACCOUNTS.BANK),
                    lineNumber: lineNumber++,
                    debit: new _decimal.Decimal(0),
                    credit: valueInEur.plus(feeEur),
                    description: 'Salida banco'
                });
                if (feeEur.gt(0)) {
                    lines.push({
                        accountId: await this.getAccountId(companyId, CRYPTO_ACCOUNTS.FEES),
                        lineNumber: lineNumber++,
                        debit: feeEur,
                        credit: new _decimal.Decimal(0),
                        description: 'Comisión transacción'
                    });
                }
                return {
                    description: `Entrada ${amountIn.toFixed(8)} ${transaction.assetIn}`,
                    lines
                };
            case 'TRANSFER_OUT':
                // Outgoing transfer - crypto leaves the wallet with potential gain/loss
                const costBasis = await this.calculateFIFOCostBasis(companyId, transaction.assetOut || '', amountOut);
                const gainLoss = valueOutEur.minus(costBasis);
                const isGain = gainLoss.gte(0);
                lines.push({
                    accountId: await this.getAccountId(companyId, CRYPTO_ACCOUNTS.BANK),
                    lineNumber: lineNumber++,
                    debit: valueOutEur.minus(feeEur),
                    credit: new _decimal.Decimal(0),
                    description: 'Entrada banco'
                });
                lines.push({
                    accountId: walletAccount.id,
                    lineNumber: lineNumber++,
                    debit: new _decimal.Decimal(0),
                    credit: costBasis,
                    description: `Coste adquisición ${transaction.assetOut}`
                });
                lines.push({
                    accountId: await this.getAccountId(companyId, isGain ? CRYPTO_ACCOUNTS.EXCHANGE_GAIN : CRYPTO_ACCOUNTS.EXCHANGE_LOSS),
                    lineNumber: lineNumber++,
                    debit: isGain ? new _decimal.Decimal(0) : gainLoss.abs(),
                    credit: isGain ? gainLoss : new _decimal.Decimal(0),
                    description: isGain ? 'Ganancia patrimonial' : 'Pérdida patrimonial'
                });
                if (feeEur.gt(0)) {
                    lines.push({
                        accountId: await this.getAccountId(companyId, CRYPTO_ACCOUNTS.FEES),
                        lineNumber: lineNumber++,
                        debit: feeEur,
                        credit: new _decimal.Decimal(0),
                        description: 'Comisión transacción'
                    });
                }
                return {
                    description: `Salida ${amountOut.toFixed(8)} ${transaction.assetOut}`,
                    lines
                };
            case 'CLAIM_REWARD':
            case 'AIRDROP':
                // Income from staking rewards or airdrops
                lines.push({
                    accountId: walletAccount.id,
                    lineNumber: lineNumber++,
                    debit: valueInEur,
                    credit: new _decimal.Decimal(0),
                    description: `${transaction.assetIn} recibido`
                });
                lines.push({
                    accountId: await this.getAccountId(companyId, CRYPTO_ACCOUNTS.OTHER_FINANCIAL_INCOME),
                    lineNumber: lineNumber++,
                    debit: new _decimal.Decimal(0),
                    credit: valueInEur,
                    description: 'Ingreso financiero'
                });
                return {
                    description: `${transaction.type === 'CLAIM_REWARD' ? 'Recompensa staking' : 'Airdrop'} ${amountIn.toFixed(8)} ${transaction.assetIn}`,
                    lines
                };
            case 'SWAP':
                // Swaps: credit out asset, debit in asset
                lines.push({
                    accountId: walletAccount.id,
                    lineNumber: lineNumber++,
                    debit: valueInEur,
                    credit: new _decimal.Decimal(0),
                    description: `${transaction.assetIn} recibido`
                });
                lines.push({
                    accountId: walletAccount.id,
                    lineNumber: lineNumber++,
                    debit: new _decimal.Decimal(0),
                    credit: valueOutEur,
                    description: `${transaction.assetOut} entregado`
                });
                // If there's a difference, record gain/loss
                const swapDiff = valueInEur.minus(valueOutEur);
                if (swapDiff.abs().gt(0.01)) {
                    lines.push({
                        accountId: await this.getAccountId(companyId, swapDiff.gte(0) ? CRYPTO_ACCOUNTS.EXCHANGE_GAIN : CRYPTO_ACCOUNTS.EXCHANGE_LOSS),
                        lineNumber: lineNumber++,
                        debit: swapDiff.lt(0) ? swapDiff.abs() : new _decimal.Decimal(0),
                        credit: swapDiff.gte(0) ? swapDiff : new _decimal.Decimal(0),
                        description: swapDiff.gte(0) ? 'Ganancia swap' : 'Pérdida swap'
                    });
                }
                return {
                    description: `Swap ${amountOut.toFixed(8)} ${transaction.assetOut} → ${amountIn.toFixed(8)} ${transaction.assetIn}`,
                    lines
                };
            case 'STAKE':
            case 'UNSTAKE':
            case 'LIQUIDITY_ADD':
            case 'LIQUIDITY_REMOVE':
            case 'BRIDGE_IN':
            case 'BRIDGE_OUT':
                // These are typically asset movements without P&L
                // Record the movement but don't generate income/expense
                if (amountIn.gt(0)) {
                    lines.push({
                        accountId: walletAccount.id,
                        lineNumber: lineNumber++,
                        debit: valueInEur,
                        credit: new _decimal.Decimal(0),
                        description: `${transaction.assetIn} ${transaction.type}`
                    });
                }
                if (amountOut.gt(0)) {
                    lines.push({
                        accountId: walletAccount.id,
                        lineNumber: lineNumber++,
                        debit: new _decimal.Decimal(0),
                        credit: valueOutEur,
                        description: `${transaction.assetOut} ${transaction.type}`
                    });
                }
                if (lines.length === 0) return null;
                return {
                    description: `${transaction.type} ${amountIn.gt(0) ? amountIn.toFixed(8) + ' ' + transaction.assetIn : ''} ${amountOut.gt(0) ? amountOut.toFixed(8) + ' ' + transaction.assetOut : ''}`.trim(),
                    lines
                };
            case 'NFT_MINT':
            case 'NFT_TRANSFER':
            case 'NFT_SALE':
            case 'APPROVE':
            case 'CONTRACT_INTERACTION':
            case 'UNKNOWN':
                // Skip these transaction types for now
                return null;
            default:
                this.logger.warn(`Unknown transaction type: ${transaction.type}`);
                return null;
        }
    }
    /**
   * Get or create a ledger account
   */ async getOrCreateAccount(companyId, code, name) {
        let account = await this.prisma.account.findFirst({
            where: {
                companyId,
                code
            }
        });
        if (!account) {
            account = await this.prisma.account.create({
                data: {
                    companyId,
                    code,
                    name,
                    type: 'ASSET',
                    isActive: true
                }
            });
        }
        return account;
    }
    /**
   * Get account ID by code
   */ async getAccountId(companyId, code) {
        const account = await this.prisma.account.findFirst({
            where: {
                companyId,
                code: {
                    startsWith: code
                }
            }
        });
        if (!account) {
            throw new Error(`Account with code ${code} not found for company ${companyId}`);
        }
        return account.id;
    }
    /**
   * Calculate FIFO cost basis for a sale
   * Uses cryptoAsset relation via symbol lookup
   */ async calculateFIFOCostBasis(companyId, assetSymbol, amount) {
        // First find the cryptoAsset
        const cryptoAsset = await this.prisma.cryptoAsset.findFirst({
            where: {
                companyId,
                symbol: assetSymbol
            }
        });
        if (!cryptoAsset) {
            this.logger.warn(`CryptoAsset ${assetSymbol} not found for company ${companyId}`);
            return new _decimal.Decimal(0);
        }
        // Get acquisition lots ordered by date (FIFO)
        const lots = await this.prisma.cryptoLot.findMany({
            where: {
                companyId,
                cryptoAssetId: cryptoAsset.id,
                remainingAmount: {
                    gt: 0
                }
            },
            orderBy: {
                acquiredAt: 'asc'
            }
        });
        let remainingToSell = amount;
        let totalCost = new _decimal.Decimal(0);
        for (const lot of lots){
            if (remainingToSell.lte(0)) break;
            const lotRemaining = new _decimal.Decimal(String(lot.remainingAmount));
            const lotCostPerUnit = new _decimal.Decimal(String(lot.costPerUnit));
            const useFromLot = _decimal.Decimal.min(remainingToSell, lotRemaining);
            totalCost = totalCost.plus(useFromLot.mul(lotCostPerUnit));
            remainingToSell = remainingToSell.minus(useFromLot);
            // Update lot remaining amount
            await this.prisma.cryptoLot.update({
                where: {
                    id: lot.id
                },
                data: {
                    remainingAmount: lotRemaining.minus(useFromLot)
                }
            });
        }
        return totalCost;
    }
    /**
   * Get next entry number for the fiscal year
   */ async getNextEntryNumber(companyId, fiscalYearId) {
        const lastEntry = await this.prisma.journalEntry.findFirst({
            where: {
                companyId,
                fiscalYearId
            },
            orderBy: {
                number: 'desc'
            }
        });
        return (lastEntry?.number || 0) + 1;
    }
    onCompleted(job) {
        this.logger.debug(`Journal entry job ${job.id} completed`);
    }
    onFailed(job, error) {
        this.logger.error(`Journal entry job failed: ${error.message}`);
    }
    constructor(prisma){
        super(), this.prisma = prisma, this.logger = new _common.Logger(JournalEntryProcessor.name);
    }
};
_ts_decorate([
    (0, _bullmq.OnWorkerEvent)('completed'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _bullmq1.Job === "undefined" ? Object : _bullmq1.Job
    ]),
    _ts_metadata("design:returntype", void 0)
], JournalEntryProcessor.prototype, "onCompleted", null);
_ts_decorate([
    (0, _bullmq.OnWorkerEvent)('failed'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        typeof Error === "undefined" ? Object : Error
    ]),
    _ts_metadata("design:returntype", void 0)
], JournalEntryProcessor.prototype, "onFailed", null);
JournalEntryProcessor = _ts_decorate([
    (0, _bullmq.Processor)(QUEUE_NAME),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService
    ])
], JournalEntryProcessor);

//# sourceMappingURL=journal-entry.processor.js.map