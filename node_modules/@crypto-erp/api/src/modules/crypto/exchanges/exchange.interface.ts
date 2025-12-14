export interface ExchangeBalance {
  asset: string;
  free: string;
  locked: string;
  total: string;
  valueEur?: number;
}

export interface ExchangeTrade {
  id: string;
  symbol: string;
  orderId: string;
  side: 'BUY' | 'SELL';
  price: string;
  quantity: string;
  quoteQuantity: string;
  commission: string;
  commissionAsset: string;
  timestamp: Date;
  isMaker: boolean;
}

export interface ExchangeDeposit {
  id: string;
  asset: string;
  amount: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  txHash?: string;
  timestamp: Date;
  network?: string;
}

export interface ExchangeWithdrawal {
  id: string;
  asset: string;
  amount: string;
  fee: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  txHash?: string;
  address: string;
  timestamp: Date;
  network?: string;
}

export interface ExchangeCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase?: string; // For exchanges like Coinbase Pro
}

export interface ExchangeClient {
  readonly name: string;
  readonly country: string; // ISO country code for Model 721

  // Test connection
  testConnection(): Promise<boolean>;

  // Account
  getBalances(): Promise<ExchangeBalance[]>;

  // Trading history
  getTrades(options?: {
    symbol?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): Promise<ExchangeTrade[]>;

  // Deposits & Withdrawals
  getDeposits(options?: {
    asset?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<ExchangeDeposit[]>;

  getWithdrawals(options?: {
    asset?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<ExchangeWithdrawal[]>;
}

export type ExchangeName = 'binance' | 'coinbase' | 'kraken' | 'bitstamp' | 'bitfinex';

export const EXCHANGE_INFO: Record<ExchangeName, { name: string; country: string; logo: string }> = {
  binance: { name: 'Binance', country: 'MT', logo: 'https://cryptologos.cc/logos/binance-coin-bnb-logo.png' },
  coinbase: { name: 'Coinbase', country: 'US', logo: 'https://cryptologos.cc/logos/coinbase-coin-logo.png' },
  kraken: { name: 'Kraken', country: 'US', logo: 'https://cryptologos.cc/logos/kraken-logo.png' },
  bitstamp: { name: 'Bitstamp', country: 'LU', logo: 'https://cryptologos.cc/logos/bitstamp-logo.png' },
  bitfinex: { name: 'Bitfinex', country: 'VG', logo: 'https://cryptologos.cc/logos/bitfinex-logo.png' },
};
