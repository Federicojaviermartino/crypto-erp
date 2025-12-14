"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ExchangeAccountsService", {
    enumerable: true,
    get: function() {
        return ExchangeAccountsService;
    }
});
const _common = require("@nestjs/common");
const _database = require("../../../../../../libs/database/src");
const _exchangefactory = require("./exchange.factory.js");
const _exchangeinterface = require("./exchange.interface.js");
const _crypto = /*#__PURE__*/ _interop_require_wildcard(require("crypto"));
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {
        __proto__: null
    };
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'crypto-erp-default-key-32bytes!';
let ExchangeAccountsService = class ExchangeAccountsService {
    encrypt(text) {
        const iv = _crypto.randomBytes(16);
        const key = _crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
        const cipher = _crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }
    decrypt(text) {
        const [ivHex, encrypted] = text.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const key = _crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
        const decipher = _crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    async findAll(companyId) {
        const accounts = await this.prisma.exchangeAccount.findMany({
            where: {
                companyId
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        return accounts.map((account)=>({
                ...account,
                apiKey: account.apiKey ? '***' + account.apiKey.slice(-4) : null,
                apiSecret: '********'
            }));
    }
    async findOne(companyId, id) {
        const account = await this.prisma.exchangeAccount.findFirst({
            where: {
                id,
                companyId
            }
        });
        if (!account) {
            throw new _common.NotFoundException(`Exchange account ${id} not found`);
        }
        return {
            ...account,
            apiKey: account.apiKey ? '***' + account.apiKey.slice(-4) : null,
            apiSecret: '********'
        };
    }
    async create(companyId, data) {
        const exchange = data.exchange;
        if (!_exchangeinterface.EXCHANGE_INFO[exchange]) {
            throw new _common.BadRequestException(`Unsupported exchange: ${data.exchange}`);
        }
        // Test connection before saving
        const credentials = {
            apiKey: data.apiKey,
            apiSecret: data.apiSecret
        };
        try {
            const client = this.exchangeFactory.createClient(exchange, credentials);
            const isValid = await client.testConnection();
            if (!isValid) {
                throw new _common.BadRequestException('Invalid API credentials - connection test failed');
            }
        } catch (error) {
            if (error instanceof _common.BadRequestException) throw error;
            throw new _common.BadRequestException(`Failed to connect to ${exchange}: ${error.message}`);
        }
        const exchangeInfo = _exchangeinterface.EXCHANGE_INFO[exchange];
        const account = await this.prisma.exchangeAccount.create({
            data: {
                companyId,
                exchange,
                label: data.label || exchangeInfo.name,
                apiKey: this.encrypt(data.apiKey),
                apiSecret: this.encrypt(data.apiSecret),
                country: exchangeInfo.country,
                syncStatus: 'PENDING'
            }
        });
        return {
            ...account,
            apiKey: '***' + data.apiKey.slice(-4),
            apiSecret: '********'
        };
    }
    async update(companyId, id, data) {
        const existing = await this.prisma.exchangeAccount.findFirst({
            where: {
                id,
                companyId
            }
        });
        if (!existing) {
            throw new _common.NotFoundException(`Exchange account ${id} not found`);
        }
        const updateData = {};
        if (data.label) {
            updateData.label = data.label;
        }
        if (data.apiKey && data.apiSecret) {
            // Test new credentials
            const credentials = {
                apiKey: data.apiKey,
                apiSecret: data.apiSecret
            };
            try {
                const client = this.exchangeFactory.createClient(existing.exchange, credentials);
                const isValid = await client.testConnection();
                if (!isValid) {
                    throw new _common.BadRequestException('Invalid API credentials - connection test failed');
                }
            } catch (error) {
                if (error instanceof _common.BadRequestException) throw error;
                throw new _common.BadRequestException(`Failed to connect: ${error.message}`);
            }
            updateData.apiKey = this.encrypt(data.apiKey);
            updateData.apiSecret = this.encrypt(data.apiSecret);
        }
        const account = await this.prisma.exchangeAccount.update({
            where: {
                id
            },
            data: updateData
        });
        return {
            ...account,
            apiKey: account.apiKey ? '***' + this.decrypt(account.apiKey).slice(-4) : null,
            apiSecret: '********'
        };
    }
    async delete(companyId, id) {
        const existing = await this.prisma.exchangeAccount.findFirst({
            where: {
                id,
                companyId
            }
        });
        if (!existing) {
            throw new _common.NotFoundException(`Exchange account ${id} not found`);
        }
        await this.prisma.exchangeAccount.delete({
            where: {
                id
            }
        });
        return {
            success: true
        };
    }
    async testConnection(companyId, id) {
        const account = await this.prisma.exchangeAccount.findFirst({
            where: {
                id,
                companyId
            }
        });
        if (!account || !account.apiKey || !account.apiSecret) {
            throw new _common.NotFoundException(`Exchange account ${id} not found or missing credentials`);
        }
        const credentials = {
            apiKey: this.decrypt(account.apiKey),
            apiSecret: this.decrypt(account.apiSecret)
        };
        const client = this.exchangeFactory.createClient(account.exchange, credentials);
        return client.testConnection();
    }
    async getBalances(companyId, id) {
        const account = await this.prisma.exchangeAccount.findFirst({
            where: {
                id,
                companyId
            }
        });
        if (!account || !account.apiKey || !account.apiSecret) {
            throw new _common.NotFoundException(`Exchange account ${id} not found`);
        }
        const credentials = {
            apiKey: this.decrypt(account.apiKey),
            apiSecret: this.decrypt(account.apiSecret)
        };
        const client = this.exchangeFactory.createClient(account.exchange, credentials);
        return client.getBalances();
    }
    async syncTrades(companyId, id, options = {}) {
        const account = await this.prisma.exchangeAccount.findFirst({
            where: {
                id,
                companyId
            }
        });
        if (!account || !account.apiKey || !account.apiSecret) {
            throw new _common.NotFoundException(`Exchange account ${id} not found`);
        }
        // Update sync status
        await this.prisma.exchangeAccount.update({
            where: {
                id
            },
            data: {
                syncStatus: 'SYNCING'
            }
        });
        try {
            const credentials = {
                apiKey: this.decrypt(account.apiKey),
                apiSecret: this.decrypt(account.apiSecret)
            };
            const client = this.exchangeFactory.createClient(account.exchange, credentials);
            // Get trades from exchange
            const trades = await client.getTrades({
                startTime: options.startTime,
                endTime: options.endTime
            });
            let imported = 0;
            // Get or create exchange wallet for this account
            let exchangeWallet = await this.prisma.wallet.findFirst({
                where: {
                    companyId,
                    label: `Exchange: ${account.label || account.exchange}`
                }
            });
            if (!exchangeWallet) {
                exchangeWallet = await this.prisma.wallet.create({
                    data: {
                        companyId,
                        label: `Exchange: ${account.label || account.exchange}`,
                        chain: 'EXCHANGE',
                        address: account.id,
                        isActive: true
                    }
                });
            }
            // Import trades as crypto transactions
            for (const trade of trades){
                const baseAsset = this.extractBaseAsset(trade.symbol);
                const externalId = `${account.exchange}:${trade.id}`;
                // Check if trade already exists
                const existingTx = await this.prisma.cryptoTransaction.findFirst({
                    where: {
                        walletId: exchangeWallet.id,
                        txHash: externalId
                    }
                });
                if (!existingTx) {
                    const isBuy = trade.side === 'BUY';
                    await this.prisma.cryptoTransaction.create({
                        data: {
                            walletId: exchangeWallet.id,
                            type: isBuy ? 'TRANSFER_IN' : 'TRANSFER_OUT',
                            subtype: 'EXCHANGE_TRADE',
                            txHash: externalId,
                            blockNumber: 0,
                            chain: 'EXCHANGE',
                            blockTimestamp: trade.timestamp,
                            assetIn: isBuy ? baseAsset : undefined,
                            amountIn: isBuy ? trade.quantity : undefined,
                            assetOut: !isBuy ? baseAsset : undefined,
                            amountOut: !isBuy ? trade.quantity : undefined
                        }
                    });
                    imported++;
                }
            }
            // Update sync status
            await this.prisma.exchangeAccount.update({
                where: {
                    id
                },
                data: {
                    syncStatus: 'SYNCED',
                    lastSyncAt: new Date()
                }
            });
            this.logger.log(`Synced ${imported} trades from ${account.exchange} for company ${companyId}`);
            return {
                imported
            };
        } catch (error) {
            await this.prisma.exchangeAccount.update({
                where: {
                    id
                },
                data: {
                    syncStatus: 'ERROR'
                }
            });
            throw error;
        }
    }
    async syncDepositsWithdrawals(companyId, id, options = {}) {
        const account = await this.prisma.exchangeAccount.findFirst({
            where: {
                id,
                companyId
            }
        });
        if (!account || !account.apiKey || !account.apiSecret) {
            throw new _common.NotFoundException(`Exchange account ${id} not found`);
        }
        const credentials = {
            apiKey: this.decrypt(account.apiKey),
            apiSecret: this.decrypt(account.apiSecret)
        };
        const client = this.exchangeFactory.createClient(account.exchange, credentials);
        const [deposits, withdrawals] = await Promise.all([
            client.getDeposits(options),
            client.getWithdrawals(options)
        ]);
        // Get or create exchange wallet for this account
        let exchangeWallet = await this.prisma.wallet.findFirst({
            where: {
                companyId,
                label: `Exchange: ${account.label || account.exchange}`
            }
        });
        if (!exchangeWallet) {
            exchangeWallet = await this.prisma.wallet.create({
                data: {
                    companyId,
                    label: `Exchange: ${account.label || account.exchange}`,
                    chain: 'EXCHANGE',
                    address: account.id,
                    isActive: true
                }
            });
        }
        let depositCount = 0;
        let withdrawalCount = 0;
        // Import deposits
        for (const deposit of deposits){
            if (deposit.status !== 'COMPLETED') continue;
            const externalId = `${account.exchange}:deposit:${deposit.id}`;
            const existingTx = await this.prisma.cryptoTransaction.findFirst({
                where: {
                    walletId: exchangeWallet.id,
                    txHash: externalId
                }
            });
            if (!existingTx) {
                await this.prisma.cryptoTransaction.create({
                    data: {
                        walletId: exchangeWallet.id,
                        type: 'TRANSFER_IN',
                        subtype: 'DEPOSIT',
                        txHash: externalId,
                        blockNumber: 0,
                        chain: 'EXCHANGE',
                        blockTimestamp: deposit.timestamp,
                        assetIn: deposit.asset,
                        amountIn: deposit.amount
                    }
                });
                depositCount++;
            }
        }
        // Import withdrawals
        for (const withdrawal of withdrawals){
            if (withdrawal.status !== 'COMPLETED') continue;
            const externalId = `${account.exchange}:withdrawal:${withdrawal.id}`;
            const existingTx = await this.prisma.cryptoTransaction.findFirst({
                where: {
                    walletId: exchangeWallet.id,
                    txHash: externalId
                }
            });
            if (!existingTx) {
                await this.prisma.cryptoTransaction.create({
                    data: {
                        walletId: exchangeWallet.id,
                        type: 'TRANSFER_OUT',
                        subtype: 'WITHDRAWAL',
                        txHash: externalId,
                        blockNumber: 0,
                        chain: 'EXCHANGE',
                        blockTimestamp: withdrawal.timestamp,
                        assetOut: withdrawal.asset,
                        amountOut: withdrawal.amount
                    }
                });
                withdrawalCount++;
            }
        }
        return {
            deposits: depositCount,
            withdrawals: withdrawalCount
        };
    }
    extractBaseAsset(symbol) {
        // Common quote currencies
        const quotes = [
            'EUR',
            'USD',
            'USDT',
            'USDC',
            'BTC',
            'ETH',
            'BUSD'
        ];
        for (const quote of quotes){
            if (symbol.endsWith(quote)) {
                return symbol.slice(0, -quote.length);
            }
        }
        return symbol;
    }
    getSupportedExchanges() {
        return Object.entries(_exchangeinterface.EXCHANGE_INFO).map(([key, info])=>({
                id: key,
                ...info,
                supported: this.exchangeFactory.getSupportedExchanges().includes(key)
            }));
    }
    constructor(prisma, exchangeFactory){
        this.prisma = prisma;
        this.exchangeFactory = exchangeFactory;
        this.logger = new _common.Logger(ExchangeAccountsService.name);
    }
};
ExchangeAccountsService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService,
        typeof _exchangefactory.ExchangeFactory === "undefined" ? Object : _exchangefactory.ExchangeFactory
    ])
], ExchangeAccountsService);

//# sourceMappingURL=exchange-accounts.service.js.map