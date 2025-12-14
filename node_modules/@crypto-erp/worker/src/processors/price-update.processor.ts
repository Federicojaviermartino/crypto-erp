import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '@crypto-erp/database';

interface PriceUpdateJobData {
  assets?: string[]; // If empty, update all assets
  source?: 'coingecko' | 'manual';
}

interface PriceUpdateResult {
  updated: number;
  failed: number;
  prices: Record<string, number>;
  errors: string[];
}

// CoinGecko ID mapping for common assets
const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
  USDC: 'usd-coin',
  BNB: 'binancecoin',
  XRP: 'ripple',
  ADA: 'cardano',
  SOL: 'solana',
  DOGE: 'dogecoin',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  SHIB: 'shiba-inu',
  TRX: 'tron',
  AVAX: 'avalanche-2',
  LINK: 'chainlink',
  UNI: 'uniswap',
  ATOM: 'cosmos',
  LTC: 'litecoin',
  ETC: 'ethereum-classic',
  XLM: 'stellar',
  NEAR: 'near',
  APT: 'aptos',
  ARB: 'arbitrum',
  OP: 'optimism',
  MKR: 'maker',
  AAVE: 'aave',
  CRV: 'curve-dao-token',
  LDO: 'lido-dao',
  SNX: 'havven',
  COMP: 'compound-governance-token',
};

const QUEUE_NAME = 'price-update';

@Processor(QUEUE_NAME)
export class PriceUpdateProcessor extends WorkerHost {
  private readonly logger = new Logger(PriceUpdateProcessor.name);
  private readonly coingeckoApiKey: string | undefined;
  private readonly coingeckoBaseUrl = 'https://api.coingecko.com/api/v3';

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @InjectQueue(QUEUE_NAME) private readonly priceQueue: Queue,
  ) {
    super();
    this.coingeckoApiKey = this.configService.get('COINGECKO_API_KEY');
  }

  /**
   * Cron job: Update prices every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async scheduledPriceUpdate() {
    this.logger.log('Scheduled price update started');

    await this.priceQueue.add(
      'scheduled-update',
      { source: 'coingecko' },
      {
        jobId: `price-update-${Date.now()}`,
        priority: 5,
      },
    );
  }

  async process(job: Job<PriceUpdateJobData>): Promise<PriceUpdateResult> {
    const { assets, source = 'coingecko' } = job.data;

    this.logger.log(`Processing price update for ${assets?.length || 'all'} assets via ${source}`);

    const result: PriceUpdateResult = {
      updated: 0,
      failed: 0,
      prices: {},
      errors: [],
    };

    try {
      // Get assets to update
      let assetsToUpdate: string[];

      if (assets && assets.length > 0) {
        assetsToUpdate = assets;
      } else {
        // Get all unique assets from the database
        const dbAssets = await this.prisma.cryptoAsset.findMany({
          select: { symbol: true },
          distinct: ['symbol'],
        });
        assetsToUpdate = dbAssets.map((a) => a.symbol);
      }

      if (assetsToUpdate.length === 0) {
        this.logger.warn('No assets to update');
        return result;
      }

      // Fetch prices from CoinGecko
      const prices = await this.fetchPricesFromCoinGecko(assetsToUpdate);

      // Update each asset in the database
      for (const symbol of assetsToUpdate) {
        try {
          const price = prices[symbol];

          if (price !== undefined) {
            await this.prisma.cryptoAsset.updateMany({
              where: { symbol },
              data: {
                lastPrice: price.toString(),
                lastPriceAt: new Date(),
              },
            });

            // Also store in price history for FIFO calculations
            await this.prisma.priceHistory.create({
              data: {
                symbol,
                priceEur: price.toString(),
                source: 'coingecko',
                timestamp: new Date(),
              },
            });

            result.updated++;
            result.prices[symbol] = price;
          } else {
            result.failed++;
            result.errors.push(`No price found for ${symbol}`);
          }
        } catch (assetError) {
          result.failed++;
          const errorMessage = assetError instanceof Error ? assetError.message : 'Unknown error';
          result.errors.push(`Failed to update ${symbol}: ${errorMessage}`);
        }
      }

      this.logger.log(
        `Price update completed: ${result.updated} updated, ${result.failed} failed`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMessage);
      this.logger.error(`Price update failed: ${errorMessage}`);
      throw error;
    }

    return result;
  }

  /**
   * Fetch prices from CoinGecko API
   */
  private async fetchPricesFromCoinGecko(symbols: string[]): Promise<Record<string, number>> {
    const prices: Record<string, number> = {};

    // Map symbols to CoinGecko IDs
    const coingeckoIds: string[] = [];
    const symbolToId: Record<string, string> = {};

    for (const symbol of symbols) {
      const id = COINGECKO_IDS[symbol.toUpperCase()];
      if (id) {
        coingeckoIds.push(id);
        symbolToId[id] = symbol;
      }
    }

    if (coingeckoIds.length === 0) {
      return prices;
    }

    // CoinGecko allows up to 250 IDs per request
    const batchSize = 250;
    for (let i = 0; i < coingeckoIds.length; i += batchSize) {
      const batch = coingeckoIds.slice(i, i + batchSize);
      const idsParam = batch.join(',');

      try {
        const url = `${this.coingeckoBaseUrl}/simple/price?ids=${idsParam}&vs_currencies=eur`;
        const headers: Record<string, string> = {
          Accept: 'application/json',
        };

        // Add API key if available (for higher rate limits)
        if (this.coingeckoApiKey) {
          headers['x-cg-demo-api-key'] = this.coingeckoApiKey;
        }

        const response = await fetch(url, { headers });

        if (!response.ok) {
          throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as Record<string, { eur?: number }>;

        // Map back to symbols
        for (const [id, priceData] of Object.entries(data)) {
          const symbol = symbolToId[id];
          if (symbol && priceData.eur) {
            prices[symbol] = priceData.eur;
          }
        }

        // Rate limiting: wait 1 second between batches (free tier: 10-30 calls/min)
        if (i + batchSize < coingeckoIds.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`CoinGecko batch request failed: ${errorMessage}`);
      }
    }

    return prices;
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<PriceUpdateJobData>) {
    this.logger.debug(`Price update job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<PriceUpdateJobData> | undefined, error: Error) {
    this.logger.error(`Price update job failed: ${error.message}`);
  }
}
