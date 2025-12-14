import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@crypto-erp/database';

interface PortfolioOverview {
  totalCostBasis: number;
  totalPositions: number;
  totalTransactions: number;
  portfolioByAsset: Array<{
    symbol: string;
    name: string;
    amount: number;
    costBasis: number;
    percentage: number;
  }>;
}

interface TransactionStats {
  totalBuys: number;
  totalSells: number;
  buyVolume: number;
  sellVolume: number;
  avgBuySize: number;
  avgSellSize: number;
}

interface TimeSeriesData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
  }>;
}

interface DashboardMetrics {
  // KPIs principales
  totalCostBasis: number;
  monthlyActivity: number;
  pendingInvoices: number;
  yearlyCapitalGain: number;

  // Cambios porcentuales
  costBasisChange: number;
  activityChange: number;
  invoicesChange: number;
  capitalGainChange: number;

  // Datos de gráficos
  portfolioDistribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;

  monthlyTransactions: TimeSeriesData;
  monthlyVolume: TimeSeriesData;

  // Actividad reciente
  recentTransactions: Array<{
    id: string;
    type: string;
    asset: string;
    amount: number;
    valueEur: number;
    date: Date;
  }>;

  recentInvoices: Array<{
    id: string;
    number: string;
    customer: string;
    total: number;
    status: string;
    date: Date;
  }>;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  // Colores para gráficos
  private readonly chartColors = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#F97316', // orange
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene las métricas del dashboard principal
   */
  async getDashboardMetrics(companyId: string): Promise<DashboardMetrics> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Ejecutar consultas en paralelo
    const [
      portfolioOverview,
      currentMonthTx,
      lastMonthTx,
      pendingInvoices,
      lastMonthInvoices,
      yearlyGains,
      lastYearGains,
      recentTx,
      recentInv,
      monthlyData,
    ] = await Promise.all([
      this.getPortfolioOverview(companyId),
      this.getTransactionCount(companyId, startOfMonth, now),
      this.getTransactionCount(companyId, startOfLastMonth, startOfMonth),
      this.getPendingInvoicesCount(companyId),
      this.getInvoicesCount(companyId, startOfLastMonth, startOfMonth),
      this.getYearlyCapitalGain(companyId, now.getFullYear()),
      this.getYearlyCapitalGain(companyId, now.getFullYear() - 1),
      this.getRecentTransactions(companyId, 5),
      this.getRecentInvoices(companyId, 5),
      this.getMonthlyData(companyId, 12),
    ]);

    // Calcular cambios porcentuales
    const costBasisChange = 0; // No hay histórico, se podría implementar
    const activityChange = lastMonthTx > 0
      ? ((currentMonthTx - lastMonthTx) / lastMonthTx) * 100
      : 0;
    const invoicesChange = lastMonthInvoices > 0
      ? ((pendingInvoices - lastMonthInvoices) / lastMonthInvoices) * 100
      : 0;
    const capitalGainChange = lastYearGains !== 0
      ? ((yearlyGains - lastYearGains) / Math.abs(lastYearGains)) * 100
      : 0;

    // Distribución del portfolio
    const portfolioDistribution = portfolioOverview.portfolioByAsset.map((asset, index) => ({
      name: asset.symbol,
      value: asset.costBasis,
      color: this.chartColors[index % this.chartColors.length],
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
      recentInvoices: recentInv,
    };
  }

  /**
   * Obtiene el resumen del portfolio crypto
   */
  async getPortfolioOverview(companyId: string): Promise<PortfolioOverview> {
    // Obtener wallets de la compañía
    const wallets = await this.prisma.wallet.findMany({
      where: { companyId },
      select: { id: true },
    });

    const walletIds = wallets.map(w => w.id);

    // Obtener transacciones de esas wallets
    const transactions = await this.prisma.cryptoTransaction.findMany({
      where: { walletId: { in: walletIds } },
    });

    // Obtener assets de la compañía para mapear símbolos
    const assets = await this.prisma.cryptoAsset.findMany({
      where: { companyId },
    });
    const assetMap = new Map(assets.map(a => [a.symbol, a]));

    const portfolioMap = new Map<string, {
      symbol: string;
      name: string;
      amount: number;
      costBasis: number;
    }>();

    for (const tx of transactions) {
      // Procesar entrada (assetIn)
      if (tx.assetIn && tx.amountIn) {
        const asset = assetMap.get(tx.assetIn);
        if (!portfolioMap.has(tx.assetIn)) {
          portfolioMap.set(tx.assetIn, {
            symbol: tx.assetIn,
            name: asset?.name || tx.assetIn,
            amount: 0,
            costBasis: 0,
          });
        }
        const entry = portfolioMap.get(tx.assetIn)!;
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
            costBasis: 0,
          });
        }
        const entry = portfolioMap.get(tx.assetOut)!;
        entry.amount -= tx.amountOut.toNumber();
      }
    }

    const portfolioByAsset = Array.from(portfolioMap.values())
      .filter(p => p.amount > 0)
      .sort((a, b) => b.costBasis - a.costBasis);

    const totalCostBasis = portfolioByAsset.reduce((sum, p) => sum + p.costBasis, 0);

    return {
      totalCostBasis,
      totalPositions: portfolioByAsset.length,
      totalTransactions: transactions.length,
      portfolioByAsset: portfolioByAsset.map(p => ({
        ...p,
        percentage: totalCostBasis > 0 ? (p.costBasis / totalCostBasis) * 100 : 0,
      })),
    };
  }

  /**
   * Obtiene estadísticas de transacciones
   */
  async getTransactionStats(
    companyId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<TransactionStats> {
    // Obtener wallets de la compañía
    const wallets = await this.prisma.wallet.findMany({
      where: { companyId },
      select: { id: true },
    });

    const walletIds = wallets.map(w => w.id);

    const whereClause: Record<string, unknown> = { walletId: { in: walletIds } };
    if (startDate || endDate) {
      whereClause.blockTimestamp = {};
      if (startDate) (whereClause.blockTimestamp as Record<string, Date>).gte = startDate;
      if (endDate) (whereClause.blockTimestamp as Record<string, Date>).lte = endDate;
    }

    const transactions = await this.prisma.cryptoTransaction.findMany({
      where: whereClause,
      select: {
        type: true,
        amountIn: true,
        amountOut: true,
        priceInEur: true,
        priceOutEur: true,
      },
    });

    // TRANSFER_IN se considera "compra", TRANSFER_OUT y SWAP se consideran "venta"
    const buys = transactions.filter(t => t.type === 'TRANSFER_IN' || t.type === 'CLAIM_REWARD' || t.type === 'AIRDROP');
    const sells = transactions.filter(t => t.type === 'TRANSFER_OUT' || t.type === 'SWAP');

    const buyVolume = buys.reduce((sum, t) => {
      const amount = t.amountIn?.toNumber() || 0;
      const price = t.priceInEur?.toNumber() || 0;
      return sum + (amount * price);
    }, 0);

    const sellVolume = sells.reduce((sum, t) => {
      const amount = t.amountOut?.toNumber() || 0;
      const price = t.priceOutEur?.toNumber() || 0;
      return sum + (amount * price);
    }, 0);

    return {
      totalBuys: buys.length,
      totalSells: sells.length,
      buyVolume,
      sellVolume,
      avgBuySize: buys.length > 0 ? buyVolume / buys.length : 0,
      avgSellSize: sells.length > 0 ? sellVolume / sells.length : 0,
    };
  }

  /**
   * Obtiene datos mensuales para gráficos
   */
  async getMonthlyData(
    companyId: string,
    months: number,
  ): Promise<{ transactions: TimeSeriesData; volume: TimeSeriesData }> {
    const now = new Date();
    const labels: string[] = [];
    const transactionCounts: number[] = [];
    const buyVolumes: number[] = [];
    const sellVolumes: number[] = [];

    // Obtener wallets de la compañía
    const wallets = await this.prisma.wallet.findMany({
      where: { companyId },
      select: { id: true },
    });
    const walletIds = wallets.map(w => w.id);

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const monthName = monthStart.toLocaleDateString('es-ES', { month: 'short' });
      labels.push(monthName);

      const transactions = await this.prisma.cryptoTransaction.findMany({
        where: {
          walletId: { in: walletIds },
          blockTimestamp: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        select: {
          type: true,
          amountIn: true,
          amountOut: true,
          priceInEur: true,
          priceOutEur: true,
        },
      });

      transactionCounts.push(transactions.length);

      const buys = transactions.filter(t => t.type === 'TRANSFER_IN' || t.type === 'CLAIM_REWARD');
      const sells = transactions.filter(t => t.type === 'TRANSFER_OUT' || t.type === 'SWAP');

      const monthBuyVolume = buys.reduce((sum, t) => {
        const amount = t.amountIn?.toNumber() || 0;
        const price = t.priceInEur?.toNumber() || 0;
        return sum + (amount * price);
      }, 0);

      const monthSellVolume = sells.reduce((sum, t) => {
        const amount = t.amountOut?.toNumber() || 0;
        const price = t.priceOutEur?.toNumber() || 0;
        return sum + (amount * price);
      }, 0);

      buyVolumes.push(monthBuyVolume);
      sellVolumes.push(monthSellVolume);
    }

    return {
      transactions: {
        labels,
        datasets: [
          { label: 'Transacciones', data: transactionCounts },
        ],
      },
      volume: {
        labels,
        datasets: [
          { label: 'Compras (EUR)', data: buyVolumes },
          { label: 'Ventas (EUR)', data: sellVolumes },
        ],
      },
    };
  }

  // Helpers privados

  private async getTransactionCount(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const wallets = await this.prisma.wallet.findMany({
      where: { companyId },
      select: { id: true },
    });
    const walletIds = wallets.map(w => w.id);

    return this.prisma.cryptoTransaction.count({
      where: {
        walletId: { in: walletIds },
        blockTimestamp: {
          gte: startDate,
          lt: endDate,
        },
      },
    });
  }

  private async getPendingInvoicesCount(companyId: string): Promise<number> {
    return this.prisma.invoice.count({
      where: {
        companyId,
        status: { in: ['DRAFT', 'SENT'] },
      },
    });
  }

  private async getInvoicesCount(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    return this.prisma.invoice.count({
      where: {
        companyId,
        issueDate: {
          gte: startDate,
          lt: endDate,
        },
      },
    });
  }

  private async getYearlyCapitalGain(companyId: string, year: number): Promise<number> {
    // Simplified calculation - in production, use TaxReportService
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const wallets = await this.prisma.wallet.findMany({
      where: { companyId },
      select: { id: true },
    });
    const walletIds = wallets.map(w => w.id);

    const sells = await this.prisma.cryptoTransaction.findMany({
      where: {
        walletId: { in: walletIds },
        type: { in: ['TRANSFER_OUT', 'SWAP'] },
        blockTimestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        realizedGain: true,
        amountOut: true,
        priceOutEur: true,
      },
    });

    // Use realized gain if available, otherwise estimate
    const totalGain = sells.reduce((sum, s) => {
      if (s.realizedGain) {
        return sum + s.realizedGain.toNumber();
      }
      // Rough estimate if no realized gain
      const amount = s.amountOut?.toNumber() || 0;
      const price = s.priceOutEur?.toNumber() || 0;
      return sum + (amount * price * 0.2); // Assume 20% profit
    }, 0);

    return totalGain;
  }

  private async getRecentTransactions(companyId: string, limit: number) {
    const wallets = await this.prisma.wallet.findMany({
      where: { companyId },
      select: { id: true },
    });
    const walletIds = wallets.map(w => w.id);

    const transactions = await this.prisma.cryptoTransaction.findMany({
      where: { walletId: { in: walletIds } },
      orderBy: { blockTimestamp: 'desc' },
      take: limit,
    });

    return transactions.map(tx => ({
      id: tx.id,
      type: tx.type,
      asset: tx.assetIn || tx.assetOut || 'Unknown',
      amount: tx.amountIn?.toNumber() || tx.amountOut?.toNumber() || 0,
      valueEur: (() => {
        const amountIn = tx.amountIn?.toNumber() || 0;
        const priceIn = tx.priceInEur?.toNumber() || 0;
        const amountOut = tx.amountOut?.toNumber() || 0;
        const priceOut = tx.priceOutEur?.toNumber() || 0;
        return (amountIn * priceIn) || (amountOut * priceOut);
      })(),
      date: tx.blockTimestamp,
    }));
  }

  private async getRecentInvoices(companyId: string, limit: number) {
    const invoices = await this.prisma.invoice.findMany({
      where: { companyId },
      orderBy: { issueDate: 'desc' },
      take: limit,
      include: { contact: true },
    });

    return invoices.map(inv => ({
      id: inv.id,
      number: inv.fullNumber,
      customer: inv.contact?.name || inv.counterpartyName,
      total: inv.total.toNumber(),
      status: inv.status,
      date: inv.issueDate,
    }));
  }
}
