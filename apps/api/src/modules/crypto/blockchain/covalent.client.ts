import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CovalentBalance {
  contract_address: string;
  contract_name: string;
  contract_ticker_symbol: string;
  contract_decimals: number;
  balance: string;
  quote: number;
  quote_currency: string;
  logo_url?: string;
  type: 'cryptocurrency' | 'nft' | 'dust';
}

export interface CovalentTransaction {
  tx_hash: string;
  block_signed_at: string;
  block_height: number;
  from_address: string;
  to_address: string;
  value: string;
  gas_spent: number;
  gas_price: number;
  gas_quote: number;
  successful: boolean;
  log_events: CovalentLogEvent[];
  dex_details?: CovalentDexDetails;
}

export interface CovalentLogEvent {
  sender_address: string;
  sender_name?: string;
  decoded?: {
    name: string;
    signature: string;
    params: Array<{
      name: string;
      type: string;
      value: string;
      decoded: boolean;
    }>;
  };
}

export interface CovalentDexDetails {
  protocol_name: string;
  protocol_logo_url?: string;
  token_0: {
    contract_address: string;
    contract_ticker_symbol: string;
    contract_decimals: number;
    amount: string;
    quote: number;
  };
  token_1: {
    contract_address: string;
    contract_ticker_symbol: string;
    contract_decimals: number;
    amount: string;
    quote: number;
  };
}

export interface CovalentResponse<T> {
  data: {
    items: T[];
    pagination?: {
      has_more: boolean;
      page_number: number;
      page_size: number;
      total_count?: number;
    };
  };
  error: boolean;
  error_message?: string;
  error_code?: number;
}

export type ChainName =
  | 'eth-mainnet'
  | 'matic-mainnet'
  | 'bsc-mainnet'
  | 'arbitrum-mainnet'
  | 'optimism-mainnet'
  | 'base-mainnet'
  | 'avalanche-mainnet'
  | 'solana-mainnet'
  | 'bitcoin-mainnet';

const CHAIN_MAP: Record<string, ChainName> = {
  ethereum: 'eth-mainnet',
  polygon: 'matic-mainnet',
  bsc: 'bsc-mainnet',
  arbitrum: 'arbitrum-mainnet',
  optimism: 'optimism-mainnet',
  base: 'base-mainnet',
  avalanche: 'avalanche-mainnet',
  solana: 'solana-mainnet',
  bitcoin: 'bitcoin-mainnet',
};

const NATIVE_TOKENS: Record<ChainName, { symbol: string; name: string; decimals: number }> = {
  'eth-mainnet': { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  'matic-mainnet': { symbol: 'MATIC', name: 'Polygon', decimals: 18 },
  'bsc-mainnet': { symbol: 'BNB', name: 'BNB', decimals: 18 },
  'arbitrum-mainnet': { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  'optimism-mainnet': { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  'base-mainnet': { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  'avalanche-mainnet': { symbol: 'AVAX', name: 'Avalanche', decimals: 18 },
  'solana-mainnet': { symbol: 'SOL', name: 'Solana', decimals: 9 },
  'bitcoin-mainnet': { symbol: 'BTC', name: 'Bitcoin', decimals: 8 },
};

@Injectable()
export class CovalentClient {
  private readonly logger = new Logger(CovalentClient.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.covalenthq.com/v1';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('blockchain.covalentApiKey') || '';
    if (!this.apiKey) {
      this.logger.warn('COVALENT_API_KEY not configured - blockchain sync disabled');
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  getChainName(chain: string): ChainName {
    return CHAIN_MAP[chain.toLowerCase()] || 'eth-mainnet';
  }

  getNativeToken(chain: ChainName) {
    return NATIVE_TOKENS[chain];
  }

  private async request<T>(endpoint: string): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Covalent API key not configured');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    this.logger.debug(`Covalent request: ${url}`);

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Covalent API error: ${response.status} - ${error}`);
      throw new Error(`Covalent API error: ${response.status}`);
    }

    const data = await response.json() as { error?: boolean; error_message?: string } & T;

    if (data.error) {
      this.logger.error(`Covalent API error: ${data.error_message}`);
      throw new Error(data.error_message || 'Covalent API error');
    }

    return data as T;
  }

  async getBalances(
    chain: string,
    address: string,
  ): Promise<CovalentBalance[]> {
    const chainName = this.getChainName(chain);
    const endpoint = `/${chainName}/address/${address}/balances_v2/?quote-currency=EUR&no-spam=true`;

    const response = await this.request<CovalentResponse<CovalentBalance>>(endpoint);
    return response.data.items;
  }

  async getTransactions(
    chain: string,
    address: string,
    options: {
      pageSize?: number;
      pageNumber?: number;
      startBlock?: number;
      endBlock?: number;
    } = {},
  ): Promise<{
    transactions: CovalentTransaction[];
    hasMore: boolean;
    pageNumber: number;
  }> {
    const chainName = this.getChainName(chain);
    const params = new URLSearchParams({
      'quote-currency': 'EUR',
      'page-size': String(options.pageSize || 100),
      'page-number': String(options.pageNumber || 0),
      'no-logs': 'false',
    });

    if (options.startBlock) {
      params.set('starting-block', String(options.startBlock));
    }
    if (options.endBlock) {
      params.set('ending-block', String(options.endBlock));
    }

    const endpoint = `/${chainName}/address/${address}/transactions_v3/?${params}`;

    const response = await this.request<CovalentResponse<CovalentTransaction>>(endpoint);

    return {
      transactions: response.data.items,
      hasMore: response.data.pagination?.has_more || false,
      pageNumber: response.data.pagination?.page_number || 0,
    };
  }

  async getERC20Transfers(
    chain: string,
    address: string,
    options: {
      pageSize?: number;
      pageNumber?: number;
      startBlock?: number;
      endBlock?: number;
      contractAddress?: string;
    } = {},
  ): Promise<{
    transfers: Array<{
      tx_hash: string;
      block_signed_at: string;
      block_height: number;
      from_address: string;
      to_address: string;
      contract_address: string;
      contract_ticker_symbol: string;
      contract_decimals: number;
      transfers: Array<{
        from_address: string;
        to_address: string;
        contract_address: string;
        contract_ticker_symbol: string;
        contract_decimals: number;
        delta: string;
        delta_quote: number;
        transfer_type: 'IN' | 'OUT';
      }>;
    }>;
    hasMore: boolean;
  }> {
    const chainName = this.getChainName(chain);
    const params = new URLSearchParams({
      'quote-currency': 'EUR',
      'page-size': String(options.pageSize || 100),
      'page-number': String(options.pageNumber || 0),
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

    const response = await this.request<CovalentResponse<any>>(endpoint);

    return {
      transfers: response.data.items,
      hasMore: response.data.pagination?.has_more || false,
    };
  }

  async getTransaction(chain: string, txHash: string): Promise<CovalentTransaction | null> {
    const chainName = this.getChainName(chain);
    const endpoint = `/${chainName}/transaction_v2/${txHash}/?quote-currency=EUR&no-logs=false`;

    try {
      const response = await this.request<CovalentResponse<CovalentTransaction>>(endpoint);
      return response.data.items[0] || null;
    } catch {
      return null;
    }
  }

  async getBlockHeight(chain: string): Promise<number> {
    const chainName = this.getChainName(chain);
    const endpoint = `/${chainName}/block_v2/latest/`;

    const response = await this.request<{ data: { items: [{ height: number }] } }>(endpoint);
    return response.data.items[0]?.height || 0;
  }
}
