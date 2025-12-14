import { Injectable, Logger } from '@nestjs/common';
import { CryptoTxType } from '@prisma/client';

export interface BitcoinTransaction {
  txid: string;
  hash: string;
  version: number;
  size: number;
  vsize: number;
  weight: number;
  locktime: number;
  vin: BitcoinInput[];
  vout: BitcoinOutput[];
  blockhash?: string;
  confirmations?: number;
  time?: number;
  blocktime?: number;
  fee?: number;
}

export interface BitcoinInput {
  txid: string;
  vout: number;
  scriptSig: {
    asm: string;
    hex: string;
  };
  sequence: number;
  addresses?: string[];
  value?: number;
}

export interface BitcoinOutput {
  value: number;
  n: number;
  scriptPubKey: {
    asm: string;
    hex: string;
    type: string;
    addresses?: string[];
  };
}

export interface ParsedBitcoinTransaction {
  type: CryptoTxType;
  subtype?: string;
  assetIn?: string;
  amountIn?: string;
  assetOut?: string;
  amountOut?: string;
  feeAsset: 'BTC';
  feeAmount?: string;
  confidence: number;
  reasoning: string;
}

/**
 * Bitcoin Transaction Parser
 *
 * Bitcoin uses UTXO (Unspent Transaction Output) model, different from Ethereum's account model.
 * Each transaction consumes previous outputs (inputs) and creates new outputs.
 *
 * Limitations:
 * - No native smart contracts (no DEX swaps on-chain)
 * - No native staking (consensus is PoW)
 * - Transfers only (TRANSFER_IN, TRANSFER_OUT, CONSOLIDATION)
 *
 * Advanced features (Lightning Network, Taproot) are out of scope for MVP.
 */
@Injectable()
export class BitcoinParser {
  private readonly logger = new Logger(BitcoinParser.name);
  private readonly SATOSHIS_PER_BTC = 100_000_000;

  /**
   * Parse Bitcoin transaction into standard format
   */
  parseTransaction(
    tx: BitcoinTransaction,
    walletAddress: string,
  ): ParsedBitcoinTransaction {
    try {
      // Calculate amounts for this wallet
      const inputAmount = this.calculateInputAmount(tx, walletAddress);
      const outputAmount = this.calculateOutputAmount(tx, walletAddress);
      const fee = tx.fee || 0;

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
          reasoning: 'Transaction does not involve this address',
        };
      }
    } catch (error) {
      this.logger.error(`Failed to parse Bitcoin transaction: ${error.message}`);
      return {
        type: 'OTHER',
        feeAsset: 'BTC',
        confidence: 0.1,
        reasoning: `Parse error: ${error.message}`,
      };
    }
  }

  /**
   * Calculate total BTC amount in inputs from this wallet
   */
  private calculateInputAmount(tx: BitcoinTransaction, address: string): number {
    let total = 0;

    for (const input of tx.vin) {
      if (input.addresses && input.addresses.includes(address) && input.value) {
        total += input.value;
      }
    }

    return total;
  }

  /**
   * Calculate total BTC amount in outputs to this wallet
   */
  private calculateOutputAmount(tx: BitcoinTransaction, address: string): number {
    let total = 0;

    for (const output of tx.vout) {
      if (
        output.scriptPubKey.addresses &&
        output.scriptPubKey.addresses.includes(address)
      ) {
        total += output.value;
      }
    }

    return total;
  }

  /**
   * Parse consolidation transaction (wallet sent to itself)
   */
  private parseConsolidation(
    inputAmount: number,
    outputAmount: number,
    fee: number,
  ): ParsedBitcoinTransaction {
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
        reasoning: `UTXO consolidation: ${tx.vin.length} inputs → ${tx.vout.length} outputs`,
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
        reasoning: `Sent BTC with change returned`,
      };
    } else {
      // Should not happen (received more than sent)
      return {
        type: 'TRANSFER_IN',
        assetIn: 'BTC',
        amountIn: this.satoshisToBtc(Math.abs(netChange)),
        feeAsset: 'BTC',
        confidence: 0.7,
        reasoning: 'Unusual transaction: received more than sent',
      };
    }
  }

  /**
   * Parse outgoing transfer
   */
  private parseTransferOut(
    inputAmount: number,
    fee: number,
  ): ParsedBitcoinTransaction {
    return {
      type: 'TRANSFER_OUT',
      assetOut: 'BTC',
      amountOut: this.satoshisToBtc(inputAmount),
      feeAsset: 'BTC',
      feeAmount: this.satoshisToBtc(fee),
      confidence: 1.0,
      reasoning: `Sent ${this.satoshisToBtc(inputAmount)} BTC`,
    };
  }

  /**
   * Parse incoming transfer
   */
  private parseTransferIn(outputAmount: number): ParsedBitcoinTransaction {
    return {
      type: 'TRANSFER_IN',
      assetIn: 'BTC',
      amountIn: this.satoshisToBtc(outputAmount),
      feeAsset: 'BTC',
      confidence: 1.0,
      reasoning: `Received ${this.satoshisToBtc(outputAmount)} BTC`,
    };
  }

  /**
   * Convert satoshis to BTC string
   */
  private satoshisToBtc(satoshis: number): string {
    return (satoshis / this.SATOSHIS_PER_BTC).toFixed(8);
  }

  /**
   * Detect if transaction is SegWit
   */
  isSegWit(tx: BitcoinTransaction): boolean {
    return tx.vsize < tx.size;
  }

  /**
   * Detect if transaction is Taproot (P2TR)
   */
  isTaproot(tx: BitcoinTransaction): boolean {
    return tx.vout.some(
      output => output.scriptPubKey.type === 'witness_v1_taproot',
    );
  }

  /**
   * Calculate effective fee rate (sat/vByte)
   */
  calculateFeeRate(tx: BitcoinTransaction): number {
    if (!tx.fee || !tx.vsize) return 0;
    return Math.round(tx.fee / tx.vsize);
  }
}
