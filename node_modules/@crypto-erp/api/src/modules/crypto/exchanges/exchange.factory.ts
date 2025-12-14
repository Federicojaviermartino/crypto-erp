import { Injectable } from '@nestjs/common';
import {
  ExchangeClient,
  ExchangeCredentials,
  ExchangeName,
} from './exchange.interface.js';
import { BinanceClient } from './binance.client.js';
import { KrakenClient } from './kraken.client.js';
import { CoinbaseClient } from './coinbase.client.js';

@Injectable()
export class ExchangeFactory {
  createClient(
    exchange: ExchangeName,
    credentials: ExchangeCredentials,
  ): ExchangeClient {
    switch (exchange) {
      case 'binance':
        return new BinanceClient(credentials);
      case 'kraken':
        return new KrakenClient(credentials);
      case 'coinbase':
        return new CoinbaseClient(credentials);
      case 'bitstamp':
        throw new Error('Bitstamp integration not yet implemented');
      case 'bitfinex':
        throw new Error('Bitfinex integration not yet implemented');
      default:
        throw new Error(`Unknown exchange: ${exchange}`);
    }
  }

  getSupportedExchanges(): ExchangeName[] {
    return ['binance', 'kraken', 'coinbase'];
  }
}
