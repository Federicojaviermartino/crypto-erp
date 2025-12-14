import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@crypto-erp/database';
import { CryptoLot } from '@prisma/client';

interface CostBasisResult {
  costBasis: number;
  realizedGain: number;
  lotsUsed: {
    lotId: string;
    amountUsed: number;
    costBasis: number;
    acquiredAt: Date;
    holdingPeriod: number; // days
  }[];
}

interface PortfolioPosition {
  assetId: string;
  symbol: string;
  name: string;
  totalAmount: number;
  averageCostBasis: number;
  totalCostBasis: number;
  currentPrice?: number;
  currentValue?: number;
  unrealizedGain?: number;
}

export interface TaxReportEntry {
  transactionId: string;
  date: Date;
  type: string;
  assetSymbol: string;
  amount: number;
  proceeds: number;
  costBasis: number;
  gainLoss: number;
  holdingPeriod: 'SHORT' | 'LONG';
}

@Injectable()
export class CostBasisService {
  private readonly logger = new Logger(CostBasisService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new cost basis lot for an acquisition (BUY, TRANSFER_IN, STAKING_REWARD, etc.)
   */
  async createLot(
    companyId: string,
    sourceTxId: string,
    cryptoAssetId: string,
    amount: number,
    costBasisEur: number,
    acquiredAt: Date,
  ): Promise<CryptoLot> {
    return this.prisma.cryptoLot.create({
      data: {
        companyId,
        cryptoAssetId,
        sourceTxId,
        sourceType: 'purchase',
        acquiredAmount: amount,
        remainingAmount: amount,
        costBasisEur,
        costPerUnit: amount > 0 ? costBasisEur / amount : 0,
        acquiredAt,
      },
    });
  }

  /**
   * Calculate cost basis for a disposal using FIFO method
   * Returns the cost basis and realized gain/loss
   */
  async calculateFIFO(
    companyId: string,
    cryptoAssetId: string,
    amountToSell: number,
    saleDate: Date,
    saleProceeds: number,
  ): Promise<CostBasisResult> {
    // Get available lots in FIFO order (oldest first)
    const lots = await this.prisma.cryptoLot.findMany({
      where: {
        companyId,
        cryptoAssetId,
        remainingAmount: { gt: 0 },
      },
      orderBy: { acquiredAt: 'asc' },
    });

    let remainingToSell = amountToSell;
    let totalCostBasis = 0;
    const lotsUsed: CostBasisResult['lotsUsed'] = [];

    for (const lot of lots) {
      if (remainingToSell <= 0) break;

      const remaining = lot.remainingAmount.toNumber();
      const amountFromThisLot = Math.min(remaining, remainingToSell);
      const costBasisFromThisLot = amountFromThisLot * lot.costPerUnit.toNumber();

      totalCostBasis += costBasisFromThisLot;
      remainingToSell -= amountFromThisLot;

      const holdingPeriod = Math.floor(
        (saleDate.getTime() - lot.acquiredAt.getTime()) / (1000 * 60 * 60 * 24),
      );

      lotsUsed.push({
        lotId: lot.id,
        amountUsed: amountFromThisLot,
        costBasis: costBasisFromThisLot,
        acquiredAt: lot.acquiredAt,
        holdingPeriod,
      });

      // Update the lot's remaining amount
      await this.prisma.cryptoLot.update({
        where: { id: lot.id },
        data: {
          remainingAmount: remaining - amountFromThisLot,
        },
      });
    }

    if (remainingToSell > 0.00000001) {
      this.logger.warn(
        `Insufficient lots to cover sale of ${amountToSell}. Remaining: ${remainingToSell}`,
      );
    }

    const realizedGain = saleProceeds - totalCostBasis;

    return {
      costBasis: totalCostBasis,
      realizedGain,
      lotsUsed,
    };
  }

  /**
   * Get current portfolio positions with cost basis
   */
  async getPortfolioPositions(companyId: string): Promise<PortfolioPosition[]> {
    const assets = await this.prisma.cryptoAsset.findMany({
      where: { companyId, isActive: true },
    });

    const positions: PortfolioPosition[] = [];

    for (const asset of assets) {
      const lots = await this.prisma.cryptoLot.findMany({
        where: {
          companyId,
          cryptoAssetId: asset.id,
          remainingAmount: { gt: 0 },
        },
      });

      if (lots.length === 0) continue;

      const totalAmount = lots.reduce((sum, lot) => sum + lot.remainingAmount.toNumber(), 0);
      const totalCostBasis = lots.reduce(
        (sum, lot) => sum + lot.remainingAmount.toNumber() * lot.costPerUnit.toNumber(),
        0,
      );

      positions.push({
        assetId: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        totalAmount,
        averageCostBasis: totalAmount > 0 ? totalCostBasis / totalAmount : 0,
        totalCostBasis,
      });
    }

    return positions;
  }

  /**
   * Get cost basis lots for a specific asset
   */
  async getLotsForAsset(
    companyId: string,
    cryptoAssetId: string,
    includeExhausted: boolean = false,
  ): Promise<CryptoLot[]> {
    return this.prisma.cryptoLot.findMany({
      where: {
        companyId,
        cryptoAssetId,
        ...(includeExhausted ? {} : { remainingAmount: { gt: 0 } }),
      },
      orderBy: { acquiredAt: 'asc' },
    });
  }

  /**
   * Generate tax report for realized gains/losses
   * Based on SWAP and TRANSFER_OUT transactions
   */
  async generateTaxReport(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    entries: TaxReportEntry[];
    summary: {
      totalProceeds: number;
      totalCostBasis: number;
      totalGainLoss: number;
      shortTermGainLoss: number;
      longTermGainLoss: number;
    };
  }> {
    // Get wallets for this company
    const wallets = await this.prisma.wallet.findMany({
      where: { companyId },
      select: { id: true },
    });
    const walletIds = wallets.map(w => w.id);

    // Get disposal transactions (SWAP, TRANSFER_OUT) in the period
    const transactions = await this.prisma.cryptoTransaction.findMany({
      where: {
        walletId: { in: walletIds },
        type: { in: ['SWAP', 'TRANSFER_OUT'] },
        blockTimestamp: { gte: startDate, lte: endDate },
      },
      orderBy: { blockTimestamp: 'asc' },
    });

    const entries: TaxReportEntry[] = [];
    let totalProceeds = 0;
    let totalCostBasis = 0;
    let shortTermGainLoss = 0;
    let longTermGainLoss = 0;

    for (const tx of transactions) {
      const costBasisData = tx.costBasis?.toNumber() || 0;
      const gainLoss = tx.realizedGain?.toNumber() || 0;
      const amount = tx.amountOut?.toNumber() || 0;
      const proceeds = tx.priceOutEur?.toNumber() || 0;

      // Simplified holding period calculation
      const isLongTerm = false; // Would need lot tracking for accurate calculation

      entries.push({
        transactionId: tx.id,
        date: tx.blockTimestamp,
        type: tx.type,
        assetSymbol: tx.assetOut || 'UNKNOWN',
        amount,
        proceeds,
        costBasis: costBasisData,
        gainLoss,
        holdingPeriod: isLongTerm ? 'LONG' : 'SHORT',
      });

      totalProceeds += proceeds;
      totalCostBasis += costBasisData;

      if (isLongTerm) {
        longTermGainLoss += gainLoss;
      } else {
        shortTermGainLoss += gainLoss;
      }
    }

    return {
      entries,
      summary: {
        totalProceeds,
        totalCostBasis,
        totalGainLoss: shortTermGainLoss + longTermGainLoss,
        shortTermGainLoss,
        longTermGainLoss,
      },
    };
  }

  /**
   * Recalculate all cost basis lots for an asset (use with caution)
   */
  async recalculateForAsset(companyId: string, cryptoAssetId: string): Promise<void> {
    this.logger.log(`Recalculating cost basis for asset ${cryptoAssetId}`);

    // Delete all existing lots for this asset
    await this.prisma.cryptoLot.deleteMany({
      where: { companyId, cryptoAssetId },
    });

    // Get wallets for this company
    const wallets = await this.prisma.wallet.findMany({
      where: { companyId },
      select: { id: true },
    });
    const walletIds = wallets.map(w => w.id);

    // Get crypto asset info
    const asset = await this.prisma.cryptoAsset.findUnique({
      where: { id: cryptoAssetId },
    });

    if (!asset) {
      this.logger.warn(`Asset ${cryptoAssetId} not found`);
      return;
    }

    // Get all transactions for this asset in chronological order
    const transactions = await this.prisma.cryptoTransaction.findMany({
      where: {
        walletId: { in: walletIds },
        OR: [
          { assetIn: asset.symbol },
          { assetOut: asset.symbol },
        ],
      },
      orderBy: { blockTimestamp: 'asc' },
    });

    for (const tx of transactions) {
      const txType = tx.type;

      // Acquisitions - assetIn is the received asset
      if (tx.assetIn === asset.symbol && ['TRANSFER_IN', 'SWAP', 'CLAIM_REWARD', 'AIRDROP'].includes(txType)) {
        const amount = tx.amountIn?.toNumber() || 0;
        const costBasisEur = tx.priceInEur?.toNumber() || 0;
        if (amount > 0) {
          await this.createLot(companyId, tx.id, cryptoAssetId, amount, costBasisEur, tx.blockTimestamp);
        }
      }

      // Disposals - assetOut is the sold asset
      if (tx.assetOut === asset.symbol && ['TRANSFER_OUT', 'SWAP'].includes(txType)) {
        const amount = tx.amountOut?.toNumber() || 0;
        const proceeds = tx.priceOutEur?.toNumber() || 0;
        if (amount > 0) {
          const result = await this.calculateFIFO(companyId, cryptoAssetId, amount, tx.blockTimestamp, proceeds);

          // Update transaction with cost basis info
          await this.prisma.cryptoTransaction.update({
            where: { id: tx.id },
            data: {
              costBasis: result.costBasis,
              realizedGain: result.realizedGain,
            },
          });
        }
      }
    }

    this.logger.log(`Completed cost basis recalculation for asset ${cryptoAssetId}`);
  }
}
