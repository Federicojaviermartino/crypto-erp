"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AnalyticsService", {
    enumerable: true,
    get: function() {
        return AnalyticsService;
    }
});
const _common = require("@nestjs/common");
const _database = require("../../../../../libs/database/src");
const _library = require("@prisma/client/runtime/library");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let AnalyticsService = class AnalyticsService {
    /**
   * Obtiene las métricas del dashboard principal
   */ async getDashboardMetrics(companyId) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        // Ejecutar consultas en paralelo
        const [portfolioOverview, currentMonthTx, lastMonthTx, pendingInvoices, lastMonthInvoices, yearlyGains, lastYearGains, recentTx, recentInv, monthlyData] = await Promise.all([
            this.getPortfolioOverview(companyId),
            this.getTransactionCount(companyId, startOfMonth, now),
            this.getTransactionCount(companyId, startOfLastMonth, startOfMonth),
            this.getPendingInvoicesCount(companyId),
            this.getInvoicesCount(companyId, startOfLastMonth, startOfMonth),
            this.getYearlyCapitalGain(companyId, now.getFullYear()),
            this.getYearlyCapitalGain(companyId, now.getFullYear() - 1),
            this.getRecentTransactions(companyId, 5),
            this.getRecentInvoices(companyId, 5),
            this.getMonthlyData(companyId, 12)
        ]);
        // Calcular cambios porcentuales
        const costBasisChange = 0; // No hay histórico, se podría implementar
        const activityChange = lastMonthTx > 0 ? (currentMonthTx - lastMonthTx) / lastMonthTx * 100 : 0;
        const invoicesChange = lastMonthInvoices > 0 ? (pendingInvoices - lastMonthInvoices) / lastMonthInvoices * 100 : 0;
        const capitalGainChange = lastYearGains !== 0 ? (yearlyGains - lastYearGains) / Math.abs(lastYearGains) * 100 : 0;
        // Distribución del portfolio
        const portfolioDistribution = portfolioOverview.portfolioByAsset.map((asset, index)=>({
                name: asset.symbol,
                value: asset.costBasis,
                color: this.chartColors[index % this.chartColors.length]
            }));
        return {
            totalCostBasis: portfolioOverview.totalCostBasis,
            monthlyActivity: currentMonthTx,
            pendingInvoices,
            yearlyCapitalGain: yearlyGains,
            costBasisChange,
            activityChange,
            invoicesChange,
            capitalGainChange,
            portfolioDistribution,
            monthlyTransactions: monthlyData.transactions,
            monthlyVolume: monthlyData.volume,
            recentTransactions: recentTx,
            recentInvoices: recentInv
        };
    }
    /**
   * Obtiene el resumen del portfolio crypto
   */ async getPortfolioOverview(companyId) {
        // Obtener wallets de la compañía
        const wallets = await this.prisma.wallet.findMany({
            where: {
                companyId
            },
            select: {
                id: true
            }
        });
        const walletIds = wallets.map((w)=>w.id);
        // Obtener transacciones de esas wallets
        const transactions = await this.prisma.cryptoTransaction.findMany({
            where: {
                walletId: {
                    in: walletIds
                }
            }
        });
        // Obtener assets de la compañía para mapear símbolos
        const assets = await this.prisma.cryptoAsset.findMany({
            where: {
                companyId
            }
        });
        const assetMap = new Map(assets.map((a)=>[
                a.symbol,
                a
            ]));
        const portfolioMap = new Map();
        for (const tx of transactions){
            // Procesar entrada (assetIn)
            if (tx.assetIn && tx.amountIn) {
                const asset = assetMap.get(tx.assetIn);
                if (!portfolioMap.has(tx.assetIn)) {
                    portfolioMap.set(tx.assetIn, {
                        symbol: tx.assetIn,
                        name: asset?.name || tx.assetIn,
                        amount: 0,
                        costBasis: 0
                    });
                }
                const entry = portfolioMap.get(tx.assetIn);
                entry.amount += tx.amountIn.toNumber();
                if (tx.priceInEur) {
                    entry.costBasis += tx.amountIn.toNumber() * tx.priceInEur.toNumber();
                }
            }
            // Procesar salida (assetOut)
            if (tx.assetOut && tx.amountOut) {
                if (!portfolioMap.has(tx.assetOut)) {
                    const asset = assetMap.get(tx.assetOut);
                    portfolioMap.set(tx.assetOut, {
                        symbol: tx.assetOut,
                        name: asset?.name || tx.assetOut,
                        amount: 0,
                        costBasis: 0
                    });
                }
                const entry = portfolioMap.get(tx.assetOut);
                entry.amount -= tx.amountOut.toNumber();
            }
        }
        const portfolioByAsset = Array.from(portfolioMap.values()).filter((p)=>p.amount > 0).sort((a, b)=>b.costBasis - a.costBasis);
        const totalCostBasis = portfolioByAsset.reduce((sum, p)=>sum + p.costBasis, 0);
        return {
            totalCostBasis,
            totalPositions: portfolioByAsset.length,
            totalTransactions: transactions.length,
            portfolioByAsset: portfolioByAsset.map((p)=>({
                    ...p,
                    percentage: totalCostBasis > 0 ? p.costBasis / totalCostBasis * 100 : 0
                }))
        };
    }
    /**
   * Obtiene estadísticas de transacciones
   */ async getTransactionStats(companyId, startDate, endDate) {
        // Obtener wallets de la compañía
        const wallets = await this.prisma.wallet.findMany({
            where: {
                companyId
            },
            select: {
                id: true
            }
        });
        const walletIds = wallets.map((w)=>w.id);
        const whereClause = {
            walletId: {
                in: walletIds
            }
        };
        if (startDate || endDate) {
            whereClause.blockTimestamp = {};
            if (startDate) whereClause.blockTimestamp.gte = startDate;
            if (endDate) whereClause.blockTimestamp.lte = endDate;
        }
        const transactions = await this.prisma.cryptoTransaction.findMany({
            where: whereClause,
            select: {
                type: true,
                amountIn: true,
                amountOut: true,
                priceInEur: true,
                priceOutEur: true
            }
        });
        // TRANSFER_IN se considera "compra", TRANSFER_OUT y SWAP se consideran "venta"
        const buys = transactions.filter((t)=>t.type === 'TRANSFER_IN' || t.type === 'CLAIM_REWARD' || t.type === 'AIRDROP');
        const sells = transactions.filter((t)=>t.type === 'TRANSFER_OUT' || t.type === 'SWAP');
        const buyVolume = buys.reduce((sum, t)=>{
            const amount = t.amountIn?.toNumber() || 0;
            const price = t.priceInEur?.toNumber() || 0;
            return sum + amount * price;
        }, 0);
        const sellVolume = sells.reduce((sum, t)=>{
            const amount = t.amountOut?.toNumber() || 0;
            const price = t.priceOutEur?.toNumber() || 0;
            return sum + amount * price;
        }, 0);
        return {
            totalBuys: buys.length,
            totalSells: sells.length,
            buyVolume,
            sellVolume,
            avgBuySize: buys.length > 0 ? buyVolume / buys.length : 0,
            avgSellSize: sells.length > 0 ? sellVolume / sells.length : 0
        };
    }
    /**
   * Obtiene datos mensuales para gráficos
   */ async getMonthlyData(companyId, months) {
        const now = new Date();
        const labels = [];
        const transactionCounts = [];
        const buyVolumes = [];
        const sellVolumes = [];
        // Obtener wallets de la compañía
        const wallets = await this.prisma.wallet.findMany({
            where: {
                companyId
            },
            select: {
                id: true
            }
        });
        const walletIds = wallets.map((w)=>w.id);
        for(let i = months - 1; i >= 0; i--){
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            const monthName = monthStart.toLocaleDateString('es-ES', {
                month: 'short'
            });
            labels.push(monthName);
            const transactions = await this.prisma.cryptoTransaction.findMany({
                where: {
                    walletId: {
                        in: walletIds
                    },
                    blockTimestamp: {
                        gte: monthStart,
                        lte: monthEnd
                    }
                },
                select: {
                    type: true,
                    amountIn: true,
                    amountOut: true,
                    priceInEur: true,
                    priceOutEur: true
                }
            });
            transactionCounts.push(transactions.length);
            const buys = transactions.filter((t)=>t.type === 'TRANSFER_IN' || t.type === 'CLAIM_REWARD');
            const sells = transactions.filter((t)=>t.type === 'TRANSFER_OUT' || t.type === 'SWAP');
            const monthBuyVolume = buys.reduce((sum, t)=>{
                const amount = t.amountIn?.toNumber() || 0;
                const price = t.priceInEur?.toNumber() || 0;
                return sum + amount * price;
            }, 0);
            const monthSellVolume = sells.reduce((sum, t)=>{
                const amount = t.amountOut?.toNumber() || 0;
                const price = t.priceOutEur?.toNumber() || 0;
                return sum + amount * price;
            }, 0);
            buyVolumes.push(monthBuyVolume);
            sellVolumes.push(monthSellVolume);
        }
        return {
            transactions: {
                labels,
                datasets: [
                    {
                        label: 'Transacciones',
                        data: transactionCounts
                    }
                ]
            },
            volume: {
                labels,
                datasets: [
                    {
                        label: 'Compras (EUR)',
                        data: buyVolumes
                    },
                    {
                        label: 'Ventas (EUR)',
                        data: sellVolumes
                    }
                ]
            }
        };
    }
    // Helpers privados
    async getTransactionCount(companyId, startDate, endDate) {
        const wallets = await this.prisma.wallet.findMany({
            where: {
                companyId
            },
            select: {
                id: true
            }
        });
        const walletIds = wallets.map((w)=>w.id);
        return this.prisma.cryptoTransaction.count({
            where: {
                walletId: {
                    in: walletIds
                },
                blockTimestamp: {
                    gte: startDate,
                    lt: endDate
                }
            }
        });
    }
    async getPendingInvoicesCount(companyId) {
        return this.prisma.invoice.count({
            where: {
                companyId,
                status: {
                    in: [
                        'DRAFT',
                        'SENT'
                    ]
                }
            }
        });
    }
    async getInvoicesCount(companyId, startDate, endDate) {
        return this.prisma.invoice.count({
            where: {
                companyId,
                issueDate: {
                    gte: startDate,
                    lt: endDate
                }
            }
        });
    }
    async getYearlyCapitalGain(companyId, year) {
        // Simplified calculation - in production, use TaxReportService
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59);
        const wallets = await this.prisma.wallet.findMany({
            where: {
                companyId
            },
            select: {
                id: true
            }
        });
        const walletIds = wallets.map((w)=>w.id);
        const sells = await this.prisma.cryptoTransaction.findMany({
            where: {
                walletId: {
                    in: walletIds
                },
                type: {
                    in: [
                        'TRANSFER_OUT',
                        'SWAP'
                    ]
                },
                blockTimestamp: {
                    gte: startDate,
                    lte: endDate
                }
            },
            select: {
                realizedGain: true,
                amountOut: true,
                priceOutEur: true
            }
        });
        // Use realized gain if available, otherwise estimate
        const totalGain = sells.reduce((sum, s)=>{
            if (s.realizedGain) {
                return sum + s.realizedGain.toNumber();
            }
            // Rough estimate if no realized gain
            const amount = s.amountOut?.toNumber() || 0;
            const price = s.priceOutEur?.toNumber() || 0;
            return sum + amount * price * 0.2; // Assume 20% profit
        }, 0);
        return totalGain;
    }
    async getRecentTransactions(companyId, limit) {
        const wallets = await this.prisma.wallet.findMany({
            where: {
                companyId
            },
            select: {
                id: true
            }
        });
        const walletIds = wallets.map((w)=>w.id);
        const transactions = await this.prisma.cryptoTransaction.findMany({
            where: {
                walletId: {
                    in: walletIds
                }
            },
            orderBy: {
                blockTimestamp: 'desc'
            },
            take: limit
        });
        return transactions.map((tx)=>({
                id: tx.id,
                type: tx.type,
                asset: tx.assetIn || tx.assetOut || 'Unknown',
                amount: tx.amountIn?.toNumber() || tx.amountOut?.toNumber() || 0,
                valueEur: (()=>{
                    const amountIn = tx.amountIn?.toNumber() || 0;
                    const priceIn = tx.priceInEur?.toNumber() || 0;
                    const amountOut = tx.amountOut?.toNumber() || 0;
                    const priceOut = tx.priceOutEur?.toNumber() || 0;
                    return amountIn * priceIn || amountOut * priceOut;
                })(),
                date: tx.blockTimestamp
            }));
    }
    async getRecentInvoices(companyId, limit) {
        const invoices = await this.prisma.invoice.findMany({
            where: {
                companyId
            },
            orderBy: {
                issueDate: 'desc'
            },
            take: limit,
            include: {
                contact: true
            }
        });
        return invoices.map((inv)=>({
                id: inv.id,
                number: inv.fullNumber,
                customer: inv.contact?.name || inv.counterpartyName,
                total: inv.total.toNumber(),
                status: inv.status,
                date: inv.issueDate
            }));
    }
    // ============================================================================
    // PHASE 4 - ADVANCED ANALYTICS
    // ============================================================================
    /**
   * Get revenue metrics (MRR, ARR, growth)
   * Phase 4 Feature: Business intelligence
   */ async getRevenueMetrics(companyId, startDate, endDate) {
        // Get MRR from active subscriptions
        const subscriptions = await this.prisma.subscription.aggregate({
            where: {
                companyId,
                status: 'ACTIVE'
            },
            _sum: {
                amount: true
            },
            _count: true
        });
        const mrr = subscriptions._sum.amount?.toNumber() || 0;
        const arr = mrr * 12;
        // Get total revenue from paid invoices
        const invoiceRevenue = await this.prisma.invoice.aggregate({
            where: {
                companyId,
                issueDate: {
                    gte: startDate,
                    lte: endDate
                },
                status: 'PAID'
            },
            _sum: {
                totalAmount: true
            }
        });
        const totalRevenue = invoiceRevenue._sum.totalAmount?.toNumber() || 0;
        // Calculate previous period revenue for growth
        const periodLength = endDate.getTime() - startDate.getTime();
        const previousStartDate = new Date(startDate.getTime() - periodLength);
        const previousRevenue = await this.prisma.invoice.aggregate({
            where: {
                companyId,
                issueDate: {
                    gte: previousStartDate,
                    lt: startDate
                },
                status: 'PAID'
            },
            _sum: {
                totalAmount: true
            }
        });
        const previousTotal = previousRevenue._sum.totalAmount?.toNumber() || 0;
        const revenueGrowth = previousTotal > 0 ? (totalRevenue - previousTotal) / previousTotal * 100 : 0;
        // Calculate ARPU (Average Revenue Per User)
        const activeUsers = await this.prisma.companyUser.count({
            where: {
                companyId,
                user: {
                    isActive: true
                }
            }
        });
        const averageRevenuePerUser = activeUsers > 0 ? totalRevenue / activeUsers : 0;
        return {
            mrr,
            arr,
            totalRevenue,
            averageRevenuePerUser,
            revenueGrowth,
            currency: 'EUR'
        };
    }
    /**
   * Get user behavior analytics
   * Phase 4 Feature: User activity tracking
   */ async getUserMetrics(companyId, startDate, endDate) {
        const totalUsers = await this.prisma.companyUser.count({
            where: {
                companyId,
                createdAt: {
                    lte: endDate
                }
            }
        });
        // Active users (logged in last 30 days)
        const thirtyDaysAgo = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        const activeUsers = await this.prisma.user.count({
            where: {
                companyUsers: {
                    some: {
                        companyId
                    }
                },
                lastLoginAt: {
                    gte: thirtyDaysAgo,
                    lte: endDate
                }
            }
        });
        // New users in period
        const newUsers = await this.prisma.companyUser.count({
            where: {
                companyId,
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });
        // Churned users (cancelled subscriptions)
        const churnedUsers = await this.prisma.subscription.count({
            where: {
                companyId,
                status: 'CANCELLED',
                cancelledAt: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });
        const churnRate = totalUsers > 0 ? churnedUsers / totalUsers * 100 : 0;
        const activeUserRate = totalUsers > 0 ? activeUsers / totalUsers * 100 : 0;
        return {
            totalUsers,
            activeUsers,
            newUsers,
            churnedUsers,
            churnRate,
            activeUserRate
        };
    }
    /**
   * Record an analytics event to TimescaleDB
   * Phase 4 Feature: Event tracking
   */ async recordEvent(companyId, userId, eventType, category, value, currency, metadata) {
        try {
            await this.prisma.analyticsEvent.create({
                data: {
                    companyId,
                    userId,
                    eventType,
                    category,
                    value: value instanceof _library.Decimal ? value : value ? new _library.Decimal(value) : null,
                    currency,
                    metadata: metadata || {},
                    timestamp: new Date()
                }
            });
        } catch (error) {
            this.logger.error(`Failed to record analytics event:`, error);
        // Don't throw - analytics should not break the application
        }
    }
    constructor(prisma){
        this.prisma = prisma;
        this.logger = new _common.Logger(AnalyticsService.name);
        // Colores para gráficos
        this.chartColors = [
            '#3B82F6',
            '#10B981',
            '#F59E0B',
            '#EF4444',
            '#8B5CF6',
            '#EC4899',
            '#06B6D4',
            '#F97316'
        ];
    }
};
AnalyticsService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService
    ])
], AnalyticsService);

//# sourceMappingURL=analytics.service.js.map