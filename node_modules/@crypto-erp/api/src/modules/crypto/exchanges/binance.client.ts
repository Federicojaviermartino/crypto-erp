import { Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  ExchangeClient,
  ExchangeCredentials,
  ExchangeBalance,
  ExchangeTrade,
  ExchangeDeposit,
  ExchangeWithdrawal,
} from './exchange.interface.js';

export class BinanceClient implements ExchangeClient {
  readonly name = 'Binance';
  readonly country = 'MT'; // Malta
  private readonly logger = new Logger(BinanceClient.name);
  private readonly baseUrl = 'https://api.binance.com';

  constructor(private readonly credentials: ExchangeCredentials) {}

  private sign(queryString: string): string {
    return crypto
      .createHmac('sha256', this.credentials.apiSecret)
      .update(queryString)
      .digest('hex');
  }

  private async request<T>(
    endpoint: string,
    params: Record<string, string | number> = {},
    signed = false,
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    if (signed) {
      params.timestamp = Date.now();
      params.recvWindow = 60000;
    }

    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      searchParams.append(key, String(value));
    }
    const queryString = searchParams.toString();

    if (signed) {
      const signature = this.sign(queryString);
      url.search = `${queryString}&signature=${signature}`;
    } else if (queryString) {
      url.search = queryString;
    }

    const headers: Record<string, string> = {
      'X-MBX-APIKEY': this.credentials.apiKey,
    };

    const response = await fetch(url.toString(), { headers });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Binance API error: ${response.status} - ${error}`);
      throw new Error(`Binance API error: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.request('/api/v3/account', {}, true);
      return true;
    } catch {
      return false;
    }
  }

  async getBalances(): Promise<ExchangeBalance[]> {
    interface BinanceAccountResponse {
      balances: Array<{
        asset: string;
        free: string;
        locked: string;
      }>;
    }

    const account = await this.request<BinanceAccountResponse>('/api/v3/account', {}, true);

    return account.balances
      .filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
      .map(b => ({
        asset: b.asset,
        free: b.free,
        locked: b.locked,
        total: (parseFloat(b.free) + parseFloat(b.locked)).toString(),
      }));
  }

  async getTrades(options: {
    symbol?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  } = {}): Promise<ExchangeTrade[]> {
    // If no symbol specified, we need to get all trading pairs first
    if (!options.symbol) {
      // Get all unique trading pairs from recent trades
      // For simplicity, return empty if no symbol - user should specify
      return [];
    }

    interface BinanceTrade {
      id: number;
      symbol: string;
      orderId: number;
      price: string;
      qty: string;
      quoteQty: string;
      commission: string;
      commissionAsset: string;
      time: number;
      isBuyer: boolean;
      isMaker: boolean;
    }

    const params: Record<string, string | number> = {
      symbol: options.symbol,
      limit: options.limit || 1000,
    };

    if (options.startTime) {
      params.startTime = options.startTime.getTime();
    }
    if (options.endTime) {
      params.endTime = options.endTime.getTime();
    }

    const trades = await this.request<BinanceTrade[]>('/api/v3/myTrades', params, true);

    return trades.map(t => ({
      id: t.id.toString(),
      symbol: t.symbol,
      orderId: t.orderId.toString(),
      side: t.isBuyer ? 'BUY' as const : 'SELL' as const,
      price: t.price,
      quantity: t.qty,
      quoteQuantity: t.quoteQty,
      commission: t.commission,
      commissionAsset: t.commissionAsset,
      timestamp: new Date(t.time),
      isMaker: t.isMaker,
    }));
  }

  async getDeposits(options: {
    asset?: string;
    startTime?: Date;
    endTime?: Date;
  } = {}): Promise<ExchangeDeposit[]> {
    interface BinanceDeposit {
      id: string;
      amount: string;
      coin: string;
      network: string;
      status: number;
      txId: string;
      insertTime: number;
    }

    const params: Record<string, string | number> = {};

    if (options.asset) {
      params.coin = options.asset;
    }
    if (options.startTime) {
      params.startTime = options.startTime.getTime();
    }
    if (options.endTime) {
      params.endTime = options.endTime.getTime();
    }

    const deposits = await this.request<BinanceDeposit[]>('/sapi/v1/capital/deposit/hisrec', params, true);

    const statusMap: Record<number, ExchangeDeposit['status']> = {
      0: 'PENDING',
      1: 'COMPLETED',
      6: 'COMPLETED',
    };

    return deposits.map(d => ({
      id: d.id,
      asset: d.coin,
      amount: d.amount,
      status: statusMap[d.status] || 'PENDING',
      txHash: d.txId,
      timestamp: new Date(d.insertTime),
      network: d.network,
    }));
  }

  async getWithdrawals(options: {
    asset?: string;
    startTime?: Date;
    endTime?: Date;
  } = {}): Promise<ExchangeWithdrawal[]> {
    interface BinanceWithdrawal {
      id: string;
      amount: string;
      transactionFee: string;
      coin: string;
      status: number;
      txId: string;
      address: string;
      applyTime: string;
      network: string;
    }

    const params: Record<string, string | number> = {};

    if (options.asset) {
      params.coin = options.asset;
    }
    if (options.startTime) {
      params.startTime = options.startTime.getTime();
    }
    if (options.endTime) {
      params.endTime = options.endTime.getTime();
    }

    const withdrawals = await this.request<BinanceWithdrawal[]>('/sapi/v1/capital/withdraw/history', params, true);

    const statusMap: Record<number, ExchangeWithdrawal['status']> = {
      0: 'PENDING',
      1: 'CANCELLED',
      2: 'PENDING',
      3: 'FAILED',
      4: 'PENDING',
      5: 'FAILED',
      6: 'COMPLETED',
    };

    return withdrawals.map(w => ({
      id: w.id,
      asset: w.coin,
      amount: w.amount,
      fee: w.transactionFee,
      status: statusMap[w.status] || 'PENDING',
      txHash: w.txId,
      address: w.address,
      timestamp: new Date(w.applyTime),
      network: w.network,
    }));
  }

  // Helper to get all symbols user has traded
  async getTradingSymbols(): Promise<string[]> {
    interface BinanceExchangeInfo {
      symbols: Array<{ symbol: string; status: string }>;
    }

    const info = await this.request<BinanceExchangeInfo>('/api/v3/exchangeInfo');
    const activeSymbols = info.symbols
      .filter(s => s.status === 'TRADING')
      .map(s => s.symbol);

    return activeSymbols;
  }

  // Get all trades by iterating through common pairs
  async getAllTrades(options: {
    startTime?: Date;
    endTime?: Date;
  } = {}): Promise<ExchangeTrade[]> {
    const balances = await this.getBalances();
    const assets = balances.map(b => b.asset);

    const commonQuotes = ['USDT', 'EUR', 'BTC', 'ETH', 'BUSD'];
    const allTrades: ExchangeTrade[] = [];
    const processedSymbols = new Set<string>();

    for (const asset of assets) {
      for (const quote of commonQuotes) {
        const symbol = `${asset}${quote}`;
        if (processedSymbols.has(symbol)) continue;
        processedSymbols.add(symbol);

        try {
          const trades = await this.getTrades({
            symbol,
            startTime: options.startTime,
            endTime: options.endTime,
          });
          allTrades.push(...trades);
        } catch {
          // Symbol might not exist, skip
        }
      }
    }

    return allTrades.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
}
