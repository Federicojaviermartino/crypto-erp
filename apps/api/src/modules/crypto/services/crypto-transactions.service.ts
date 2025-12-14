import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@crypto-erp/database';
import { CryptoTransaction, Prisma, CryptoTxType } from '@prisma/client';
import { CostBasisService } from './cost-basis.service.js';

type TransactionWithWallet = CryptoTransaction & {
  wallet: {
    id: string;
    label: string | null;
    address: string;
    chain: string;
  };
};

@Injectable()
export class CryptoTransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly costBasisService: CostBasisService,
  ) {}

  async findAll(
    companyId: string,
    query: {
      type?: string;
      walletId?: string;
      chain?: string;
      startDate?: string;
      endDate?: string;
      skip?: number;
      take?: number;
    },
  ): Promise<{ transactions: TransactionWithWallet[]; total: number }> {
    // Get wallets for company
    const wallets = await this.prisma.wallet.findMany({
      where: { companyId },
      select: { id: true },
    });
    const walletIds = wallets.map(w => w.id);

    const where: Prisma.CryptoTransactionWhereInput = {
      walletId: { in: walletIds },
      ...(query.walletId && { walletId: query.walletId }),
      ...(query.type && { type: query.type as CryptoTxType }),
      ...(query.chain && { chain: query.chain }),
      ...(query.startDate && { blockTimestamp: { gte: new Date(query.startDate) } }),
      ...(query.endDate && { blockTimestamp: { lte: new Date(query.endDate) } }),
    };

    const [transactions, total] = await Promise.all([
      this.prisma.cryptoTransaction.findMany({
        where,
        include: {
          wallet: {
            select: { id: true, label: true, address: true, chain: true },
          },
        },
        orderBy: { blockTimestamp: 'desc' },
        skip: query.skip || 0,
        take: query.take || 50,
      }),
      this.prisma.cryptoTransaction.count({ where }),
    ]);

    return { transactions: transactions as TransactionWithWallet[], total };
  }

  async findById(companyId: string, id: string): Promise<TransactionWithWallet> {
    // First verify the transaction belongs to a wallet owned by this company
    const transaction = await this.prisma.cryptoTransaction.findUnique({
      where: { id },
      include: {
        wallet: {
          select: { id: true, label: true, address: true, chain: true, companyId: true },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    // Verify company ownership
    if ((transaction.wallet as { companyId?: string }).companyId !== companyId) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return transaction as TransactionWithWallet;
  }

  async getPortfolioSummary(companyId: string): Promise<{
    positions: {
      assetId: string;
      symbol: string;
      name: string;
      totalAmount: number;
      totalCostBasis: number;
      averageCostBasis: number;
    }[];
    totalCostBasis: number;
  }> {
    const positions = await this.costBasisService.getPortfolioPositions(companyId);

    return {
      positions,
      totalCostBasis: positions.reduce((sum, p) => sum + p.totalCostBasis, 0),
    };
  }

  async getTaxReport(
    companyId: string,
    startDate: string,
    endDate: string,
  ) {
    return this.costBasisService.generateTaxReport(
      companyId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  async getTransactionStats(companyId: string): Promise<{
    totalTransactions: number;
    transactionsByType: Record<string, number>;
    transactionsByChain: Record<string, number>;
  }> {
    // Get wallets for company
    const wallets = await this.prisma.wallet.findMany({
      where: { companyId },
      select: { id: true },
    });
    const walletIds = wallets.map(w => w.id);

    const [totalTransactions, byType, byChain] = await Promise.all([
      this.prisma.cryptoTransaction.count({
        where: { walletId: { in: walletIds } },
      }),
      this.prisma.cryptoTransaction.groupBy({
        by: ['type'],
        where: { walletId: { in: walletIds } },
        _count: true,
      }),
      this.prisma.cryptoTransaction.groupBy({
        by: ['chain'],
        where: { walletId: { in: walletIds } },
        _count: true,
      }),
    ]);

    return {
      totalTransactions,
      transactionsByType: Object.fromEntries(
        byType.map(t => [t.type, t._count]),
      ),
      transactionsByChain: Object.fromEntries(
        byChain.map(c => [c.chain, c._count]),
      ),
    };
  }

  async recategorizeTransaction(
    companyId: string,
    id: string,
    newType: CryptoTxType,
    notes?: string,
  ): Promise<TransactionWithWallet> {
    const transaction = await this.findById(companyId, id);

    await this.prisma.cryptoTransaction.update({
      where: { id },
      data: {
        manualType: newType,
        manualNotes: notes,
      },
    });

    return this.findById(companyId, id);
  }

  /**
   * Find all transactions for batch operations (no pagination)
   * Used by batch categorization endpoint
   */
  async findAllForBatch(companyId: string, where: any): Promise<{ id: string }[]> {
    // Get wallets for company
    const wallets = await this.prisma.wallet.findMany({
      where: { companyId },
      select: { id: true },
    });
    const walletIds = wallets.map(w => w.id);

    // Add company filter
    const finalWhere: Prisma.CryptoTransactionWhereInput = {
      ...where,
      walletId: { in: walletIds },
    };

    return this.prisma.cryptoTransaction.findMany({
      where: finalWhere,
      select: { id: true },
      orderBy: { blockTimestamp: 'asc' },
    });
  }
}
