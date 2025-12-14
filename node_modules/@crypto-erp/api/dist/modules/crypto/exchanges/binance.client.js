"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "BinanceClient", {
    enumerable: true,
    get: function() {
        return BinanceClient;
    }
});
const _common = require("@nestjs/common");
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
let BinanceClient = class BinanceClient {
    sign(queryString) {
        return _crypto.createHmac('sha256', this.credentials.apiSecret).update(queryString).digest('hex');
    }
    async request(endpoint, params = {}, signed = false) {
        const url = new URL(`${this.baseUrl}${endpoint}`);
        if (signed) {
            params.timestamp = Date.now();
            params.recvWindow = 60000;
        }
        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)){
            searchParams.append(key, String(value));
        }
        const queryString = searchParams.toString();
        if (signed) {
            const signature = this.sign(queryString);
            url.search = `${queryString}&signature=${signature}`;
        } else if (queryString) {
            url.search = queryString;
        }
        const headers = {
            'X-MBX-APIKEY': this.credentials.apiKey
        };
        const response = await fetch(url.toString(), {
            headers
        });
        if (!response.ok) {
            const error = await response.text();
            this.logger.error(`Binance API error: ${response.status} - ${error}`);
            throw new Error(`Binance API error: ${response.status}`);
        }
        return response.json();
    }
    async testConnection() {
        try {
            await this.request('/api/v3/account', {}, true);
            return true;
        } catch  {
            return false;
        }
    }
    async getBalances() {
        const account = await this.request('/api/v3/account', {}, true);
        return account.balances.filter((b)=>parseFloat(b.free) > 0 || parseFloat(b.locked) > 0).map((b)=>({
                asset: b.asset,
                free: b.free,
                locked: b.locked,
                total: (parseFloat(b.free) + parseFloat(b.locked)).toString()
            }));
    }
    async getTrades(options = {}) {
        // If no symbol specified, we need to get all trading pairs first
        if (!options.symbol) {
            // Get all unique trading pairs from recent trades
            // For simplicity, return empty if no symbol - user should specify
            return [];
        }
        const params = {
            symbol: options.symbol,
            limit: options.limit || 1000
        };
        if (options.startTime) {
            params.startTime = options.startTime.getTime();
        }
        if (options.endTime) {
            params.endTime = options.endTime.getTime();
        }
        const trades = await this.request('/api/v3/myTrades', params, true);
        return trades.map((t)=>({
                id: t.id.toString(),
                symbol: t.symbol,
                orderId: t.orderId.toString(),
                side: t.isBuyer ? 'BUY' : 'SELL',
                price: t.price,
                quantity: t.qty,
                quoteQuantity: t.quoteQty,
                commission: t.commission,
                commissionAsset: t.commissionAsset,
                timestamp: new Date(t.time),
                isMaker: t.isMaker
            }));
    }
    async getDeposits(options = {}) {
        const params = {};
        if (options.asset) {
            params.coin = options.asset;
        }
        if (options.startTime) {
            params.startTime = options.startTime.getTime();
        }
        if (options.endTime) {
            params.endTime = options.endTime.getTime();
        }
        const deposits = await this.request('/sapi/v1/capital/deposit/hisrec', params, true);
        const statusMap = {
            0: 'PENDING',
            1: 'COMPLETED',
            6: 'COMPLETED'
        };
        return deposits.map((d)=>({
                id: d.id,
                asset: d.coin,
                amount: d.amount,
                status: statusMap[d.status] || 'PENDING',
                txHash: d.txId,
                timestamp: new Date(d.insertTime),
                network: d.network
            }));
    }
    async getWithdrawals(options = {}) {
        const params = {};
        if (options.asset) {
            params.coin = options.asset;
        }
        if (options.startTime) {
            params.startTime = options.startTime.getTime();
        }
        if (options.endTime) {
            params.endTime = options.endTime.getTime();
        }
        const withdrawals = await this.request('/sapi/v1/capital/withdraw/history', params, true);
        const statusMap = {
            0: 'PENDING',
            1: 'CANCELLED',
            2: 'PENDING',
            3: 'FAILED',
            4: 'PENDING',
            5: 'FAILED',
            6: 'COMPLETED'
        };
        return withdrawals.map((w)=>({
                id: w.id,
                asset: w.coin,
                amount: w.amount,
                fee: w.transactionFee,
                status: statusMap[w.status] || 'PENDING',
                txHash: w.txId,
                address: w.address,
                timestamp: new Date(w.applyTime),
                network: w.network
            }));
    }
    // Helper to get all symbols user has traded
    async getTradingSymbols() {
        const info = await this.request('/api/v3/exchangeInfo');
        const activeSymbols = info.symbols.filter((s)=>s.status === 'TRADING').map((s)=>s.symbol);
        return activeSymbols;
    }
    // Get all trades by iterating through common pairs
    async getAllTrades(options = {}) {
        const balances = await this.getBalances();
        const assets = balances.map((b)=>b.asset);
        const commonQuotes = [
            'USDT',
            'EUR',
            'BTC',
            'ETH',
            'BUSD'
        ];
        const allTrades = [];
        const processedSymbols = new Set();
        for (const asset of assets){
            for (const quote of commonQuotes){
                const symbol = `${asset}${quote}`;
                if (processedSymbols.has(symbol)) continue;
                processedSymbols.add(symbol);
                try {
                    const trades = await this.getTrades({
                        symbol,
                        startTime: options.startTime,
                        endTime: options.endTime
                    });
                    allTrades.push(...trades);
                } catch  {
                // Symbol might not exist, skip
                }
            }
        }
        return allTrades.sort((a, b)=>b.timestamp.getTime() - a.timestamp.getTime());
    }
    constructor(credentials){
        this.credentials = credentials;
        this.name = 'Binance';
        this.country = 'MT'; // Malta
        this.logger = new _common.Logger(BinanceClient.name);
        this.baseUrl = 'https://api.binance.com';
    }
};

//# sourceMappingURL=binance.client.js.map