"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CoinbaseClient", {
    enumerable: true,
    get: function() {
        return CoinbaseClient;
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
let CoinbaseClient = class CoinbaseClient {
    getSignature(timestamp, method, path, body = '') {
        const message = timestamp + method + path + body;
        return _crypto.createHmac('sha256', this.credentials.apiSecret).update(message).digest('hex');
    }
    async request(method, endpoint, body) {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const bodyString = body ? JSON.stringify(body) : '';
        const signature = this.getSignature(timestamp, method, endpoint, bodyString);
        const headers = {
            'CB-ACCESS-KEY': this.credentials.apiKey,
            'CB-ACCESS-SIGN': signature,
            'CB-ACCESS-TIMESTAMP': timestamp,
            'CB-VERSION': '2024-01-01',
            'Content-Type': 'application/json'
        };
        const url = `${this.baseUrl}${endpoint}`;
        const response = await fetch(url, {
            method,
            headers,
            body: bodyString || undefined
        });
        if (!response.ok) {
            const error = await response.text();
            this.logger.error(`Coinbase API error: ${response.status} - ${error}`);
            throw new Error(`Coinbase API error: ${response.status}`);
        }
        const data = await response.json();
        return data.data;
    }
    async testConnection() {
        try {
            await this.request('GET', '/v2/user');
            return true;
        } catch  {
            return false;
        }
    }
    async getBalances() {
        const accounts = await this.request('GET', '/v2/accounts?limit=100');
        return accounts.filter((a)=>parseFloat(a.balance.amount) > 0).map((a)=>({
                asset: a.currency.code,
                free: a.balance.amount,
                locked: '0',
                total: a.balance.amount
            }));
    }
    async getTrades(options = {}) {
        const accounts = await this.request('GET', '/v2/accounts?limit=100');
        const allTrades = [];
        for (const account of accounts){
            if (options.symbol && account.currency.code !== options.symbol) {
                continue;
            }
            try {
                const transactions = await this.request('GET', `/v2/accounts/${account.id}/transactions?limit=100`);
                const trades = transactions.filter((t)=>t.type === 'buy' || t.type === 'sell').filter((t)=>{
                    const timestamp = new Date(t.created_at);
                    if (options.startTime && timestamp < options.startTime) return false;
                    if (options.endTime && timestamp > options.endTime) return false;
                    return true;
                }).map((t)=>({
                        id: t.id,
                        symbol: `${account.currency.code}EUR`,
                        orderId: t.id,
                        side: t.type.toUpperCase(),
                        price: (Math.abs(parseFloat(t.native_amount.amount)) / Math.abs(parseFloat(t.amount.amount))).toString(),
                        quantity: Math.abs(parseFloat(t.amount.amount)).toString(),
                        quoteQuantity: Math.abs(parseFloat(t.native_amount.amount)).toString(),
                        commission: '0',
                        commissionAsset: t.native_amount.currency,
                        timestamp: new Date(t.created_at),
                        isMaker: false
                    }));
                allTrades.push(...trades);
            } catch  {
            // Account might not have transactions, skip
            }
        }
        return allTrades.sort((a, b)=>b.timestamp.getTime() - a.timestamp.getTime());
    }
    async getDeposits(options = {}) {
        const accounts = await this.request('GET', '/v2/accounts?limit=100');
        const allDeposits = [];
        for (const account of accounts){
            if (options.asset && account.currency.code !== options.asset) {
                continue;
            }
            try {
                const transactions = await this.request('GET', `/v2/accounts/${account.id}/transactions?limit=100`);
                const deposits = transactions.filter((t)=>t.type === 'send' && parseFloat(t.amount.amount) > 0).filter((t)=>{
                    const timestamp = new Date(t.created_at);
                    if (options.startTime && timestamp < options.startTime) return false;
                    if (options.endTime && timestamp > options.endTime) return false;
                    return true;
                }).map((t)=>({
                        id: t.id,
                        asset: account.currency.code,
                        amount: t.amount.amount,
                        status: this.mapStatus(t.status),
                        txHash: t.network?.hash,
                        timestamp: new Date(t.created_at)
                    }));
                allDeposits.push(...deposits);
            } catch  {
            // Account might not have transactions, skip
            }
        }
        return allDeposits;
    }
    async getWithdrawals(options = {}) {
        const accounts = await this.request('GET', '/v2/accounts?limit=100');
        const allWithdrawals = [];
        for (const account of accounts){
            if (options.asset && account.currency.code !== options.asset) {
                continue;
            }
            try {
                const transactions = await this.request('GET', `/v2/accounts/${account.id}/transactions?limit=100`);
                const withdrawals = transactions.filter((t)=>t.type === 'send' && parseFloat(t.amount.amount) < 0).filter((t)=>{
                    const timestamp = new Date(t.created_at);
                    if (options.startTime && timestamp < options.startTime) return false;
                    if (options.endTime && timestamp > options.endTime) return false;
                    return true;
                }).map((t)=>({
                        id: t.id,
                        asset: account.currency.code,
                        amount: Math.abs(parseFloat(t.amount.amount)).toString(),
                        fee: t.network?.transaction_fee?.amount || '0',
                        status: this.mapWithdrawalStatus(t.status),
                        txHash: t.network?.hash,
                        address: t.to || '',
                        timestamp: new Date(t.created_at)
                    }));
                allWithdrawals.push(...withdrawals);
            } catch  {
            // Account might not have transactions, skip
            }
        }
        return allWithdrawals;
    }
    mapStatus(status) {
        const statusMap = {
            completed: 'COMPLETED',
            pending: 'PENDING',
            failed: 'FAILED'
        };
        return statusMap[status] || 'PENDING';
    }
    mapWithdrawalStatus(status) {
        const statusMap = {
            completed: 'COMPLETED',
            pending: 'PENDING',
            failed: 'FAILED',
            canceled: 'CANCELLED'
        };
        return statusMap[status] || 'PENDING';
    }
    constructor(credentials){
        this.credentials = credentials;
        this.name = 'Coinbase';
        this.country = 'US';
        this.logger = new _common.Logger(CoinbaseClient.name);
        this.baseUrl = 'https://api.coinbase.com';
    }
};

//# sourceMappingURL=coinbase.client.js.map