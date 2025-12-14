"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "PriceUpdateProcessor", {
    enumerable: true,
    get: function() {
        return PriceUpdateProcessor;
    }
});
const _bullmq = require("@nestjs/bullmq");
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
const _schedule = require("@nestjs/schedule");
const _bullmq1 = require("bullmq");
const _database = require("../../../../libs/database/src");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
function _ts_param(paramIndex, decorator) {
    return function(target, key) {
        decorator(target, key, paramIndex);
    };
}
// CoinGecko ID mapping for common assets
const COINGECKO_IDS = {
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
    COMP: 'compound-governance-token'
};
const QUEUE_NAME = 'price-update';
let PriceUpdateProcessor = class PriceUpdateProcessor extends _bullmq.WorkerHost {
    /**
   * Cron job: Update prices every 5 minutes
   */ async scheduledPriceUpdate() {
        this.logger.log('Scheduled price update started');
        await this.priceQueue.add('scheduled-update', {
            source: 'coingecko'
        }, {
            jobId: `price-update-${Date.now()}`,
            priority: 5
        });
    }
    async process(job) {
        const { assets, source = 'coingecko' } = job.data;
        this.logger.log(`Processing price update for ${assets?.length || 'all'} assets via ${source}`);
        const result = {
            updated: 0,
            failed: 0,
            prices: {},
            errors: []
        };
        try {
            // Get assets to update
            let assetsToUpdate;
            if (assets && assets.length > 0) {
                assetsToUpdate = assets;
            } else {
                // Get all unique assets from the database
                const dbAssets = await this.prisma.cryptoAsset.findMany({
                    select: {
                        symbol: true
                    },
                    distinct: [
                        'symbol'
                    ]
                });
                assetsToUpdate = dbAssets.map((a)=>a.symbol);
            }
            if (assetsToUpdate.length === 0) {
                this.logger.warn('No assets to update');
                return result;
            }
            // Fetch prices from CoinGecko
            const prices = await this.fetchPricesFromCoinGecko(assetsToUpdate);
            // Update each asset in the database
            for (const symbol of assetsToUpdate){
                try {
                    const price = prices[symbol];
                    if (price !== undefined) {
                        await this.prisma.cryptoAsset.updateMany({
                            where: {
                                symbol
                            },
                            data: {
                                lastPrice: price.toString(),
                                lastPriceAt: new Date()
                            }
                        });
                        // Also store in price history for FIFO calculations
                        await this.prisma.priceHistory.create({
                            data: {
                                symbol,
                                priceEur: price.toString(),
                                source: 'coingecko',
                                timestamp: new Date()
                            }
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
            this.logger.log(`Price update completed: ${result.updated} updated, ${result.failed} failed`);
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
   */ async fetchPricesFromCoinGecko(symbols) {
        const prices = {};
        // Map symbols to CoinGecko IDs
        const coingeckoIds = [];
        const symbolToId = {};
        for (const symbol of symbols){
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
        for(let i = 0; i < coingeckoIds.length; i += batchSize){
            const batch = coingeckoIds.slice(i, i + batchSize);
            const idsParam = batch.join(',');
            try {
                const url = `${this.coingeckoBaseUrl}/simple/price?ids=${idsParam}&vs_currencies=eur`;
                const headers = {
                    Accept: 'application/json'
                };
                // Add API key if available (for higher rate limits)
                if (this.coingeckoApiKey) {
                    headers['x-cg-demo-api-key'] = this.coingeckoApiKey;
                }
                const response = await fetch(url, {
                    headers
                });
                if (!response.ok) {
                    throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
                }
                const data = await response.json();
                // Map back to symbols
                for (const [id, priceData] of Object.entries(data)){
                    const symbol = symbolToId[id];
                    if (symbol && priceData.eur) {
                        prices[symbol] = priceData.eur;
                    }
                }
                // Rate limiting: wait 1 second between batches (free tier: 10-30 calls/min)
                if (i + batchSize < coingeckoIds.length) {
                    await new Promise((resolve)=>setTimeout(resolve, 1000));
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                this.logger.error(`CoinGecko batch request failed: ${errorMessage}`);
            }
        }
        return prices;
    }
    onCompleted(job) {
        this.logger.debug(`Price update job ${job.id} completed`);
    }
    onFailed(job, error) {
        this.logger.error(`Price update job failed: ${error.message}`);
    }
    constructor(prisma, configService, priceQueue){
        super(), this.prisma = prisma, this.configService = configService, this.priceQueue = priceQueue, this.logger = new _common.Logger(PriceUpdateProcessor.name), this.coingeckoBaseUrl = 'https://api.coingecko.com/api/v3';
        this.coingeckoApiKey = this.configService.get('COINGECKO_API_KEY');
    }
};
_ts_decorate([
    (0, _schedule.Cron)(_schedule.CronExpression.EVERY_5_MINUTES),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PriceUpdateProcessor.prototype, "scheduledPriceUpdate", null);
_ts_decorate([
    (0, _bullmq.OnWorkerEvent)('completed'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _bullmq1.Job === "undefined" ? Object : _bullmq1.Job
    ]),
    _ts_metadata("design:returntype", void 0)
], PriceUpdateProcessor.prototype, "onCompleted", null);
_ts_decorate([
    (0, _bullmq.OnWorkerEvent)('failed'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        typeof Error === "undefined" ? Object : Error
    ]),
    _ts_metadata("design:returntype", void 0)
], PriceUpdateProcessor.prototype, "onFailed", null);
PriceUpdateProcessor = _ts_decorate([
    (0, _bullmq.Processor)(QUEUE_NAME),
    _ts_param(2, (0, _bullmq.InjectQueue)(QUEUE_NAME)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService,
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService,
        typeof _bullmq1.Queue === "undefined" ? Object : _bullmq1.Queue
    ])
], PriceUpdateProcessor);

//# sourceMappingURL=price-update.processor.js.map