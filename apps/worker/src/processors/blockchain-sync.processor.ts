import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@crypto-erp/database';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Prisma } from '@prisma/client';

const QUEUE_NAME = 'blockchain-sync';

interface SyncJobData {
  walletId: string;
  companyId: string;
  chain: string;
  address: string;
}

interface SyncResult {
  walletId: string;
  success: boolean;
  transactionsProcessed: number;
  newTransactions: number;
  lastBlock?: string;
  error?: string;
}

@Processor(QUEUE_NAME, {
  concurrency: 2,
})
export class BlockchainSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(BlockchainSyncProcessor.name);
  private readonly covalentApiKey: string | undefined;
  private readonly covalentBaseUrl = 'https://api.covalenthq.com/v1';

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue(QUEUE_NAME) private readonly syncQueue: Queue,
  ) {
    super();
    this.covalentApiKey = this.config.get<string>('COVALENT_API_KEY');
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async scheduledSync() {
    this.logger.log('Scheduled blockchain sync started');

    try {
      const wallets = await this.prisma.wallet.findMany({
        where: { isActive: true },
        select: {
          id: true,
          companyId: true,
          chain: true,
          address: true,
        },
      });

      this.logger.log(`Found ${wallets.length} active wallets to sync`);

      for (const wallet of wallets) {
        await this.syncQueue.add(
          'sync-wallet',
          {
            walletId: wallet.id,
            companyId: wallet.companyId,
            chain: wallet.chain,
            address: wallet.address,
          } as SyncJobData,
          {
            jobId: `sync-${wallet.id}-${Date.now()}`,
            priority: 10,
          },
        );
      }
    } catch (error) {
      this.logger.error('Failed to schedule wallet syncs', error);
    }
  }

  async process(job: Job<SyncJobData>): Promise<SyncResult> {
    const { walletId, chain, address } = job.data;

    this.logger.log(`Processing sync for wallet ${walletId} (${chain}:${address.substring(0, 10)}...)`);

    if (!this.covalentApiKey) {
      this.logger.warn('Covalent API key not configured - skipping sync');
      return {
        walletId,
        success: false,
        transactionsProcessed: 0,
        newTransactions: 0,
        error: 'Covalent API key not configured',
      };
    }

    try {
      await this.prisma.wallet.update({
        where: { id: walletId },
        data: { syncStatus: 'SYNCING' },
      });

      const wallet = await this.prisma.wallet.findUnique({
        where: { id: walletId },
      });

      const chainId = this.getChainId(chain);
      const startBlock = wallet?.lastSyncBlock ? Number(wallet.lastSyncBlock) + 1 : undefined;

      const transactions = await this.fetchTransactions(chainId, address, startBlock);

      let newTransactions = 0;
      let lastBlock: bigint | undefined;

      for (const tx of transactions) {
        const exists = await this.prisma.cryptoTransaction.findFirst({
          where: { walletId, txHash: tx.tx_hash },
        });

        if (!exists) {
          await this.createTransaction(walletId, tx, chain);
          newTransactions++;
        }

        const blockNum = BigInt(tx.block_height);
        if (!lastBlock || blockNum > lastBlock) {
          lastBlock = blockNum;
        }
      }

      await this.prisma.wallet.update({
        where: { id: walletId },
        data: {
          syncStatus: 'SYNCED',
          lastSyncAt: new Date(),
          lastSyncBlock: lastBlock,
          syncError: null,
        },
      });

      this.logger.log(`Sync complete for wallet ${walletId}: ${newTransactions} new transactions`);

      return {
        walletId,
        success: true,
        transactionsProcessed: transactions.length,
        newTransactions,
        lastBlock: lastBlock?.toString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.prisma.wallet.update({
        where: { id: walletId },
        data: {
          syncStatus: 'ERROR',
          syncError: errorMessage,
        },
      });

      this.logger.error(`Failed to sync wallet ${walletId}: ${errorMessage}`);

      return {
        walletId,
        success: false,
        transactionsProcessed: 0,
        newTransactions: 0,
        error: errorMessage,
      };
    }
  }

  private async fetchTransactions(
    chainId: number,
    address: string,
    startBlock?: number,
  ): Promise<any[]> {
    const params: Record<string, any> = {
      'page-size': 100,
    };
    if (startBlock) {
      params['starting-block'] = startBlock;
    }

    const response = await axios.get(
      `${this.covalentBaseUrl}/${chainId}/address/${address}/transactions_v3/`,
      {
        params,
        auth: {
          username: this.covalentApiKey!,
          password: '',
        },
        timeout: 30000,
      },
    );

    return response.data?.data?.items || [];
  }

  private async createTransaction(
    walletId: string,
    tx: any,
    chain: string,
  ): Promise<void> {
    const isIncoming = tx.to_address?.toLowerCase() === tx.from_address?.toLowerCase();
    const type = this.determineTransactionType(tx);

    await this.prisma.cryptoTransaction.create({
      data: {
        walletId,
        txHash: tx.tx_hash,
        blockNumber: BigInt(tx.block_height),
        blockTimestamp: new Date(tx.block_signed_at),
        chain,
        type,
        assetIn: isIncoming ? 'ETH' : null,
        amountIn: isIncoming && tx.value ? new Prisma.Decimal(tx.value).div(1e18) : null,
        assetOut: !isIncoming ? 'ETH' : null,
        amountOut: !isIncoming && tx.value ? new Prisma.Decimal(tx.value).div(1e18) : null,
        feeAsset: 'ETH',
        feeAmount: tx.gas_quote ? new Prisma.Decimal(tx.gas_spent).mul(tx.gas_price).div(1e18) : null,
        feeEur: tx.gas_quote ? new Prisma.Decimal(tx.gas_quote.toString()) : null,
        aiCategorized: true,
        aiConfidence: new Prisma.Decimal('0.7'),
        aiReasoning: `Auto-categorized by worker: ${type}`,
        status: 'COMPLETED',
        rawData: tx as unknown as Prisma.InputJsonValue,
      },
    });
  }

  private determineTransactionType(tx: any): 'SWAP' | 'TRANSFER_OUT' | 'CONTRACT_INTERACTION' | 'UNKNOWN' {
    if (tx.log_events?.some((log: any) =>
      log.decoded?.name === 'Swap' || log.decoded?.name === 'SwapExactTokensForTokens'
    )) {
      return 'SWAP';
    }
    if (tx.to_address && tx.from_address) {
      return tx.value && tx.value !== '0' ? 'TRANSFER_OUT' : 'CONTRACT_INTERACTION';
    }
    return 'UNKNOWN';
  }

  private getChainId(chain: string): number {
    const chainIds: Record<string, number> = {
      ETHEREUM: 1,
      POLYGON: 137,
      ARBITRUM: 42161,
      OPTIMISM: 10,
      BASE: 8453,
      AVALANCHE: 43114,
      BSC: 56,
    };
    return chainIds[chain] || 1;
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<SyncJobData>) {
    this.logger.debug(`Job ${job.id} completed for wallet ${job.data.walletId}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<SyncJobData>, error: Error) {
    this.logger.error(`Job ${job.id} failed for wallet ${job.data.walletId}: ${error.message}`);
  }
}
