"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ExchangeFactory", {
    enumerable: true,
    get: function() {
        return ExchangeFactory;
    }
});
const _common = require("@nestjs/common");
const _binanceclient = require("./binance.client.js");
const _krakenclient = require("./kraken.client.js");
const _coinbaseclient = require("./coinbase.client.js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let ExchangeFactory = class ExchangeFactory {
    createClient(exchange, credentials) {
        switch(exchange){
            case 'binance':
                return new _binanceclient.BinanceClient(credentials);
            case 'kraken':
                return new _krakenclient.KrakenClient(credentials);
            case 'coinbase':
                return new _coinbaseclient.CoinbaseClient(credentials);
            case 'bitstamp':
                throw new Error('Bitstamp integration not yet implemented');
            case 'bitfinex':
                throw new Error('Bitfinex integration not yet implemented');
            default:
                throw new Error(`Unknown exchange: ${exchange}`);
        }
    }
    getSupportedExchanges() {
        return [
            'binance',
            'kraken',
            'coinbase'
        ];
    }
};
ExchangeFactory = _ts_decorate([
    (0, _common.Injectable)()
], ExchangeFactory);

//# sourceMappingURL=exchange.factory.js.map