"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "BitcoinParser", {
    enumerable: true,
    get: function() {
        return BitcoinParser;
    }
});
const _common = require("@nestjs/common");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let BitcoinParser = class BitcoinParser {
    /**
   * Parse Bitcoin transaction into standard format
   */ parseTransaction(tx1, walletAddress) {
        try {
            // Calculate amounts for this wallet
            const inputAmount = this.calculateInputAmount(tx1, walletAddress);
            const outputAmount = this.calculateOutputAmount(tx1, walletAddress);
            const fee = tx1.fee || 0;
            // Determine transaction type
            if (inputAmount > 0 && outputAmount > 0) {
                // Self-transfer or consolidation
                return this.parseConsolidation(inputAmount, outputAmount, fee);
            } else if (inputAmount > 0 && outputAmount === 0) {
                // Sent BTC (all outputs go to other addresses)
                return this.parseTransferOut(inputAmount, fee);
            } else if (inputAmount === 0 && outputAmount > 0) {
                // Received BTC (inputs from other addresses)
                return this.parseTransferIn(outputAmount);
            } else {
                // No involvement with this address
                return {
                    type: 'OTHER',
                    feeAsset: 'BTC',
                    confidence: 0.5,
                    reasoning: 'Transaction does not involve this address'
                };
            }
        } catch (error) {
            this.logger.error(`Failed to parse Bitcoin transaction: ${error.message}`);
            return {
                type: 'OTHER',
                feeAsset: 'BTC',
                confidence: 0.1,
                reasoning: `Parse error: ${error.message}`
            };
        }
    }
    /**
   * Calculate total BTC amount in inputs from this wallet
   */ calculateInputAmount(tx1, address) {
        let total = 0;
        for (const input of tx1.vin){
            if (input.addresses && input.addresses.includes(address) && input.value) {
                total += input.value;
            }
        }
        return total;
    }
    /**
   * Calculate total BTC amount in outputs to this wallet
   */ calculateOutputAmount(tx1, address) {
        let total = 0;
        for (const output of tx1.vout){
            if (output.scriptPubKey.addresses && output.scriptPubKey.addresses.includes(address)) {
                total += output.value;
            }
        }
        return total;
    }
    /**
   * Parse consolidation transaction (wallet sent to itself)
   */ parseConsolidation(inputAmount, outputAmount, fee) {
        const netChange = outputAmount - inputAmount;
        if (Math.abs(netChange) < 0.00001) {
            // Pure consolidation (UTXO optimization)
            return {
                type: 'OTHER',
                subtype: 'consolidation',
                assetIn: 'BTC',
                amountIn: this.satoshisToBtc(outputAmount),
                assetOut: 'BTC',
                amountOut: this.satoshisToBtc(inputAmount),
                feeAsset: 'BTC',
                feeAmount: this.satoshisToBtc(fee),
                confidence: 0.95,
                reasoning: `UTXO consolidation: ${tx.vin.length} inputs → ${tx.vout.length} outputs`
            };
        } else if (netChange > 0) {
            // Partial send with change back
            return {
                type: 'TRANSFER_OUT',
                assetOut: 'BTC',
                amountOut: this.satoshisToBtc(inputAmount - outputAmount),
                feeAsset: 'BTC',
                feeAmount: this.satoshisToBtc(fee),
                confidence: 0.9,
                reasoning: `Sent BTC with change returned`
            };
        } else {
            // Should not happen (received more than sent)
            return {
                type: 'TRANSFER_IN',
                assetIn: 'BTC',
                amountIn: this.satoshisToBtc(Math.abs(netChange)),
                feeAsset: 'BTC',
                confidence: 0.7,
                reasoning: 'Unusual transaction: received more than sent'
            };
        }
    }
    /**
   * Parse outgoing transfer
   */ parseTransferOut(inputAmount, fee) {
        return {
            type: 'TRANSFER_OUT',
            assetOut: 'BTC',
            amountOut: this.satoshisToBtc(inputAmount),
            feeAsset: 'BTC',
            feeAmount: this.satoshisToBtc(fee),
            confidence: 1.0,
            reasoning: `Sent ${this.satoshisToBtc(inputAmount)} BTC`
        };
    }
    /**
   * Parse incoming transfer
   */ parseTransferIn(outputAmount) {
        return {
            type: 'TRANSFER_IN',
            assetIn: 'BTC',
            amountIn: this.satoshisToBtc(outputAmount),
            feeAsset: 'BTC',
            confidence: 1.0,
            reasoning: `Received ${this.satoshisToBtc(outputAmount)} BTC`
        };
    }
    /**
   * Convert satoshis to BTC string
   */ satoshisToBtc(satoshis) {
        return (satoshis / this.SATOSHIS_PER_BTC).toFixed(8);
    }
    /**
   * Detect if transaction is SegWit
   */ isSegWit(tx1) {
        return tx1.vsize < tx1.size;
    }
    /**
   * Detect if transaction is Taproot (P2TR)
   */ isTaproot(tx1) {
        return tx1.vout.some((output)=>output.scriptPubKey.type === 'witness_v1_taproot');
    }
    /**
   * Calculate effective fee rate (sat/vByte)
   */ calculateFeeRate(tx1) {
        if (!tx1.fee || !tx1.vsize) return 0;
        return Math.round(tx1.fee / tx1.vsize);
    }
    constructor(){
        this.logger = new _common.Logger(BitcoinParser.name);
        this.SATOSHIS_PER_BTC = 100_000_000;
    }
};
BitcoinParser = _ts_decorate([
    (0, _common.Injectable)()
], BitcoinParser);

//# sourceMappingURL=bitcoin-parser.js.map