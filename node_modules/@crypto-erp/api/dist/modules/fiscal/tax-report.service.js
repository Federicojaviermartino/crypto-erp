"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "TaxReportService", {
    enumerable: true,
    get: function() {
        return TaxReportService;
    }
});
const _common = require("@nestjs/common");
const _database = require("../../../../../libs/database/src");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let TaxReportService = class TaxReportService {
    /**
   * Genera el informe fiscal completo para un año
   */ async generateTaxReport(companyId, year) {
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59);
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
        // Obtener todas las transacciones de venta del año (TRANSFER_OUT y SWAP)
        const sellTransactions = await this.prisma.cryptoTransaction.findMany({
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
            orderBy: {
                blockTimestamp: 'asc'
            }
        });
        const transactions = [];
        const byAsset = {};
        // Obtener todos los lotes de compra históricos
        const costLots = await this.buildCostLots(companyId, walletIds, endDate);
        for (const sellTx of sellTransactions){
            const assetSymbol = sellTx.assetOut || 'UNKNOWN';
            const assetLots = costLots.get(assetSymbol) || [];
            const capitalGain = this.calculateCapitalGain(sellTx, assetLots);
            if (capitalGain) {
                transactions.push(capitalGain);
                // Agregar al resumen por activo
                if (!byAsset[assetSymbol]) {
                    byAsset[assetSymbol] = {
                        symbol: assetSymbol,
                        totalGain: 0,
                        totalLoss: 0,
                        netGain: 0,
                        transactionCount: 0
                    };
                }
                byAsset[assetSymbol].transactionCount++;
                if (capitalGain.capitalGain >= 0) {
                    byAsset[assetSymbol].totalGain += capitalGain.capitalGain;
                } else {
                    byAsset[assetSymbol].totalLoss += Math.abs(capitalGain.capitalGain);
                }
                byAsset[assetSymbol].netGain += capitalGain.capitalGain;
            }
        }
        // Calcular totales
        let shortTermGains = 0;
        let shortTermLosses = 0;
        let longTermGains = 0;
        let longTermLosses = 0;
        for (const tx of transactions){
            if (tx.isShortTerm) {
                if (tx.capitalGain >= 0) {
                    shortTermGains += tx.capitalGain;
                } else {
                    shortTermLosses += Math.abs(tx.capitalGain);
                }
            } else {
                if (tx.capitalGain >= 0) {
                    longTermGains += tx.capitalGain;
                } else {
                    longTermLosses += Math.abs(tx.capitalGain);
                }
            }
        }
        const totalGains = shortTermGains + longTermGains;
        const totalLosses = shortTermLosses + longTermLosses;
        const netCapitalGain = totalGains - totalLosses;
        // Calcular impuesto estimado
        const estimatedTax = this.calculateTax(Math.max(0, netCapitalGain));
        const summary = {
            year,
            generatedAt: new Date(),
            shortTermGains,
            shortTermLosses,
            longTermGains,
            longTermLosses,
            totalGains,
            totalLosses,
            netCapitalGain,
            estimatedTax,
            transactions,
            byAsset
        };
        this.logger.log(`Tax report generated for ${year}: ${transactions.length} transactions, ` + `net gain: ${netCapitalGain.toFixed(2)} EUR, estimated tax: ${estimatedTax.toFixed(2)} EUR`);
        return summary;
    }
    /**
   * Construye los lotes de costo (FIFO) a partir de las compras
   */ async buildCostLots(companyId, walletIds, upToDate) {
        // Transacciones de entrada (compras/depósitos)
        const buyTransactions = await this.prisma.cryptoTransaction.findMany({
            where: {
                walletId: {
                    in: walletIds
                },
                type: {
                    in: [
                        'TRANSFER_IN',
                        'CLAIM_REWARD',
                        'AIRDROP'
                    ]
                },
                blockTimestamp: {
                    lte: upToDate
                }
            },
            orderBy: {
                blockTimestamp: 'asc'
            }
        });
        // Transacciones de salida previas
        const sellTransactions = await this.prisma.cryptoTransaction.findMany({
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
                    lte: upToDate
                }
            },
            orderBy: {
                blockTimestamp: 'asc'
            }
        });
        const lotsByAsset = new Map();
        // Crear lotes de compra
        for (const tx of buyTransactions){
            const assetSymbol = tx.assetIn || 'UNKNOWN';
            if (!lotsByAsset.has(assetSymbol)) {
                lotsByAsset.set(assetSymbol, []);
            }
            const quantity = tx.amountIn?.toNumber() || 0;
            const priceEur = tx.priceInEur?.toNumber() || 0;
            const totalEur = quantity * priceEur;
            const costBasis = quantity > 0 ? totalEur / quantity : 0;
            lotsByAsset.get(assetSymbol).push({
                id: tx.id,
                assetSymbol,
                quantity,
                costBasisEur: costBasis,
                acquisitionDate: tx.blockTimestamp,
                source: tx.subtype || 'MANUAL',
                remaining: quantity
            });
        }
        // Consumir lotes según ventas previas (FIFO)
        for (const sellTx of sellTransactions){
            const assetSymbol = sellTx.assetOut || 'UNKNOWN';
            const lots = lotsByAsset.get(assetSymbol) || [];
            let remaining = sellTx.amountOut?.toNumber() || 0;
            for (const lot of lots){
                if (remaining <= 0) break;
                if (lot.remaining <= 0) continue;
                const toConsume = Math.min(lot.remaining, remaining);
                lot.remaining -= toConsume;
                remaining -= toConsume;
            }
        }
        return lotsByAsset;
    }
    /**
   * Calcula la ganancia/pérdida patrimonial de una venta usando FIFO
   */ calculateCapitalGain(sellTx, lots) {
        const sellQuantity = sellTx.amountOut?.toNumber() || 0;
        const sellPriceEur = sellTx.priceOutEur?.toNumber() || 0;
        const sellTotalEur = sellQuantity * sellPriceEur;
        const assetSymbol = sellTx.assetOut || 'UNKNOWN';
        if (sellQuantity <= 0 || sellTotalEur <= 0) {
            return null;
        }
        let remaining = sellQuantity;
        let totalCostBasis = 0;
        const usedLots = [];
        let earliestAcquisition = null;
        // Consumir lotes FIFO
        for (const lot of lots){
            if (remaining <= 0) break;
            if (lot.remaining <= 0) continue;
            const toUse = Math.min(lot.remaining, remaining);
            const lotCost = toUse * lot.costBasisEur;
            usedLots.push({
                acquisitionDate: lot.acquisitionDate,
                quantityUsed: toUse,
                costBasisPerUnit: lot.costBasisEur,
                costBasisTotal: lotCost
            });
            totalCostBasis += lotCost;
            remaining -= toUse;
            lot.remaining -= toUse;
            if (!earliestAcquisition || lot.acquisitionDate < earliestAcquisition) {
                earliestAcquisition = lot.acquisitionDate;
            }
        }
        // Si no hay lotes suficientes, calcular con costo 0 (como si fuera ganancia total)
        if (remaining > 0) {
            this.logger.warn(`Insufficient cost basis for sell transaction ${sellTx.id}. ` + `Missing ${remaining} units of ${assetSymbol}`);
        }
        const capitalGain = sellTotalEur - totalCostBasis;
        // Calcular período de tenencia usando la fecha más antigua
        const holdingPeriodDays = earliestAcquisition ? Math.floor((sellTx.blockTimestamp.getTime() - earliestAcquisition.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        const isShortTerm = holdingPeriodDays < 365;
        // Calcular impuesto estimado de esta operación
        const taxBracket = this.getTaxBracket(capitalGain);
        const estimatedTax = capitalGain > 0 ? capitalGain * taxBracket : 0;
        return {
            sellTransactionId: sellTx.id,
            assetSymbol,
            sellDate: sellTx.blockTimestamp,
            sellQuantity,
            sellPriceEur,
            sellTotalEur,
            lots: usedLots,
            totalCostBasis,
            capitalGain,
            holdingPeriodDays,
            isShortTerm,
            taxBracket,
            estimatedTax
        };
    }
    /**
   * Calcula el impuesto según tramos de la base del ahorro
   */ calculateTax(gain) {
        if (gain <= 0) return 0;
        let tax = 0;
        let remaining = gain;
        let previousLimit = 0;
        for (const bracket of this.taxBrackets){
            const bracketAmount = Math.min(remaining, bracket.limit - previousLimit);
            if (bracketAmount <= 0) break;
            tax += bracketAmount * bracket.rate;
            remaining -= bracketAmount;
            previousLimit = bracket.limit;
        }
        return tax;
    }
    /**
   * Obtiene el tramo impositivo aproximado
   */ getTaxBracket(gain) {
        if (gain <= 0) return 0;
        for (const bracket of this.taxBrackets){
            if (gain <= bracket.limit) {
                return bracket.rate;
            }
        }
        return this.taxBrackets[this.taxBrackets.length - 1].rate;
    }
    /**
   * Exporta el informe a CSV
   */ async exportToCSV(companyId, year) {
        const report = await this.generateTaxReport(companyId, year);
        const headers = [
            'Fecha Venta',
            'Activo',
            'Cantidad',
            'Precio Venta (EUR)',
            'Total Venta (EUR)',
            'Fecha Adquisición',
            'Costo Base (EUR)',
            'Ganancia/Pérdida (EUR)',
            'Días Tenencia',
            'Tipo',
            'Tramo IRPF',
            'Impuesto Est. (EUR)'
        ];
        const rows = report.transactions.flatMap((tx)=>{
            if (tx.lots.length === 0) {
                return [
                    [
                        tx.sellDate.toISOString().split('T')[0],
                        tx.assetSymbol,
                        tx.sellQuantity.toFixed(8),
                        tx.sellPriceEur.toFixed(2),
                        tx.sellTotalEur.toFixed(2),
                        'N/A',
                        '0.00',
                        tx.capitalGain.toFixed(2),
                        tx.holdingPeriodDays.toString(),
                        tx.isShortTerm ? 'Corto plazo' : 'Largo plazo',
                        (tx.taxBracket * 100).toFixed(0) + '%',
                        tx.estimatedTax.toFixed(2)
                    ]
                ];
            }
            return tx.lots.map((lot, index)=>[
                    tx.sellDate.toISOString().split('T')[0],
                    tx.assetSymbol,
                    lot.quantityUsed.toFixed(8),
                    tx.sellPriceEur.toFixed(2),
                    (lot.quantityUsed * tx.sellPriceEur).toFixed(2),
                    lot.acquisitionDate.toISOString().split('T')[0],
                    lot.costBasisTotal.toFixed(2),
                    index === 0 ? tx.capitalGain.toFixed(2) : '',
                    tx.holdingPeriodDays.toString(),
                    tx.isShortTerm ? 'Corto plazo' : 'Largo plazo',
                    (tx.taxBracket * 100).toFixed(0) + '%',
                    index === 0 ? tx.estimatedTax.toFixed(2) : ''
                ]);
        });
        const summary = [
            '',
            'RESUMEN',
            `Año;${year}`,
            `Ganancias corto plazo;${report.shortTermGains.toFixed(2)}`,
            `Pérdidas corto plazo;${report.shortTermLosses.toFixed(2)}`,
            `Ganancias largo plazo;${report.longTermGains.toFixed(2)}`,
            `Pérdidas largo plazo;${report.longTermLosses.toFixed(2)}`,
            `Total ganancias;${report.totalGains.toFixed(2)}`,
            `Total pérdidas;${report.totalLosses.toFixed(2)}`,
            `Ganancia neta;${report.netCapitalGain.toFixed(2)}`,
            `Impuesto estimado;${report.estimatedTax.toFixed(2)}`
        ];
        return [
            headers.join(';'),
            ...rows.map((row)=>row.join(';')),
            ...summary
        ].join('\n');
    }
    /**
   * Genera datos para el Modelo 100 (IRPF)
   */ async generateIRPFData(companyId, year) {
        const report = await this.generateTaxReport(companyId, year);
        return {
            baseImponibleAhorro: Math.max(0, report.netCapitalGain),
            gananciasPatrimoniales: report.totalGains,
            perdidasPatrimoniales: report.totalLosses,
            saldoNeto: report.netCapitalGain,
            cuotaIntegra: report.estimatedTax
        };
    }
    constructor(prisma){
        this.prisma = prisma;
        this.logger = new _common.Logger(TaxReportService.name);
        // Tramos IRPF base del ahorro 2024 (España)
        this.taxBrackets = [
            {
                limit: 6000,
                rate: 0.19
            },
            {
                limit: 50000,
                rate: 0.21
            },
            {
                limit: 200000,
                rate: 0.23
            },
            {
                limit: 300000,
                rate: 0.27
            },
            {
                limit: Infinity,
                rate: 0.28
            }
        ];
    }
};
TaxReportService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService
    ])
], TaxReportService);

//# sourceMappingURL=tax-report.service.js.map