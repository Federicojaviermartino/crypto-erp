"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CryptoTransactionsService", {
    enumerable: true,
    get: function() {
        return CryptoTransactionsService;
    }
});
const _common = require("@nestjs/common");
const _database = require("../../../../../../libs/database/src");
const _costbasisservice = require("./cost-basis.service.js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let CryptoTransactionsService = class CryptoTransactionsService {
    async findAll(companyId, query) {
        // Get wallets for company
        const wallets = await this.prisma.wallet.findMany({
            where: {
                companyId
            },
            select: {
                id: true
            }
        });
        const walletIds = wallets.map((w)=>w.id);
        const where = {
            walletId: {
                in: walletIds
            },
            ...query.walletId && {
                walletId: query.walletId
            },
            ...query.type && {
                type: query.type
            },
            ...query.chain && {
                chain: query.chain
            },
            ...query.startDate && {
                blockTimestamp: {
                    gte: new Date(query.startDate)
                }
            },
            ...query.endDate && {
                blockTimestamp: {
                    lte: new Date(query.endDate)
                }
            }
        };
        const [transactions, total] = await Promise.all([
            this.prisma.cryptoTransaction.findMany({
                where,
                include: {
                    wallet: {
                        select: {
                            id: true,
                            label: true,
                            address: true,
                            chain: true
                        }
                    }
                },
                orderBy: {
                    blockTimestamp: 'desc'
                },
                skip: query.skip || 0,
                take: query.take || 50
            }),
            this.prisma.cryptoTransaction.count({
                where
            })
        ]);
        return {
            transactions: transactions,
            total
        };
    }
    async findById(companyId, id) {
        // First verify the transaction belongs to a wallet owned by this company
        const transaction = await this.prisma.cryptoTransaction.findUnique({
            where: {
                id
            },
            include: {
                wallet: {
                    select: {
                        id: true,
                        label: true,
                        address: true,
                        chain: true,
                        companyId: true
                    }
                }
            }
        });
        if (!transaction) {
            throw new _common.NotFoundException(`Transaction with ID ${id} not found`);
        }
        // Verify company ownership
        if (transaction.wallet.companyId !== companyId) {
            throw new _common.NotFoundException(`Transaction with ID ${id} not found`);
        }
        return transaction;
    }
    async getPortfolioSummary(companyId) {
        const positions = await this.costBasisService.getPortfolioPositions(companyId);
        return {
            positions,
            totalCostBasis: positions.reduce((sum, p)=>sum + p.totalCostBasis, 0)
        };
    }
    async getTaxReport(companyId, startDate, endDate) {
        return this.costBasisService.generateTaxReport(companyId, new Date(startDate), new Date(endDate));
    }
    async getTransactionStats(companyId) {
        // Get wallets for company
        const wallets = await this.prisma.wallet.findMany({
            where: {
                companyId
            },
            select: {
                id: true
            }
        });
        const walletIds = wallets.map((w)=>w.id);
        const [totalTransactions, byType, byChain] = await Promise.all([
            this.prisma.cryptoTransaction.count({
                where: {
                    walletId: {
                        in: walletIds
                    }
                }
            }),
            this.prisma.cryptoTransaction.groupBy({
                by: [
                    'type'
                ],
                where: {
                    walletId: {
                        in: walletIds
                    }
                },
                _count: true
            }),
            this.prisma.cryptoTransaction.groupBy({
                by: [
                    'chain'
                ],
                where: {
                    walletId: {
                        in: walletIds
                    }
                },
                _count: true
            })
        ]);
        return {
            totalTransactions,
            transactionsByType: Object.fromEntries(byType.map((t)=>[
                    t.type,
                    t._count
                ])),
            transactionsByChain: Object.fromEntries(byChain.map((c)=>[
                    c.chain,
                    c._count
                ]))
        };
    }
    async recategorizeTransaction(companyId, id, newType, notes) {
        const transaction = await this.findById(companyId, id);
        await this.prisma.cryptoTransaction.update({
            where: {
                id
            },
            data: {
                manualType: newType,
                manualNotes: notes
            }
        });
        return this.findById(companyId, id);
    }
    /**
   * Find all transactions for batch operations (no pagination)
   * Used by batch categorization endpoint
   */ async findAllForBatch(companyId, where) {
        // Get wallets for company
        const wallets = await this.prisma.wallet.findMany({
            where: {
                companyId
            },
            select: {
                id: true
            }
        });
        const walletIds = wallets.map((w)=>w.id);
        // Add company filter
        const finalWhere = {
            ...where,
            walletId: {
                in: walletIds
            }
        };
        return this.prisma.cryptoTransaction.findMany({
            where: finalWhere,
            select: {
                id: true
            },
            orderBy: {
                blockTimestamp: 'asc'
            }
        });
    }
    constructor(prisma, costBasisService){
        this.prisma = prisma;
        this.costBasisService = costBasisService;
    }
};
CryptoTransactionsService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService,
        typeof _costbasisservice.CostBasisService === "undefined" ? Object : _costbasisservice.CostBasisService
    ])
], CryptoTransactionsService);

//# sourceMappingURL=crypto-transactions.service.js.map