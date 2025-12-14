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

export class CoinbaseClient implements ExchangeClient {
  readonly name = 'Coinbase';
  readonly country = 'US';
  private readonly logger = new Logger(CoinbaseClient.name);
  private readonly baseUrl = 'https://api.coinbase.com';

  constructor(private readonly credentials: ExchangeCredentials) {}

  private getSignature(
    timestamp: string,
    method: string,
    path: string,
    body: string = '',
  ): string {
    const message = timestamp + method + path + body;
    return crypto
      .createHmac('sha256', this.credentials.apiSecret)
      .update(message)
      .digest('hex');
  }

  private async request<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const bodyString = body ? JSON.stringify(body) : '';
    const signature = this.getSignature(timestamp, method, endpoint, bodyString);

    const headers: Record<string, string> = {
      'CB-ACCESS-KEY': this.credentials.apiKey,
      'CB-ACCESS-SIGN': signature,
      'CB-ACCESS-TIMESTAMP': timestamp,
      'CB-VERSION': '2024-01-01',
      'Content-Type': 'application/json',
    };

    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers,
      body: bodyString || undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Coinbase API error: ${response.status} - ${error}`);
      throw new Error(`Coinbase API error: ${response.status}`);
    }

    const data = await response.json() as { data: T; pagination?: { next_uri: string } };
    return data.data;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.request<{ id: string }>('GET', '/v2/user');
      return true;
    } catch {
      return false;
    }
  }

  async getBalances(): Promise<ExchangeBalance[]> {
    interface CoinbaseAccount {
      id: string;
      currency: { code: string };
      balance: { amount: string };
    }

    const accounts = await this.request<CoinbaseAccount[]>('GET', '/v2/accounts?limit=100');

    return accounts
      .filter(a => parseFloat(a.balance.amount) > 0)
      .map(a => ({
        asset: a.currency.code,
        free: a.balance.amount,
        locked: '0',
        total: a.balance.amount,
      }));
  }

  async getTrades(options: {
    symbol?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  } = {}): Promise<ExchangeTrade[]> {
    // Coinbase requires iterating through accounts to get transactions
    interface CoinbaseAccount {
      id: string;
      currency: { code: string };
    }

    interface CoinbaseTrade {
      id: string;
      type: string;
      status: string;
      amount: { amount: string; currency: string };
      native_amount: { amount: string; currency: string };
      created_at: string;
      details: {
        title: string;
        subtitle: string;
        payment_method_name?: string;
      };
    }

    const accounts = await this.request<CoinbaseAccount[]>('GET', '/v2/accounts?limit=100');
    const allTrades: ExchangeTrade[] = [];

    for (const account of accounts) {
      if (options.symbol && account.currency.code !== options.symbol) {
        continue;
      }

      try {
        const transactions = await this.request<CoinbaseTrade[]>(
          'GET',
          `/v2/accounts/${account.id}/transactions?limit=100`,
        );

        const trades = transactions
          .filter(t => t.type === 'buy' || t.type === 'sell')
          .filter(t => {
            const timestamp = new Date(t.created_at);
            if (options.startTime && timestamp < options.startTime) return false;
            if (options.endTime && timestamp > options.endTime) return false;
            return true;
          })
          .map(t => ({
            id: t.id,
            symbol: `${account.currency.code}EUR`,
            orderId: t.id,
            side: t.type.toUpperCase() as 'BUY' | 'SELL',
            price: (
              Math.abs(parseFloat(t.native_amount.amount)) /
              Math.abs(parseFloat(t.amount.amount))
            ).toString(),
            quantity: Math.abs(parseFloat(t.amount.amount)).toString(),
            quoteQuantity: Math.abs(parseFloat(t.native_amount.amount)).toString(),
            commission: '0',
            commissionAsset: t.native_amount.currency,
            timestamp: new Date(t.created_at),
            isMaker: false,
          }));

        allTrades.push(...trades);
      } catch {
        // Account might not have transactions, skip
      }
    }

    return allTrades.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getDeposits(options: {
    asset?: string;
    startTime?: Date;
    endTime?: Date;
  } = {}): Promise<ExchangeDeposit[]> {
    interface CoinbaseAccount {
      id: string;
      currency: { code: string };
    }

    interface CoinbaseTransaction {
      id: string;
      type: string;
      status: string;
      amount: { amount: string; currency: string };
      created_at: string;
      network?: { hash: string };
    }

    const accounts = await this.request<CoinbaseAccount[]>('GET', '/v2/accounts?limit=100');
    const allDeposits: ExchangeDeposit[] = [];

    for (const account of accounts) {
      if (options.asset && account.currency.code !== options.asset) {
        continue;
      }

      try {
        const transactions = await this.request<CoinbaseTransaction[]>(
          'GET',
          `/v2/accounts/${account.id}/transactions?limit=100`,
        );

        const deposits = transactions
          .filter(t => t.type === 'send' && parseFloat(t.amount.amount) > 0)
          .filter(t => {
            const timestamp = new Date(t.created_at);
            if (options.startTime && timestamp < options.startTime) return false;
            if (options.endTime && timestamp > options.endTime) return false;
            return true;
          })
          .map(t => ({
            id: t.id,
            asset: account.currency.code,
            amount: t.amount.amount,
            status: this.mapStatus(t.status),
            txHash: t.network?.hash,
            timestamp: new Date(t.created_at),
          }));

        allDeposits.push(...deposits);
      } catch {
        // Account might not have transactions, skip
      }
    }

    return allDeposits;
  }

  async getWithdrawals(options: {
    asset?: string;
    startTime?: Date;
    endTime?: Date;
  } = {}): Promise<ExchangeWithdrawal[]> {
    interface CoinbaseAccount {
      id: string;
      currency: { code: string };
    }

    interface CoinbaseTransaction {
      id: string;
      type: string;
      status: string;
      amount: { amount: string; currency: string };
      created_at: string;
      network?: { hash: string; transaction_fee?: { amount: string } };
      to?: string;
    }

    const accounts = await this.request<CoinbaseAccount[]>('GET', '/v2/accounts?limit=100');
    const allWithdrawals: ExchangeWithdrawal[] = [];

    for (const account of accounts) {
      if (options.asset && account.currency.code !== options.asset) {
        continue;
      }

      try {
        const transactions = await this.request<CoinbaseTransaction[]>(
          'GET',
          `/v2/accounts/${account.id}/transactions?limit=100`,
        );

        const withdrawals = transactions
          .filter(t => t.type === 'send' && parseFloat(t.amount.amount) < 0)
          .filter(t => {
            const timestamp = new Date(t.created_at);
            if (options.startTime && timestamp < options.startTime) return false;
            if (options.endTime && timestamp > options.endTime) return false;
            return true;
          })
          .map(t => ({
            id: t.id,
            asset: account.currency.code,
            amount: Math.abs(parseFloat(t.amount.amount)).toString(),
            fee: t.network?.transaction_fee?.amount || '0',
            status: this.mapWithdrawalStatus(t.status),
            txHash: t.network?.hash,
            address: t.to || '',
            timestamp: new Date(t.created_at),
          }));

        allWithdrawals.push(...withdrawals);
      } catch {
        // Account might not have transactions, skip
      }
    }

    return allWithdrawals;
  }

  private mapStatus(status: string): ExchangeDeposit['status'] {
    const statusMap: Record<string, ExchangeDeposit['status']> = {
      completed: 'COMPLETED',
      pending: 'PENDING',
      failed: 'FAILED',
    };
    return statusMap[status] || 'PENDING';
  }

  private mapWithdrawalStatus(status: string): ExchangeWithdrawal['status'] {
    const statusMap: Record<string, ExchangeWithdrawal['status']> = {
      completed: 'COMPLETED',
      pending: 'PENDING',
      failed: 'FAILED',
      canceled: 'CANCELLED',
    };
    return statusMap[status] || 'PENDING';
  }
}
