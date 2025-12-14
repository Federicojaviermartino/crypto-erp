import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '@crypto-erp/database';
import { CreateWalletDto, UpdateWalletDto } from '../dto/index.js';
import { Wallet, SyncStatus } from '@prisma/client';
import { CovalentClient, CovalentBalance } from '../blockchain/covalent.client.js';

export interface WalletWithBalances extends Wallet {
  balances?: CovalentBalance[];
  totalValueEur?: number;
}

@Injectable()
export class WalletsService {
  private readonly logger = new Logger(WalletsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly covalent: CovalentClient,
  ) {}

  async findAll(companyId: string): Promise<Wallet[]> {
    return this.prisma.wallet.findMany({
      where: { companyId },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findById(companyId: string, id: string): Promise<Wallet> {
    const wallet = await this.prisma.wallet.findFirst({
      where: { id, companyId },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet with ID ${id} not found`);
    }

    return wallet;
  }

  async findByAddress(companyId: string, chain: string, address: string): Promise<Wallet | null> {
    return this.prisma.wallet.findFirst({
      where: {
        companyId,
        chain: chain.toLowerCase(),
        address: address.toLowerCase(),
      },
    });
  }

  async create(companyId: string, dto: CreateWalletDto): Promise<Wallet> {
    const normalizedAddress = dto.address.toLowerCase();
    const normalizedChain = dto.chain.toLowerCase();

    // Check for duplicate wallet
    const existing = await this.findByAddress(companyId, normalizedChain, normalizedAddress);
    if (existing) {
      throw new ConflictException(
        `Wallet ${normalizedAddress} on ${normalizedChain} already exists`,
      );
    }

    return this.prisma.wallet.create({
      data: {
        address: normalizedAddress,
        chain: normalizedChain,
        label: dto.label,
        type: dto.type || 'EXTERNAL',
        accountCode: dto.accountCode,
        syncStatus: 'PENDING',
        companyId,
      },
    });
  }

  async update(companyId: string, id: string, dto: UpdateWalletDto): Promise<Wallet> {
    await this.findById(companyId, id);

    return this.prisma.wallet.update({
      where: { id },
      data: {
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.accountCode !== undefined && { accountCode: dto.accountCode }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async delete(companyId: string, id: string): Promise<void> {
    const wallet = await this.findById(companyId, id);

    // Check for transactions linked to this wallet
    const txCount = await this.prisma.cryptoTransaction.count({
      where: { walletId: id },
    });

    if (txCount > 0) {
      throw new ConflictException(
        `Cannot delete wallet with ${txCount} transactions. Deactivate instead.`,
      );
    }

    await this.prisma.wallet.delete({ where: { id } });
  }

  async getWalletWithBalances(companyId: string, id: string): Promise<WalletWithBalances> {
    const wallet = await this.findById(companyId, id);

    if (!this.covalent.isConfigured()) {
      this.logger.warn('Covalent API not configured - cannot fetch balances');
      return wallet;
    }

    try {
      const balances = await this.covalent.getBalances(wallet.chain, wallet.address);

      const totalValueEur = balances.reduce((sum, b) => sum + (b.quote || 0), 0);

      return {
        ...wallet,
        balances,
        totalValueEur,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch balances for wallet ${id}:`, error);
      return wallet;
    }
  }

  async setSyncStatus(
    id: string,
    status: SyncStatus,
    error?: string | null,
    lastBlock?: bigint,
  ): Promise<void> {
    await this.prisma.wallet.update({
      where: { id },
      data: {
        syncStatus: status,
        syncError: error || null,
        ...(status === 'SYNCED' && { lastSyncAt: new Date() }),
        ...(lastBlock !== undefined && { lastSyncBlock: lastBlock }),
      },
    });
  }

  async getWalletsForSync(companyId?: string): Promise<Wallet[]> {
    return this.prisma.wallet.findMany({
      where: {
        isActive: true,
        ...(companyId && { companyId }),
        syncStatus: { not: 'SYNCING' },
      },
      orderBy: { lastSyncAt: 'asc' },
    });
  }

  async countTransactions(walletId: string): Promise<number> {
    return this.prisma.cryptoTransaction.count({
      where: { walletId },
    });
  }

  async getWalletStats(companyId: string, id: string): Promise<{
    transactionCount: number;
    lastTransaction: Date | null;
    uniqueAssets: number;
  }> {
    const wallet = await this.findById(companyId, id);

    const [transactionCount, lastTx, assets] = await Promise.all([
      this.prisma.cryptoTransaction.count({
        where: { walletId: id },
      }),
      this.prisma.cryptoTransaction.findFirst({
        where: { walletId: id },
        orderBy: { blockTimestamp: 'desc' },
        select: { blockTimestamp: true },
      }),
      this.prisma.cryptoTransaction.groupBy({
        by: ['assetIn', 'assetOut'],
        where: { walletId: id },
      }),
    ]);

    // Count unique assets
    const uniqueAssetSet = new Set<string>();
    assets.forEach(a => {
      if (a.assetIn) uniqueAssetSet.add(a.assetIn);
      if (a.assetOut) uniqueAssetSet.add(a.assetOut);
    });

    return {
      transactionCount,
      lastTransaction: lastTx?.blockTimestamp || null,
      uniqueAssets: uniqueAssetSet.size,
    };
  }
}
