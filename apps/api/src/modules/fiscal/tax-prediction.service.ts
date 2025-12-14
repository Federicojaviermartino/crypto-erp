import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@crypto-erp/database';
import { PredictTaxImpactDto, TaxPredictionResponseDto, ConsumedLotDto } from './dto/predict-tax.dto.js';

/**
 * Servicio de Predicción Fiscal
 * Simula impacto fiscal de transacciones crypto antes de ejecutarlas
 * usando método FIFO sin modificar la base de datos
 */

interface CostLot {
  id: string;
  assetSymbol: string;
  quantity: number;
  costBasisEur: number;
  acquisitionDate: Date;
  remaining: number;
}

@Injectable()
export class TaxPredictionService {
  private readonly logger = new Logger(TaxPredictionService.name);

  // Tramos IRPF base del ahorro 2024 (España)
  private readonly taxBrackets = [
    { limit: 6000, rate: 0.19 },
    { limit: 50000, rate: 0.21 },
    { limit: 200000, rate: 0.23 },
    { limit: 300000, rate: 0.27 },
    { limit: Infinity, rate: 0.28 },
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Predice el impacto fiscal de una transacción prospectiva
   */
  async predictTaxImpact(
    companyId: string,
    dto: PredictTaxImpactDto,
  ): Promise<TaxPredictionResponseDto> {
    // Solo aplica a ventas
    if (dto.transactionType === 'BUY') {
      return this.getBuyPrediction(dto);
    }

    // Verificar que el activo existe
    const asset = await this.prisma.cryptoAsset.findFirst({
      where: {
        companyId,
        symbol: dto.asset.toUpperCase(),
      },
    });

    if (!asset) {
      throw new NotFoundException(`Crypto asset ${dto.asset} not found`);
    }

    // Obtener wallets de la compañía
    const wallets = await this.prisma.wallet.findMany({
      where: { companyId },
      select: { id: true },
    });
    const walletIds = wallets.map(w => w.id);

    if (walletIds.length === 0) {
      throw new NotFoundException('No wallets found for this company');
    }

    // Fecha de venta (usar fecha proporcionada o fecha actual)
    const saleDate = dto.dateOfSale ? new Date(dto.dateOfSale) : new Date();

    // Construir lotes de costo hasta la fecha de venta
    const costLots = await this.buildCostLots(
      walletIds,
      dto.asset.toUpperCase(),
      saleDate,
    );

    // Calcular impacto fiscal
    const result = this.simulateSale(
      dto.amount,
      dto.priceEur,
      costLots,
      saleDate,
    );

    // Generar recomendación
    const recommendation = this.generateRecommendation(result.lotsConsumed, result.capitalGain);

    this.logger.log(
      `Tax prediction for ${dto.amount} ${dto.asset} at ${dto.priceEur} EUR: ` +
      `Capital gain: ${result.capitalGain.toFixed(2)} EUR, Tax: ${result.taxOwed.toFixed(2)} EUR`
    );

    return {
      capitalGain: result.capitalGain,
      taxOwed: result.taxOwed,
      effectiveTaxRate: result.effectiveTaxRate,
      lotsConsumed: result.lotsConsumed,
      recommendation,
      totalProceeds: result.totalProceeds,
      totalAcquisitionCost: result.totalAcquisitionCost,
    };
  }

  /**
   * Predicción para compras (sin impacto fiscal inmediato)
   */
  private getBuyPrediction(dto: PredictTaxImpactDto): TaxPredictionResponseDto {
    return {
      capitalGain: 0,
      taxOwed: 0,
      effectiveTaxRate: 0,
      lotsConsumed: [],
      recommendation: `Buying ${dto.amount} ${dto.asset} at ${dto.priceEur} EUR will add to your cost basis. No immediate tax impact.`,
      totalProceeds: 0,
      totalAcquisitionCost: dto.amount * dto.priceEur,
    };
  }

  /**
   * Construye lotes de costo para un activo específico
   */
  private async buildCostLots(
    walletIds: string[],
    assetSymbol: string,
    upToDate: Date,
  ): Promise<CostLot[]> {
    // Transacciones de entrada (compras/depósitos)
    const buyTransactions = await this.prisma.cryptoTransaction.findMany({
      where: {
        walletId: { in: walletIds },
        type: { in: ['TRANSFER_IN', 'CLAIM_REWARD', 'AIRDROP'] },
        assetIn: assetSymbol,
        blockTimestamp: { lte: upToDate },
      },
      orderBy: { blockTimestamp: 'asc' },
    });

    // Transacciones de salida previas
    const sellTransactions = await this.prisma.cryptoTransaction.findMany({
      where: {
        walletId: { in: walletIds },
        type: { in: ['TRANSFER_OUT', 'SWAP'] },
        assetOut: assetSymbol,
        blockTimestamp: { lte: upToDate },
      },
      orderBy: { blockTimestamp: 'asc' },
    });

    const lots: CostLot[] = [];

    // Crear lotes de compra
    for (const tx of buyTransactions) {
      const quantity = tx.amountIn?.toNumber() || 0;
      const priceEur = tx.priceInEur?.toNumber() || 0;
      const totalEur = quantity * priceEur;
      const costBasis = quantity > 0 ? totalEur / quantity : 0;

      lots.push({
        id: tx.id,
        assetSymbol,
        quantity,
        costBasisEur: costBasis,
        acquisitionDate: tx.blockTimestamp,
        remaining: quantity,
      });
    }

    // Consumir lotes según ventas previas (FIFO)
    for (const sellTx of sellTransactions) {
      let remaining = sellTx.amountOut?.toNumber() || 0;

      for (const lot of lots) {
        if (remaining <= 0) break;
        if (lot.remaining <= 0) continue;

        const toConsume = Math.min(lot.remaining, remaining);
        lot.remaining -= toConsume;
        remaining -= toConsume;
      }
    }

    // Filtrar lotes con cantidad restante
    return lots.filter(lot => lot.remaining > 0);
  }

  /**
   * Simula una venta y calcula impacto fiscal
   */
  private simulateSale(
    sellQuantity: number,
    sellPriceEur: number,
    lots: CostLot[],
    saleDate: Date,
  ): {
    capitalGain: number;
    taxOwed: number;
    effectiveTaxRate: number;
    lotsConsumed: ConsumedLotDto[];
    totalProceeds: number;
    totalAcquisitionCost: number;
  } {
    const totalProceeds = sellQuantity * sellPriceEur;
    let remaining = sellQuantity;
    let totalAcquisitionCost = 0;
    const consumedLots: ConsumedLotDto[] = [];

    // Crear copias de los lotes para no modificar los originales
    const lotsCopy = lots.map(lot => ({ ...lot }));

    // Consumir lotes FIFO
    for (const lot of lotsCopy) {
      if (remaining <= 0) break;
      if (lot.remaining <= 0) continue;

      const toUse = Math.min(lot.remaining, remaining);
      const lotCost = toUse * lot.costBasisEur;
      const lotProceeds = toUse * sellPriceEur;
      const lotGainLoss = lotProceeds - lotCost;

      // Calcular período de tenencia
      const holdingPeriodMs = saleDate.getTime() - lot.acquisitionDate.getTime();
      const holdingPeriodDays = Math.floor(holdingPeriodMs / (1000 * 60 * 60 * 24));

      consumedLots.push({
        acquisitionDate: lot.acquisitionDate,
        quantity: toUse,
        costBasisPerUnit: lot.costBasisEur,
        totalCostBasis: lotCost,
        gainLoss: lotGainLoss,
        holdingPeriodDays,
      });

      totalAcquisitionCost += lotCost;
      remaining -= toUse;
      lot.remaining -= toUse;
    }

    // Si no hay suficientes lotes, advertir
    if (remaining > 0) {
      this.logger.warn(
        `Insufficient cost basis. Missing ${remaining} units. ` +
        `This will result in higher capital gains.`
      );
    }

    const capitalGain = totalProceeds - totalAcquisitionCost;
    const taxOwed = capitalGain > 0 ? this.calculateTax(capitalGain) : 0;
    const effectiveTaxRate = capitalGain > 0 ? this.getTaxBracket(capitalGain) * 100 : 0;

    return {
      capitalGain,
      taxOwed,
      effectiveTaxRate,
      lotsConsumed: consumedLots,
      totalProceeds,
      totalAcquisitionCost,
    };
  }

  /**
   * Calcula el impuesto según tramos de la base del ahorro
   */
  private calculateTax(gain: number): number {
    if (gain <= 0) return 0;

    let tax = 0;
    let remaining = gain;
    let previousLimit = 0;

    for (const bracket of this.taxBrackets) {
      const bracketAmount = Math.min(remaining, bracket.limit - previousLimit);
      if (bracketAmount <= 0) break;

      tax += bracketAmount * bracket.rate;
      remaining -= bracketAmount;
      previousLimit = bracket.limit;
    }

    return tax;
  }

  /**
   * Obtiene el tramo impositivo marginal
   */
  private getTaxBracket(gain: number): number {
    if (gain <= 0) return 0;

    for (const bracket of this.taxBrackets) {
      if (gain <= bracket.limit) {
        return bracket.rate;
      }
    }
    return this.taxBrackets[this.taxBrackets.length - 1].rate;
  }

  /**
   * Genera recomendación basada en los lotes consumidos
   */
  private generateRecommendation(lotsConsumed: ConsumedLotDto[], capitalGain: number): string {
    if (lotsConsumed.length === 0) {
      return 'No cost basis available. Consider adding purchase records for accurate tax calculation.';
    }

    // Verificar si hay lotes con menos de 1 año
    const shortTermLots = lotsConsumed.filter(lot => lot.holdingPeriodDays < 365);
    const longTermLots = lotsConsumed.filter(lot => lot.holdingPeriodDays >= 365);

    if (capitalGain > 0) {
      if (shortTermLots.length > 0 && longTermLots.length === 0) {
        const daysUntilLongTerm = 365 - Math.max(...shortTermLots.map(l => l.holdingPeriodDays));
        return `All consumed lots are short-term (< 1 year). Consider waiting ${daysUntilLongTerm} days for potential future tax benefits.`;
      }

      if (capitalGain > 50000) {
        return `High capital gain (${capitalGain.toFixed(2)} EUR) will be taxed at higher brackets. Consider splitting the sale across multiple tax years.`;
      }

      return `Capital gain of ${capitalGain.toFixed(2)} EUR will be taxed at ${this.getTaxBracket(capitalGain) * 100}% marginal rate.`;
    } else {
      return `This sale will result in a capital loss of ${Math.abs(capitalGain).toFixed(2)} EUR, which can offset other gains.`;
    }
  }
}
