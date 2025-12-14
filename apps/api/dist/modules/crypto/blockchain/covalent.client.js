"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CovalentClient", {
    enumerable: true,
    get: function() {
        return CovalentClient;
    }
});
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
const CHAIN_MAP = {
    ethereum: 'eth-mainnet',
    polygon: 'matic-mainnet',
    bsc: 'bsc-mainnet',
    arbitrum: 'arbitrum-mainnet',
    optimism: 'optimism-mainnet',
    base: 'base-mainnet',
    avalanche: 'avalanche-mainnet',
    solana: 'solana-mainnet',
    bitcoin: 'bitcoin-mainnet'
};
const NATIVE_TOKENS = {
    'eth-mainnet': {
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18
    },
    'matic-mainnet': {
        symbol: 'MATIC',
        name: 'Polygon',
        decimals: 18
    },
    'bsc-mainnet': {
        symbol: 'BNB',
        name: 'BNB',
        decimals: 18
    },
    'arbitrum-mainnet': {
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18
    },
    'optimism-mainnet': {
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18
    },
    'base-mainnet': {
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18
    },
    'avalanche-mainnet': {
        symbol: 'AVAX',
        name: 'Avalanche',
        decimals: 18
    },
    'solana-mainnet': {
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9
    },
    'bitcoin-mainnet': {
        symbol: 'BTC',
        name: 'Bitcoin',
        decimals: 8
    }
};
let CovalentClient = class CovalentClient {
    isConfigured() {
        return !!this.apiKey;
    }
    getChainName(chain) {
        return CHAIN_MAP[chain.toLowerCase()] || 'eth-mainnet';
    }
    getNativeToken(chain) {
        return NATIVE_TOKENS[chain];
    }
    async request(endpoint) {
        if (!this.apiKey) {
            throw new Error('Covalent API key not configured');
        }
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
        };
        this.logger.debug(`Covalent request: ${url}`);
        const response = await fetch(url, {
            headers
        });
        if (!response.ok) {
            const error = await response.text();
            this.logger.error(`Covalent API error: ${response.status} - ${error}`);
            throw new Error(`Covalent API error: ${response.status}`);
        }
        const data = await response.json();
        if (data.error) {
            this.logger.error(`Covalent API error: ${data.error_message}`);
            throw new Error(data.error_message || 'Covalent API error');
        }
        return data;
    }
    async getBalances(chain, address) {
        const chainName = this.getChainName(chain);
        const endpoint = `/${chainName}/address/${address}/balances_v2/?quote-currency=EUR&no-spam=true`;
        const response = await this.request(endpoint);
        return response.data.items;
    }
    async getTransactions(chain, address, options = {}) {
        const chainName = this.getChainName(chain);
        const params = new URLSearchParams({
            'quote-currency': 'EUR',
            'page-size': String(options.pageSize || 100),
            'page-number': String(options.pageNumber || 0),
            'no-logs': 'false'
        });
        if (options.startBlock) {
            params.set('starting-block', String(options.startBlock));
        }
        if (options.endBlock) {
            params.set('ending-block', String(options.endBlock));
        }
        const endpoint = `/${chainName}/address/${address}/transactions_v3/?${params}`;
        const response = await this.request(endpoint);
        return {
            transactions: response.data.items,
            hasMore: response.data.pagination?.has_more || false,
            pageNumber: response.data.pagination?.page_number || 0
        };
    }
    async getERC20Transfers(chain, address, options = {}) {
        const chainName = this.getChainName(chain);
        const params = new URLSearchParams({
            'quote-currency': 'EUR',
            'page-size': String(options.pageSize || 100),
            'page-number': String(options.pageNumber || 0)
        });
        if (options.startBlock) {
            params.set('starting-block', String(options.startBlock));
        }
        if (options.endBlock) {
            params.set('ending-block', String(options.endBlock));
        }
        if (options.contractAddress) {
            params.set('contract-address', options.contractAddress);
        }
        const endpoint = `/${chainName}/address/${address}/transfers_v2/?${params}`;
        const response = await this.request(endpoint);
        return {
            transfers: response.data.items,
            hasMore: response.data.pagination?.has_more || false
        };
    }
    async getTransaction(chain, txHash) {
        const chainName = this.getChainName(chain);
        const endpoint = `/${chainName}/transaction_v2/${txHash}/?quote-currency=EUR&no-logs=false`;
        try {
            const response = await this.request(endpoint);
            return response.data.items[0] || null;
        } catch  {
            return null;
        }
    }
    async getBlockHeight(chain) {
        const chainName = this.getChainName(chain);
        const endpoint = `/${chainName}/block_v2/latest/`;
        const response = await this.request(endpoint);
        return response.data.items[0]?.height || 0;
    }
    constructor(configService){
        this.configService = configService;
        this.logger = new _common.Logger(CovalentClient.name);
        this.baseUrl = 'https://api.covalenthq.com/v1';
        this.apiKey = this.configService.get('blockchain.covalentApiKey') || '';
        if (!this.apiKey) {
            this.logger.warn('COVALENT_API_KEY not configured - blockchain sync disabled');
        }
    }
};
CovalentClient = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService
    ])
], CovalentClient);

//# sourceMappingURL=covalent.client.js.map