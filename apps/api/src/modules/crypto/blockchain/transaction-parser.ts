import { Injectable, Logger } from '@nestjs/common';
import { CryptoTxType } from '@prisma/client';
import { CovalentTransaction, CovalentLogEvent, ChainName } from './covalent.client';

export interface ParsedTransaction {
  type: CryptoTxType;
  subtype?: string;
  assetIn?: string;
  amountIn?: string;
  assetOut?: string;
  amountOut?: string;
  feeAsset?: string;
  feeAmount?: string;
  confidence: number;
  reasoning: string;
}

// Known DEX router addresses (multi-chain)
const DEX_ROUTERS: Record<string, string> = {
  // Ethereum mainnet
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'uniswap_v2',
  '0xe592427a0aece92de3edee1f18e0157c05861564': 'uniswap_v3',
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': 'uniswap_v3_router2',
  '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f': 'sushiswap',
  '0x1111111254fb6c44bac0bed2854e76f90643097d': '1inch',
  '0xdef1c0ded9bec7f1a1670819833240f027b25eff': '0x_protocol',
  '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': 'uniswap_universal',
  '0x881d40237659c251811cec9c364ef91dc08d300c': 'metamask_swap',

  // BSC
  '0x10ed43c718714eb63d5aa57b78b54704e256024e': 'pancakeswap', // BSC
  '0x13f4ea83d0bd40e75c8222255bc855a974568dd4': 'pancakeswap_v3', // BSC

  // Arbitrum
  '0x1b02da8cb0d097eb8d57a175b88c7d8b47997506': 'sushiswap_arbitrum',
  '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24': 'gmx_arbitrum',
  '0xc873fecbd354f5a56e00e710b90ef4201db2448d': 'camelot_arbitrum',

  // Optimism
  '0x9c12939390052919af3155f41bf4160fd3666a6f': 'velodrome_optimism',
  '0xa062ae8a9c5e11aaa026fc2670b0d65ccc8b2858': 'uniswap_v3_optimism',

  // Base
  '0x327df1e6de05895d2ab08513aadd9313fe505d86': 'aerodrome_base',
  '0x2626664c2603336e57b271c5c0b26f421741e481': 'uniswap_v3_base',

  // Avalanche
  '0x60ae616a2155ee3d9a68541ba4544862310933d4': 'traderjoe_avalanche',
  '0xe54ca86531e17ef3616d22ca28b0d458b6c89106': 'pangolin_avalanche',
  '0xbb4646a764358ee93c2a9c4a147d5aded527ab73': 'sushiswap_avalanche',
};

// Known staking protocol addresses
const STAKING_PROTOCOLS: Record<string, string> = {
  '0xae7ab96520de3a18e5e111b5eaab095312d7fe84': 'lido_steth',
  '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0': 'lido_wsteth',
  '0xdd9bc35ae942ef0cfa76930954a156b3ff30a4e1': 'rocket_pool',
  '0xac3e018457b222d93114458476f3e3416abbe38f': 'frax_staking',
  '0xbe9895146f7af43049ca1c1ae358b0541ea49704': 'coinbase_cbeth',
  '0xa35b1b31ce002fbf2058d22f30f95d405200a15b': 'eigen_layer',
};

// Known bridge addresses
const BRIDGE_PROTOCOLS: Record<string, string> = {
  '0x3ee18b2214aff97000d974cf647e7c347e8fa585': 'wormhole',
  '0x40ec5b33f54e0e8a33a975908c5ba1c14e5bbbdf': 'polygon_bridge',
  '0xa0c68c638235ee32657e8f720a23cec1bfc77c77': 'polygon_plasma',
  '0x99c9fc46f92e8a1c0dec1b1747d010903e884be1': 'optimism_bridge',
  '0x4dbd4fc535ac27206064b68ffcf827b0a60bab3f': 'arbitrum_bridge',
  '0x3154cf16ccdb4c6d922629664174b904d80f2c35': 'base_bridge',
  '0x5427fefa711eff984124bfbb1ab6fbf5e3da1820': 'hop_protocol',
  '0xabea9132b05a70803a4e85094fd0e1800777fbef': 'zkSync_bridge',
};

// Event signatures for different operations
const EVENT_SIGNATURES: Record<string, { type: CryptoTxType; name: string }> = {
  // ERC20 Transfer
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef': { type: 'TRANSFER_IN', name: 'Transfer' },
  // ERC20 Approval
  '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925': { type: 'APPROVE', name: 'Approval' },
  // Uniswap V2 Swap
  '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822': { type: 'SWAP', name: 'Swap' },
  // Uniswap V3 Swap
  '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67': { type: 'SWAP', name: 'Swap' },
  // Mint (LP add)
  '0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f': { type: 'LIQUIDITY_ADD', name: 'Mint' },
  // Burn (LP remove)
  '0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496': { type: 'LIQUIDITY_REMOVE', name: 'Burn' },
  // Staked (generic)
  '0x9e71bc8eea02a63969f509818f2dafb9254532904319f9dbda79b67bd34a5f3d': { type: 'STAKE', name: 'Staked' },
  // Submitted (Lido)
  '0x96a25c8ce0baabc1fdefd93e9ed25d8e092a3332f3aa9a41722b5697231d1d1a': { type: 'STAKE', name: 'Submitted' },
  // Withdrawn
  '0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65': { type: 'UNSTAKE', name: 'Withdrawal' },
  // NFT Transfer (ERC721)
  '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62': { type: 'NFT_TRANSFER', name: 'TransferSingle' },
};

// Known token addresses for native wrapping (EVM chains only)
const WRAPPED_NATIVE: Record<ChainName, string> = {
  'eth-mainnet': '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
  'matic-mainnet': '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270', // WMATIC
  'bsc-mainnet': '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', // WBNB
  'arbitrum-mainnet': '0x82af49447d8a07e3bd95bd0d56f35241523fbab1', // WETH
  'optimism-mainnet': '0x4200000000000000000000000000000000000006', // WETH
  'base-mainnet': '0x4200000000000000000000000000000000000006', // WETH
  'avalanche-mainnet': '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7', // WAVAX
  'solana-mainnet': 'So11111111111111111111111111111111111111112', // Wrapped SOL (SPL token)
  'bitcoin-mainnet': '', // No wrapped BTC on Bitcoin mainnet (no smart contracts)
};

@Injectable()
export class TransactionParser {
  private readonly logger = new Logger(TransactionParser.name);

  parseTransaction(
    tx: CovalentTransaction,
    walletAddress: string,
    chain: ChainName,
  ): ParsedTransaction {
    const walletLower = walletAddress.toLowerCase();
    const fromLower = tx.from_address.toLowerCase();
    const toLower = tx.to_address?.toLowerCase() || '';

    // Check for failed transactions
    if (!tx.successful) {
      return {
        type: 'CONTRACT_INTERACTION',
        confidence: 1,
        reasoning: 'Failed transaction',
        feeAsset: this.getNativeSymbol(chain),
        feeAmount: this.calculateGasFee(tx),
      };
    }

    // Try to detect transaction type from various sources
    const result =
      this.detectFromDexSwap(tx, walletLower, chain) ||
      this.detectFromStaking(tx, walletLower, chain) ||
      this.detectFromBridge(tx, walletLower, chain) ||
      this.detectFromLogs(tx, walletLower, chain) ||
      this.detectFromValue(tx, walletLower, chain);

    // Add gas fee to result
    result.feeAsset = this.getNativeSymbol(chain);
    result.feeAmount = this.calculateGasFee(tx);

    return result;
  }

  private detectFromDexSwap(
    tx: CovalentTransaction,
    walletAddress: string,
    chain: ChainName,
  ): ParsedTransaction | null {
    const toAddress = tx.to_address?.toLowerCase();

    // Check if interacting with known DEX router
    if (toAddress && DEX_ROUTERS[toAddress]) {
      const dexName = DEX_ROUTERS[toAddress];

      // Look for swap events in logs
      const swapDetails = this.extractSwapDetails(tx.log_events, walletAddress, chain);

      if (swapDetails) {
        return {
          type: 'SWAP',
          subtype: dexName,
          assetIn: swapDetails.assetIn,
          amountIn: swapDetails.amountIn,
          assetOut: swapDetails.assetOut,
          amountOut: swapDetails.amountOut,
          confidence: 0.95,
          reasoning: `Swap detected on ${dexName}`,
        };
      }

      // DEX interaction but couldn't parse swap details
      return {
        type: 'SWAP',
        subtype: dexName,
        confidence: 0.7,
        reasoning: `Interaction with ${dexName} router`,
      };
    }

    // Check for DEX details from Covalent
    if (tx.dex_details) {
      const { protocol_name, token_0, token_1 } = tx.dex_details;
      return {
        type: 'SWAP',
        subtype: protocol_name?.toLowerCase().replace(/\s+/g, '_'),
        assetIn: token_0?.contract_ticker_symbol,
        amountIn: token_0?.amount,
        assetOut: token_1?.contract_ticker_symbol,
        amountOut: token_1?.amount,
        confidence: 0.98,
        reasoning: `Swap on ${protocol_name} via Covalent DEX details`,
      };
    }

    return null;
  }

  private detectFromStaking(
    tx: CovalentTransaction,
    walletAddress: string,
    chain: ChainName,
  ): ParsedTransaction | null {
    const toAddress = tx.to_address?.toLowerCase();

    if (toAddress && STAKING_PROTOCOLS[toAddress]) {
      const protocol = STAKING_PROTOCOLS[toAddress];

      // Check for staking/unstaking events
      const hasStakeEvent = tx.log_events.some(e =>
        e.decoded?.name?.toLowerCase().includes('stake') ||
        e.decoded?.name?.toLowerCase().includes('submit') ||
        e.decoded?.name?.toLowerCase().includes('deposit')
      );

      const hasUnstakeEvent = tx.log_events.some(e =>
        e.decoded?.name?.toLowerCase().includes('unstake') ||
        e.decoded?.name?.toLowerCase().includes('withdraw') ||
        e.decoded?.name?.toLowerCase().includes('redeem')
      );

      if (hasUnstakeEvent) {
        return {
          type: 'UNSTAKE',
          subtype: protocol,
          confidence: 0.9,
          reasoning: `Unstaking from ${protocol}`,
        };
      }

      if (hasStakeEvent || BigInt(tx.value) > 0) {
        const nativeSymbol = this.getNativeSymbol(chain);
        return {
          type: 'STAKE',
          subtype: protocol,
          assetIn: nativeSymbol,
          amountIn: this.formatWeiToEther(tx.value),
          confidence: 0.9,
          reasoning: `Staking on ${protocol}`,
        };
      }
    }

    return null;
  }

  private detectFromBridge(
    tx: CovalentTransaction,
    walletAddress: string,
    chain: ChainName,
  ): ParsedTransaction | null {
    const toAddress = tx.to_address?.toLowerCase();

    if (toAddress && BRIDGE_PROTOCOLS[toAddress]) {
      const protocol = BRIDGE_PROTOCOLS[toAddress];

      // Determine if bridging out (sending) or in (receiving)
      const isBridgeOut = tx.from_address.toLowerCase() === walletAddress;

      if (BigInt(tx.value) > 0) {
        const nativeSymbol = this.getNativeSymbol(chain);
        return {
          type: isBridgeOut ? 'BRIDGE_OUT' : 'BRIDGE_IN',
          subtype: protocol,
          assetIn: isBridgeOut ? nativeSymbol : undefined,
          amountIn: isBridgeOut ? this.formatWeiToEther(tx.value) : undefined,
          confidence: 0.85,
          reasoning: `Bridge ${isBridgeOut ? 'out' : 'in'} via ${protocol}`,
        };
      }

      // Token bridge (not native)
      const transfers = this.extractTokenTransfers(tx.log_events, walletAddress);
      if (transfers.length > 0) {
        const transfer = transfers[0];
        return {
          type: isBridgeOut ? 'BRIDGE_OUT' : 'BRIDGE_IN',
          subtype: protocol,
          assetIn: transfer.symbol,
          amountIn: transfer.amount,
          confidence: 0.85,
          reasoning: `Token bridge ${isBridgeOut ? 'out' : 'in'} via ${protocol}`,
        };
      }
    }

    return null;
  }

  private detectFromLogs(
    tx: CovalentTransaction,
    walletAddress: string,
    chain: ChainName,
  ): ParsedTransaction | null {
    // Check for liquidity operations
    const hasLiquidityAdd = tx.log_events.some(e =>
      e.decoded?.name === 'Mint' ||
      e.decoded?.name === 'AddLiquidity' ||
      e.decoded?.name?.toLowerCase().includes('liquidity') && e.decoded?.name?.toLowerCase().includes('add')
    );

    const hasLiquidityRemove = tx.log_events.some(e =>
      e.decoded?.name === 'Burn' ||
      e.decoded?.name === 'RemoveLiquidity' ||
      e.decoded?.name?.toLowerCase().includes('liquidity') && e.decoded?.name?.toLowerCase().includes('remove')
    );

    if (hasLiquidityAdd) {
      return {
        type: 'LIQUIDITY_ADD',
        confidence: 0.85,
        reasoning: 'Liquidity addition detected from logs',
      };
    }

    if (hasLiquidityRemove) {
      return {
        type: 'LIQUIDITY_REMOVE',
        confidence: 0.85,
        reasoning: 'Liquidity removal detected from logs',
      };
    }

    // Check for approval
    const approvalEvent = tx.log_events.find(e => e.decoded?.name === 'Approval');
    if (approvalEvent && tx.log_events.length === 1) {
      return {
        type: 'APPROVE',
        confidence: 0.95,
        reasoning: 'Token approval transaction',
      };
    }

    // Check for rewards claim
    const hasClaimEvent = tx.log_events.some(e =>
      e.decoded?.name?.toLowerCase().includes('claim') ||
      e.decoded?.name?.toLowerCase().includes('reward') ||
      e.decoded?.name === 'Harvested' ||
      e.decoded?.name === 'RewardPaid'
    );

    if (hasClaimEvent) {
      const transfers = this.extractTokenTransfers(tx.log_events, walletAddress);
      const incomingTransfer = transfers.find(t => t.direction === 'IN');

      return {
        type: 'CLAIM_REWARD',
        assetOut: incomingTransfer?.symbol,
        amountOut: incomingTransfer?.amount,
        confidence: 0.85,
        reasoning: 'Reward claim detected from logs',
      };
    }

    // Check for simple token transfers
    const transfers = this.extractTokenTransfers(tx.log_events, walletAddress);
    if (transfers.length === 1) {
      const transfer = transfers[0];
      return {
        type: transfer.direction === 'IN' ? 'TRANSFER_IN' : 'TRANSFER_OUT',
        assetIn: transfer.direction === 'IN' ? transfer.symbol : undefined,
        amountIn: transfer.direction === 'IN' ? transfer.amount : undefined,
        assetOut: transfer.direction === 'OUT' ? transfer.symbol : undefined,
        amountOut: transfer.direction === 'OUT' ? transfer.amount : undefined,
        confidence: 0.9,
        reasoning: `ERC20 transfer ${transfer.direction.toLowerCase()}`,
      };
    }

    return null;
  }

  private detectFromValue(
    tx: CovalentTransaction,
    walletAddress: string,
    chain: ChainName,
  ): ParsedTransaction {
    const nativeSymbol = this.getNativeSymbol(chain);
    const value = BigInt(tx.value);
    const from = tx.from_address.toLowerCase();
    const to = tx.to_address?.toLowerCase();

    // Simple native transfer
    if (value > 0 && tx.log_events.length === 0) {
      const isIncoming = to === walletAddress;
      return {
        type: isIncoming ? 'TRANSFER_IN' : 'TRANSFER_OUT',
        assetIn: isIncoming ? nativeSymbol : undefined,
        amountIn: isIncoming ? this.formatWeiToEther(tx.value) : undefined,
        assetOut: !isIncoming ? nativeSymbol : undefined,
        amountOut: !isIncoming ? this.formatWeiToEther(tx.value) : undefined,
        confidence: 0.95,
        reasoning: `Native ${nativeSymbol} transfer ${isIncoming ? 'in' : 'out'}`,
      };
    }

    // Contract interaction without clear type
    if (tx.log_events.length > 0) {
      return {
        type: 'CONTRACT_INTERACTION',
        confidence: 0.5,
        reasoning: 'Unknown contract interaction - needs manual review',
      };
    }

    // Empty transaction (possible failed or internal)
    return {
      type: 'UNKNOWN',
      confidence: 0.3,
      reasoning: 'Unable to determine transaction type',
    };
  }

  private extractSwapDetails(
    logs: CovalentLogEvent[],
    walletAddress: string,
    chain: ChainName,
  ): { assetIn: string; amountIn: string; assetOut: string; amountOut: string } | null {
    // Look for swap events
    const swapEvent = logs.find(e =>
      e.decoded?.name === 'Swap' ||
      e.decoded?.name === 'TokenExchange' ||
      e.decoded?.name === 'Fill'
    );

    if (swapEvent?.decoded?.params) {
      const params = swapEvent.decoded.params;

      // Try to extract amounts from params
      const amount0In = params.find(p => p.name.toLowerCase().includes('amount0in'))?.value;
      const amount1In = params.find(p => p.name.toLowerCase().includes('amount1in'))?.value;
      const amount0Out = params.find(p => p.name.toLowerCase().includes('amount0out'))?.value;
      const amount1Out = params.find(p => p.name.toLowerCase().includes('amount1out'))?.value;

      // Determine which token was sold and which was bought
      if (amount0In && amount1Out && BigInt(amount0In) > 0 && BigInt(amount1Out) > 0) {
        return {
          assetIn: 'TOKEN0',
          amountIn: amount0In,
          assetOut: 'TOKEN1',
          amountOut: amount1Out,
        };
      }
      if (amount1In && amount0Out && BigInt(amount1In) > 0 && BigInt(amount0Out) > 0) {
        return {
          assetIn: 'TOKEN1',
          amountIn: amount1In,
          assetOut: 'TOKEN0',
          amountOut: amount0Out,
        };
      }
    }

    // Fallback: look for Transfer events (in/out pattern)
    const transfers = this.extractTokenTransfers(logs, walletAddress);
    const incoming = transfers.filter(t => t.direction === 'IN');
    const outgoing = transfers.filter(t => t.direction === 'OUT');

    if (incoming.length === 1 && outgoing.length === 1) {
      return {
        assetIn: outgoing[0].symbol,
        amountIn: outgoing[0].amount,
        assetOut: incoming[0].symbol,
        amountOut: incoming[0].amount,
      };
    }

    return null;
  }

  private extractTokenTransfers(
    logs: CovalentLogEvent[],
    walletAddress: string,
  ): Array<{ symbol: string; amount: string; direction: 'IN' | 'OUT'; from: string; to: string }> {
    const transfers: Array<{ symbol: string; amount: string; direction: 'IN' | 'OUT'; from: string; to: string }> = [];

    for (const log of logs) {
      if (log.decoded?.name === 'Transfer' && log.decoded?.params) {
        const params = log.decoded.params;
        const from = params.find(p => p.name === 'from')?.value?.toLowerCase();
        const to = params.find(p => p.name === 'to')?.value?.toLowerCase();
        const value = params.find(p => p.name === 'value' || p.name === 'amount')?.value;

        if (from && to && value) {
          const direction = to === walletAddress ? 'IN' : from === walletAddress ? 'OUT' : null;
          if (direction) {
            transfers.push({
              symbol: log.sender_name || 'UNKNOWN',
              amount: value,
              direction,
              from,
              to,
            });
          }
        }
      }
    }

    return transfers;
  }

  private calculateGasFee(tx: CovalentTransaction): string {
    const gasUsed = BigInt(tx.gas_spent);
    const gasPrice = BigInt(tx.gas_price);
    const feeWei = gasUsed * gasPrice;
    return this.formatWeiToEther(feeWei.toString());
  }

  private formatWeiToEther(weiValue: string): string {
    const wei = BigInt(weiValue);
    const ether = Number(wei) / 1e18;
    return ether.toFixed(18);
  }

  private getNativeSymbol(chain: ChainName): string {
    const symbols: Record<ChainName, string> = {
      'eth-mainnet': 'ETH',
      'matic-mainnet': 'MATIC',
      'bsc-mainnet': 'BNB',
      'arbitrum-mainnet': 'ETH',
      'optimism-mainnet': 'ETH',
      'base-mainnet': 'ETH',
      'avalanche-mainnet': 'AVAX',
    };
    return symbols[chain] || 'ETH';
  }

  // Batch parse multiple transactions
  parseTransactions(
    transactions: CovalentTransaction[],
    walletAddress: string,
    chain: ChainName,
  ): ParsedTransaction[] {
    return transactions.map(tx => this.parseTransaction(tx, walletAddress, chain));
  }
}
