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

export class KrakenClient implements ExchangeClient {
  readonly name = 'Kraken';
  readonly country = 'US';
  private readonly logger = new Logger(KrakenClient.name);
  private readonly baseUrl = 'https://api.kraken.com';

  constructor(private readonly credentials: ExchangeCredentials) {}

  private getSignature(path: string, nonce: number, postData: string): string {
    const message = nonce + postData;
    const hash = crypto.createHash('sha256').update(message).digest();
    const secret = Buffer.from(this.credentials.apiSecret, 'base64');
    const hmac = crypto.createHmac('sha512', secret);
    hmac.update(path);
    hmac.update(hash);
    return hmac.digest('base64');
  }

  private async request<T>(
    endpoint: string,
    params: Record<string, string | number> = {},
    isPrivate = false,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    if (isPrivate) {
      const nonce = Date.now() * 1000;
      params.nonce = nonce;

      const postParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        postParams.append(key, String(value));
      }
      const postData = postParams.toString();

      const signature = this.getSignature(endpoint, nonce, postData);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'API-Key': this.credentials.apiKey,
          'API-Sign': signature,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: postData,
      });

      const data = await response.json() as { error: string[]; result: T };

      if (data.error && data.error.length > 0) {
        this.logger.error(`Kraken API error: ${data.error.join(', ')}`);
        throw new Error(`Kraken API error: ${data.error.join(', ')}`);
      }

      return data.result;
    } else {
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        queryParams.append(key, String(value));
      }
      const queryString = queryParams.toString();

      const response = await fetch(`${url}?${queryString}`);
      const data = await response.json() as { error: string[]; result: T };

      if (data.error && data.error.length > 0) {
        throw new Error(`Kraken API error: ${data.error.join(', ')}`);
      }

      return data.result;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.request('/0/private/Balance', {}, true);
      return true;
    } catch {
      return false;
    }
  }

  async getBalances(): Promise<ExchangeBalance[]> {
    const balances = await this.request<Record<string, string>>('/0/private/Balance', {}, true);

    return Object.entries(balances)
      .filter(([_, value]) => parseFloat(value) > 0)
      .map(([asset, value]) => ({
        asset: this.normalizeAsset(asset),
        free: value,
        locked: '0',
        total: value,
      }));
  }

  async getTrades(options: {
    symbol?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  } = {}): Promise<ExchangeTrade[]> {
    interface KrakenTradesResponse {
      trades: Record<string, {
        ordertxid: string;
        pair: string;
        time: number;
        type: string;
        ordertype: string;
        price: string;
        cost: string;
        fee: string;
        vol: string;
      }>;
    }

    const params: Record<string, string | number> = {};

    if (options.startTime) {
      params.start = Math.floor(options.startTime.getTime() / 1000);
    }
    if (options.endTime) {
      params.end = Math.floor(options.endTime.getTime() / 1000);
    }

    const result = await this.request<KrakenTradesResponse>('/0/private/TradesHistory', params, true);

    return Object.entries(result.trades || {}).map(([id, trade]) => ({
      id,
      symbol: trade.pair,
      orderId: trade.ordertxid,
      side: trade.type.toUpperCase() as 'BUY' | 'SELL',
      price: trade.price,
      quantity: trade.vol,
      quoteQuantity: trade.cost,
      commission: trade.fee,
      commissionAsset: this.getQuoteAsset(trade.pair),
      timestamp: new Date(trade.time * 1000),
      isMaker: trade.ordertype === 'limit',
    }));
  }

  async getDeposits(options: {
    asset?: string;
    startTime?: Date;
    endTime?: Date;
  } = {}): Promise<ExchangeDeposit[]> {
    interface KrakenDeposit {
      method: string;
      aclass: string;
      asset: string;
      refid: string;
      txid: string;
      info: string;
      amount: string;
      fee: string;
      time: number;
      status: string;
    }

    const params: Record<string, string | number> = {};

    if (options.asset) {
      params.asset = options.asset;
    }

    const deposits = await this.request<KrakenDeposit[]>('/0/private/DepositStatus', params, true);

    return (deposits || []).map(d => ({
      id: d.refid,
      asset: this.normalizeAsset(d.asset),
      amount: d.amount,
      status: this.mapDepositStatus(d.status),
      txHash: d.txid,
      timestamp: new Date(d.time * 1000),
    }));
  }

  async getWithdrawals(options: {
    asset?: string;
    startTime?: Date;
    endTime?: Date;
  } = {}): Promise<ExchangeWithdrawal[]> {
    interface KrakenWithdrawal {
      method: string;
      aclass: string;
      asset: string;
      refid: string;
      txid: string;
      info: string;
      amount: string;
      fee: string;
      time: number;
      status: string;
    }

    const params: Record<string, string | number> = {};

    if (options.asset) {
      params.asset = options.asset;
    }

    const withdrawals = await this.request<KrakenWithdrawal[]>('/0/private/WithdrawStatus', params, true);

    return (withdrawals || []).map(w => ({
      id: w.refid,
      asset: this.normalizeAsset(w.asset),
      amount: w.amount,
      fee: w.fee,
      status: this.mapWithdrawalStatus(w.status),
      txHash: w.txid,
      address: w.info,
      timestamp: new Date(w.time * 1000),
    }));
  }

  private normalizeAsset(asset: string): string {
    // Kraken uses X/Z prefixes for some assets
    const normalized = asset.replace(/^[XZ]/, '');
    const mapping: Record<string, string> = {
      'BTC': 'BTC',
      'XBT': 'BTC',
      'ETH': 'ETH',
      'EUR': 'EUR',
      'USD': 'USD',
    };
    return mapping[normalized] || normalized;
  }

  private getQuoteAsset(pair: string): string {
    // Simple heuristic for quote asset
    if (pair.endsWith('EUR')) return 'EUR';
    if (pair.endsWith('USD')) return 'USD';
    if (pair.endsWith('USDT')) return 'USDT';
    if (pair.endsWith('BTC') || pair.endsWith('XBT')) return 'BTC';
    return 'EUR';
  }

  private mapDepositStatus(status: string): ExchangeDeposit['status'] {
    const statusMap: Record<string, ExchangeDeposit['status']> = {
      'Success': 'COMPLETED',
      'Settled': 'COMPLETED',
      'Pending': 'PENDING',
      'Initial': 'PENDING',
      'Failure': 'FAILED',
    };
    return statusMap[status] || 'PENDING';
  }

  private mapWithdrawalStatus(status: string): ExchangeWithdrawal['status'] {
    const statusMap: Record<string, ExchangeWithdrawal['status']> = {
      'Success': 'COMPLETED',
      'Pending': 'PENDING',
      'Initial': 'PENDING',
      'Failure': 'FAILED',
      'Canceled': 'CANCELLED',
    };
    return statusMap[status] || 'PENDING';
  }
}
