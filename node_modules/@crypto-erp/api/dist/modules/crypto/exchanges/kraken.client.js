"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "KrakenClient", {
    enumerable: true,
    get: function() {
        return KrakenClient;
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
let KrakenClient = class KrakenClient {
    getSignature(path, nonce, postData) {
        const message = nonce + postData;
        const hash = _crypto.createHash('sha256').update(message).digest();
        const secret = Buffer.from(this.credentials.apiSecret, 'base64');
        const hmac = _crypto.createHmac('sha512', secret);
        hmac.update(path);
        hmac.update(hash);
        return hmac.digest('base64');
    }
    async request(endpoint, params = {}, isPrivate = false) {
        const url = `${this.baseUrl}${endpoint}`;
        if (isPrivate) {
            const nonce = Date.now() * 1000;
            params.nonce = nonce;
            const postParams = new URLSearchParams();
            for (const [key, value] of Object.entries(params)){
                postParams.append(key, String(value));
            }
            const postData = postParams.toString();
            const signature = this.getSignature(endpoint, nonce, postData);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'API-Key': this.credentials.apiKey,
                    'API-Sign': signature,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: postData
            });
            const data = await response.json();
            if (data.error && data.error.length > 0) {
                this.logger.error(`Kraken API error: ${data.error.join(', ')}`);
                throw new Error(`Kraken API error: ${data.error.join(', ')}`);
            }
            return data.result;
        } else {
            const queryParams = new URLSearchParams();
            for (const [key, value] of Object.entries(params)){
                queryParams.append(key, String(value));
            }
            const queryString = queryParams.toString();
            const response = await fetch(`${url}?${queryString}`);
            const data = await response.json();
            if (data.error && data.error.length > 0) {
                throw new Error(`Kraken API error: ${data.error.join(', ')}`);
            }
            return data.result;
        }
    }
    async testConnection() {
        try {
            await this.request('/0/private/Balance', {}, true);
            return true;
        } catch  {
            return false;
        }
    }
    async getBalances() {
        const balances = await this.request('/0/private/Balance', {}, true);
        return Object.entries(balances).filter(([_, value])=>parseFloat(value) > 0).map(([asset, value])=>({
                asset: this.normalizeAsset(asset),
                free: value,
                locked: '0',
                total: value
            }));
    }
    async getTrades(options = {}) {
        const params = {};
        if (options.startTime) {
            params.start = Math.floor(options.startTime.getTime() / 1000);
        }
        if (options.endTime) {
            params.end = Math.floor(options.endTime.getTime() / 1000);
        }
        const result = await this.request('/0/private/TradesHistory', params, true);
        return Object.entries(result.trades || {}).map(([id, trade])=>({
                id,
                symbol: trade.pair,
                orderId: trade.ordertxid,
                side: trade.type.toUpperCase(),
                price: trade.price,
                quantity: trade.vol,
                quoteQuantity: trade.cost,
                commission: trade.fee,
                commissionAsset: this.getQuoteAsset(trade.pair),
                timestamp: new Date(trade.time * 1000),
                isMaker: trade.ordertype === 'limit'
            }));
    }
    async getDeposits(options = {}) {
        const params = {};
        if (options.asset) {
            params.asset = options.asset;
        }
        const deposits = await this.request('/0/private/DepositStatus', params, true);
        return (deposits || []).map((d)=>({
                id: d.refid,
                asset: this.normalizeAsset(d.asset),
                amount: d.amount,
                status: this.mapDepositStatus(d.status),
                txHash: d.txid,
                timestamp: new Date(d.time * 1000)
            }));
    }
    async getWithdrawals(options = {}) {
        const params = {};
        if (options.asset) {
            params.asset = options.asset;
        }
        const withdrawals = await this.request('/0/private/WithdrawStatus', params, true);
        return (withdrawals || []).map((w)=>({
                id: w.refid,
                asset: this.normalizeAsset(w.asset),
                amount: w.amount,
                fee: w.fee,
                status: this.mapWithdrawalStatus(w.status),
                txHash: w.txid,
                address: w.info,
                timestamp: new Date(w.time * 1000)
            }));
    }
    normalizeAsset(asset) {
        // Kraken uses X/Z prefixes for some assets
        const normalized = asset.replace(/^[XZ]/, '');
        const mapping = {
            'BTC': 'BTC',
            'XBT': 'BTC',
            'ETH': 'ETH',
            'EUR': 'EUR',
            'USD': 'USD'
        };
        return mapping[normalized] || normalized;
    }
    getQuoteAsset(pair) {
        // Simple heuristic for quote asset
        if (pair.endsWith('EUR')) return 'EUR';
        if (pair.endsWith('USD')) return 'USD';
        if (pair.endsWith('USDT')) return 'USDT';
        if (pair.endsWith('BTC') || pair.endsWith('XBT')) return 'BTC';
        return 'EUR';
    }
    mapDepositStatus(status) {
        const statusMap = {
            'Success': 'COMPLETED',
            'Settled': 'COMPLETED',
            'Pending': 'PENDING',
            'Initial': 'PENDING',
            'Failure': 'FAILED'
        };
        return statusMap[status] || 'PENDING';
    }
    mapWithdrawalStatus(status) {
        const statusMap = {
            'Success': 'COMPLETED',
            'Pending': 'PENDING',
            'Initial': 'PENDING',
            'Failure': 'FAILED',
            'Canceled': 'CANCELLED'
        };
        return statusMap[status] || 'PENDING';
    }
    constructor(credentials){
        this.credentials = credentials;
        this.name = 'Kraken';
        this.country = 'US';
        this.logger = new _common.Logger(KrakenClient.name);
        this.baseUrl = 'https://api.kraken.com';
    }
};

//# sourceMappingURL=kraken.client.js.map