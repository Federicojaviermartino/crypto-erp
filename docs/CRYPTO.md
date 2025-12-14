# Cryptocurrency Integration Documentation

## Overview

This document covers the blockchain integration, transaction parsing, and crypto accounting logic.

---

## Supported Blockchains

### Phase 1 (MVP)

| Chain | Chain ID | API Support | DeFi Support |
|-------|----------|-------------|--------------|
| Ethereum | 1 | ✅ Full | ✅ Full |
| Polygon | 137 | ✅ Full | ✅ Full |
| BSC | 56 | ✅ Full | ✅ Full |

### Phase 2

| Chain | Chain ID | API Support | DeFi Support |
|-------|----------|-------------|--------------|
| Arbitrum | 42161 | ✅ Full | ✅ Full |
| Optimism | 10 | ✅ Full | ✅ Full |
| Solana | - | ⚠️ Limited | ⚠️ Limited |
| Bitcoin | - | 📊 Balance only | ❌ N/A |

---

## API Providers

### Primary: Covalent GoldRush

```typescript
// Configuration
const COVALENT_CONFIG = {
  baseUrl: 'https://api.covalenthq.com/v1',
  apiKey: process.env.COVALENT_API_KEY,
  rateLimit: 5, // requests per second (free tier)
};

// Chain name mapping
const CHAIN_NAMES: Record<string, string> = {
  ethereum: 'eth-mainnet',
  polygon: 'matic-mainnet',
  bsc: 'bsc-mainnet',
  arbitrum: 'arbitrum-mainnet',
  optimism: 'optimism-mainnet',
};
```

### Covalent Client Implementation

```typescript
import axios, { AxiosInstance } from 'axios';

interface CovalentTransaction {
  tx_hash: string;
  block_signed_at: string;
  block_height: number;
  from_address: string;
  to_address: string;
  value: string;
  gas_spent: number;
  gas_price: number;
  log_events: LogEvent[];
}

interface TokenBalance {
  contract_address: string;
  contract_name: string;
  contract_ticker_symbol: string;
  contract_decimals: number;
  balance: string;
  quote: number;
  quote_rate: number;
}

class CovalentClient {
  private client: AxiosInstance;
  
  constructor(apiKey: string) {
    this.client = axios.create({
      baseURL: 'https://api.covalenthq.com/v1',
      auth: {
        username: apiKey,
        password: '',
      },
    });
  }
  
  async getTransactions(
    chain: string,
    address: string,
    options?: { startBlock?: number; endBlock?: number }
  ): Promise<CovalentTransaction[]> {
    const chainName = CHAIN_NAMES[chain];
    const response = await this.client.get(
      `/${chainName}/address/${address}/transactions_v3/`
    );
    return response.data.data.items;
  }
  
  async getBalances(chain: string, address: string): Promise<TokenBalance[]> {
    const chainName = CHAIN_NAMES[chain];
    const response = await this.client.get(
      `/${chainName}/address/${address}/balances_v2/`
    );
    return response.data.data.items;
  }
  
  async getTokenTransfers(
    chain: string,
    address: string
  ): Promise<TokenTransfer[]> {
    const chainName = CHAIN_NAMES[chain];
    const response = await this.client.get(
      `/${chainName}/address/${address}/transfers_v2/`
    );
    return response.data.data.items;
  }
}
```

### Secondary: CoinGecko (Prices)

```typescript
const COINGECKO_CONFIG = {
  baseUrl: 'https://api.coingecko.com/api/v3',
  apiKey: process.env.COINGECKO_API_KEY, // Optional for higher limits
  rateLimit: 30, // requests per minute (free tier)
};

class CoinGeckoClient {
  async getPrice(
    coinIds: string[],
    vsCurrencies: string[] = ['eur', 'usd']
  ): Promise<PriceData> {
    const response = await fetch(
      `${COINGECKO_CONFIG.baseUrl}/simple/price?ids=${coinIds.join(',')}&vs_currencies=${vsCurrencies.join(',')}`
    );
    return response.json();
  }
  
  async getHistoricalPrice(
    coinId: string,
    date: Date,
    currency: string = 'eur'
  ): Promise<number> {
    const dateStr = formatDate(date, 'dd-MM-yyyy');
    const response = await fetch(
      `${COINGECKO_CONFIG.baseUrl}/coins/${coinId}/history?date=${dateStr}`
    );
    const data = await response.json();
    return data.market_data.current_price[currency];
  }
}

// Common token to CoinGecko ID mapping
const TOKEN_COINGECKO_IDS: Record<string, string> = {
  ETH: 'ethereum',
  BTC: 'bitcoin',
  MATIC: 'matic-network',
  BNB: 'binancecoin',
  USDT: 'tether',
  USDC: 'usd-coin',
  DAI: 'dai',
  WETH: 'weth',
  WBTC: 'wrapped-bitcoin',
};
```

---

## Transaction Parsing

### Transaction Type Detection

```typescript
enum CryptoTxType {
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  SWAP = 'SWAP',
  STAKE = 'STAKE',
  UNSTAKE = 'UNSTAKE',
  CLAIM_REWARD = 'CLAIM_REWARD',
  AIRDROP = 'AIRDROP',
  LIQUIDITY_ADD = 'LIQUIDITY_ADD',
  LIQUIDITY_REMOVE = 'LIQUIDITY_REMOVE',
  NFT_MINT = 'NFT_MINT',
  NFT_TRANSFER = 'NFT_TRANSFER',
  NFT_SALE = 'NFT_SALE',
  APPROVE = 'APPROVE',
  CONTRACT_INTERACTION = 'CONTRACT_INTERACTION',
  UNKNOWN = 'UNKNOWN',
}

// Known contract addresses for detection
const KNOWN_CONTRACTS = {
  // DEXes
  UNISWAP_V2_ROUTER: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
  UNISWAP_V3_ROUTER: '0xe592427a0aece92de3edee1f18e0157c05861564',
  SUSHISWAP_ROUTER: '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f',
  PANCAKESWAP_ROUTER: '0x10ed43c718714eb63d5aa57b78b54704e256024e',
  
  // Staking
  LIDO_STETH: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
  ROCKET_POOL: '0xae78736cd615f374d3085123a210448e74fc6393',
  
  // Lending
  AAVE_V3_POOL: '0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2',
  COMPOUND_V3: '0xc3d688b66703497daa19211eedff47f25384cdc3',
};

// Method signatures for type detection
const METHOD_SIGNATURES = {
  // ERC20
  TRANSFER: '0xa9059cbb',
  APPROVE: '0x095ea7b3',
  
  // DEX
  SWAP_EXACT_TOKENS: '0x38ed1739',
  SWAP_TOKENS_FOR_EXACT: '0x8803dbee',
  SWAP_EXACT_ETH: '0x7ff36ab5',
  
  // Uniswap V3
  EXACT_INPUT_SINGLE: '0x414bf389',
  EXACT_OUTPUT_SINGLE: '0xdb3e2198',
  
  // Liquidity
  ADD_LIQUIDITY: '0xe8e33700',
  REMOVE_LIQUIDITY: '0xbaa2abde',
  
  // Staking
  DEPOSIT: '0xd0e30db0',
  WITHDRAW: '0x2e1a7d4d',
  CLAIM: '0x4e71d92d',
};

function detectTransactionType(tx: RawTransaction, walletAddress: string): CryptoTxType {
  const methodId = tx.input?.substring(0, 10);
  const toAddress = tx.to_address?.toLowerCase();
  const fromAddress = tx.from_address?.toLowerCase();
  const wallet = walletAddress.toLowerCase();
  
  // Check for approval (no asset movement)
  if (methodId === METHOD_SIGNATURES.APPROVE) {
    return CryptoTxType.APPROVE;
  }
  
  // Check for DEX swaps
  if (isKnownDex(toAddress) && isSwapMethod(methodId)) {
    return CryptoTxType.SWAP;
  }
  
  // Check for staking
  if (isKnownStakingContract(toAddress)) {
    if (methodId === METHOD_SIGNATURES.DEPOSIT) {
      return CryptoTxType.STAKE;
    }
    if (methodId === METHOD_SIGNATURES.WITHDRAW) {
      return CryptoTxType.UNSTAKE;
    }
    if (methodId === METHOD_SIGNATURES.CLAIM) {
      return CryptoTxType.CLAIM_REWARD;
    }
  }
  
  // Check for liquidity operations
  if (isLiquidityMethod(methodId)) {
    return methodId.includes('add') 
      ? CryptoTxType.LIQUIDITY_ADD 
      : CryptoTxType.LIQUIDITY_REMOVE;
  }
  
  // Simple transfer detection
  if (fromAddress === wallet && toAddress !== wallet) {
    return CryptoTxType.TRANSFER_OUT;
  }
  if (toAddress === wallet && fromAddress !== wallet) {
    // Check if it's an airdrop (no corresponding outflow)
    if (isLikelyAirdrop(tx)) {
      return CryptoTxType.AIRDROP;
    }
    return CryptoTxType.TRANSFER_IN;
  }
  
  return CryptoTxType.UNKNOWN;
}
```

### Swap Parsing

```typescript
interface ParsedSwap {
  tokenIn: string;
  amountIn: bigint;
  tokenOut: string;
  amountOut: bigint;
  dex: string;
}

function parseSwapTransaction(tx: RawTransaction): ParsedSwap | null {
  const logs = tx.log_events || [];
  
  // Find Transfer events
  const transfers = logs.filter(log => 
    log.decoded?.name === 'Transfer'
  );
  
  if (transfers.length < 2) {
    return null;
  }
  
  // Identify token in (sent from wallet)
  const tokenInLog = transfers.find(t => 
    t.decoded.params.find(p => p.name === 'from')?.value.toLowerCase() === tx.from_address.toLowerCase()
  );
  
  // Identify token out (received by wallet)
  const tokenOutLog = transfers.find(t => 
    t.decoded.params.find(p => p.name === 'to')?.value.toLowerCase() === tx.from_address.toLowerCase()
  );
  
  if (!tokenInLog || !tokenOutLog) {
    return null;
  }
  
  return {
    tokenIn: tokenInLog.sender_address,
    amountIn: BigInt(tokenInLog.decoded.params.find(p => p.name === 'value')?.value || '0'),
    tokenOut: tokenOutLog.sender_address,
    amountOut: BigInt(tokenOutLog.decoded.params.find(p => p.name === 'value')?.value || '0'),
    dex: identifyDex(tx.to_address),
  };
}
```

---

## FIFO Cost Basis Calculation

### Overview

Spain requires FIFO (First In, First Out) method for calculating crypto gains/losses.

```typescript
interface CryptoLot {
  id: string;
  acquiredAt: Date;
  acquiredAmount: bigint;  // In smallest unit (wei, satoshi)
  costBasisEur: number;    // Total cost in EUR
  costPerUnit: number;     // Cost per unit in EUR
  remainingAmount: bigint; // Amount not yet sold
}

interface SaleResult {
  totalCostBasis: number;
  realizedGain: number;
  lotsUsed: Array<{
    lotId: string;
    amountUsed: bigint;
    costBasis: number;
  }>;
}

class FifoCalculator {
  constructor(private prisma: PrismaClient) {}
  
  async calculateSale(
    companyId: string,
    assetId: string,
    amountToSell: bigint,
    saleValueEur: number
  ): Promise<SaleResult> {
    // Get lots ordered by acquisition date (FIFO)
    const lots = await this.prisma.cryptoLot.findMany({
      where: {
        companyId,
        cryptoAssetId: assetId,
        remainingAmount: { gt: 0 },
      },
      orderBy: { acquiredAt: 'asc' },
    });
    
    let remainingToSell = amountToSell;
    let totalCostBasis = 0;
    const lotsUsed: SaleResult['lotsUsed'] = [];
    
    for (const lot of lots) {
      if (remainingToSell <= 0n) break;
      
      const lotRemaining = BigInt(lot.remainingAmount.toString());
      const amountFromThisLot = lotRemaining < remainingToSell 
        ? lotRemaining 
        : remainingToSell;
      
      // Calculate cost basis for this portion
      const portionCostBasis = (Number(amountFromThisLot) / Number(lot.acquiredAmount)) 
        * lot.costBasisEur;
      
      totalCostBasis += portionCostBasis;
      remainingToSell -= amountFromThisLot;
      
      lotsUsed.push({
        lotId: lot.id,
        amountUsed: amountFromThisLot,
        costBasis: portionCostBasis,
      });
    }
    
    if (remainingToSell > 0n) {
      throw new Error('Insufficient lots for sale - missing acquisition records');
    }
    
    const realizedGain = saleValueEur - totalCostBasis;
    
    return {
      totalCostBasis,
      realizedGain,
      lotsUsed,
    };
  }
  
  async processSale(
    companyId: string,
    assetId: string,
    amountToSell: bigint,
    saleValueEur: number
  ): Promise<SaleResult> {
    const result = await this.calculateSale(companyId, assetId, amountToSell, saleValueEur);
    
    // Update lot remaining amounts
    for (const lotUsed of result.lotsUsed) {
      await this.prisma.cryptoLot.update({
        where: { id: lotUsed.lotId },
        data: {
          remainingAmount: {
            decrement: lotUsed.amountUsed,
          },
        },
      });
    }
    
    return result;
  }
}
```

### Creating Lots from Acquisitions

```typescript
async function createLotFromPurchase(
  companyId: string,
  assetId: string,
  tx: CryptoTransaction
): Promise<CryptoLot> {
  const amount = BigInt(tx.amountIn!);
  const costEur = tx.priceInEur! * Number(amount) / 1e18; // Adjust decimals
  
  return prisma.cryptoLot.create({
    data: {
      companyId,
      cryptoAssetId: assetId,
      acquiredAt: tx.blockTimestamp,
      acquiredAmount: amount,
      costBasisEur: costEur,
      costPerUnit: costEur / (Number(amount) / 1e18),
      remainingAmount: amount,
      sourceTxId: tx.id,
      sourceType: 'purchase',
    },
  });
}

async function createLotFromStakingReward(
  companyId: string,
  assetId: string,
  tx: CryptoTransaction
): Promise<CryptoLot> {
  const amount = BigInt(tx.amountIn!);
  // Staking rewards: cost basis is market value at time of receipt
  const costEur = tx.priceInEur! * Number(amount) / 1e18;
  
  return prisma.cryptoLot.create({
    data: {
      companyId,
      cryptoAssetId: assetId,
      acquiredAt: tx.blockTimestamp,
      acquiredAmount: amount,
      costBasisEur: costEur,
      costPerUnit: costEur / (Number(amount) / 1e18),
      remainingAmount: amount,
      sourceTxId: tx.id,
      sourceType: 'staking_reward',
    },
  });
}

async function createLotFromAirdrop(
  companyId: string,
  assetId: string,
  tx: CryptoTransaction
): Promise<CryptoLot> {
  const amount = BigInt(tx.amountIn!);
  // Airdrops: cost basis is market value at time of receipt (taxable income)
  const costEur = tx.priceInEur! * Number(amount) / 1e18;
  
  return prisma.cryptoLot.create({
    data: {
      companyId,
      cryptoAssetId: assetId,
      acquiredAt: tx.blockTimestamp,
      acquiredAmount: amount,
      costBasisEur: costEur,
      costPerUnit: costEur / (Number(amount) / 1e18),
      remainingAmount: amount,
      sourceTxId: tx.id,
      sourceType: 'airdrop',
    },
  });
}
```

---

## Automatic Journal Entry Generation

### Transaction to Journal Entry Mapping

```typescript
interface JournalEntryTemplate {
  description: string;
  lines: Array<{
    accountCode: string;
    debit?: number;
    credit?: number;
    cryptoAmount?: bigint;
    cryptoAsset?: string;
  }>;
}

function generateJournalEntry(
  tx: CryptoTransaction,
  company: Company
): JournalEntryTemplate {
  switch (tx.type) {
    case CryptoTxType.TRANSFER_IN:
      return generatePurchaseEntry(tx);
    
    case CryptoTxType.TRANSFER_OUT:
      return generateSaleEntry(tx);
    
    case CryptoTxType.SWAP:
      return generateSwapEntry(tx);
    
    case CryptoTxType.CLAIM_REWARD:
    case CryptoTxType.AIRDROP:
      return generateIncomeEntry(tx);
    
    case CryptoTxType.STAKE:
      return generateStakeEntry(tx);
    
    case CryptoTxType.UNSTAKE:
      return generateUnstakeEntry(tx);
    
    default:
      throw new Error(`Unsupported transaction type: ${tx.type}`);
  }
}

function generatePurchaseEntry(tx: CryptoTransaction): JournalEntryTemplate {
  const totalEur = tx.priceInEur! + (tx.feeEur || 0);
  const cryptoAccountCode = `305${tx.assetIn!.padStart(3, '0')}`; // e.g., "305BTC"
  
  return {
    description: `Purchase ${tx.assetIn}: ${formatCrypto(tx.amountIn!)}`,
    lines: [
      {
        accountCode: cryptoAccountCode,  // Crypto inventory
        debit: totalEur,
        cryptoAmount: tx.amountIn!,
        cryptoAsset: tx.assetIn!,
      },
      {
        accountCode: '572',  // Bank
        credit: totalEur,
      },
    ],
  };
}

function generateSaleEntry(tx: CryptoTransaction): JournalEntryTemplate {
  const saleValueEur = tx.priceOutEur!;
  const costBasis = tx.costBasis!;
  const gain = saleValueEur - costBasis - (tx.feeEur || 0);
  const cryptoAccountCode = `305${tx.assetOut!.padStart(3, '0')}`;
  
  const lines = [
    {
      accountCode: '572',  // Bank
      debit: saleValueEur,
    },
    {
      accountCode: cryptoAccountCode,  // Crypto inventory
      credit: costBasis,
      cryptoAmount: tx.amountOut!,
      cryptoAsset: tx.assetOut!,
    },
  ];
  
  // Add gain/loss line
  if (gain > 0) {
    lines.push({
      accountCode: '768',  // Positive exchange differences
      credit: gain,
    });
  } else if (gain < 0) {
    lines.push({
      accountCode: '668',  // Negative exchange differences
      debit: Math.abs(gain),
    });
  }
  
  // Add fee if present
  if (tx.feeEur && tx.feeEur > 0) {
    lines.push({
      accountCode: '662',  // Financial expenses
      debit: tx.feeEur,
    });
  }
  
  return {
    description: `Sale ${tx.assetOut}: ${formatCrypto(tx.amountOut!)} - ${gain >= 0 ? 'Gain' : 'Loss'}: €${Math.abs(gain).toFixed(2)}`,
    lines,
  };
}

function generateSwapEntry(tx: CryptoTransaction): JournalEntryTemplate {
  // A swap is effectively a sale of token A and purchase of token B
  const tokenInAccount = `305${tx.assetIn!.padStart(3, '0')}`;
  const tokenOutAccount = `305${tx.assetOut!.padStart(3, '0')}`;
  
  const saleValueEur = tx.priceInEur!;
  const costBasis = tx.costBasis!;
  const gain = saleValueEur - costBasis;
  
  const lines = [
    // Receive new token (at market value)
    {
      accountCode: tokenOutAccount,
      debit: tx.priceOutEur!,
      cryptoAmount: tx.amountOut!,
      cryptoAsset: tx.assetOut!,
    },
    // Remove old token (at cost basis)
    {
      accountCode: tokenInAccount,
      credit: costBasis,
      cryptoAmount: tx.amountIn!,
      cryptoAsset: tx.assetIn!,
    },
  ];
  
  // Add gain/loss
  if (gain > 0) {
    lines.push({
      accountCode: '768',
      credit: gain,
    });
  } else if (gain < 0) {
    lines.push({
      accountCode: '668',
      debit: Math.abs(gain),
    });
  }
  
  return {
    description: `Swap ${tx.assetIn} → ${tx.assetOut}`,
    lines,
  };
}

function generateIncomeEntry(tx: CryptoTransaction): JournalEntryTemplate {
  const cryptoAccountCode = `305${tx.assetIn!.padStart(3, '0')}`;
  const valueEur = tx.priceInEur!;
  
  const incomeAccount = tx.type === CryptoTxType.CLAIM_REWARD 
    ? '769'   // Other financial income (staking)
    : '778';  // Extraordinary income (airdrop)
  
  return {
    description: `${tx.type === CryptoTxType.CLAIM_REWARD ? 'Staking reward' : 'Airdrop'}: ${tx.assetIn}`,
    lines: [
      {
        accountCode: cryptoAccountCode,
        debit: valueEur,
        cryptoAmount: tx.amountIn!,
        cryptoAsset: tx.assetIn!,
      },
      {
        accountCode: incomeAccount,
        credit: valueEur,
      },
    ],
  };
}
```

---

## Wallet Synchronization

### Sync Worker

```typescript
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('blockchain')
export class BlockchainSyncProcessor {
  constructor(
    private covalent: CovalentClient,
    private txParser: TransactionParser,
    private prisma: PrismaClient,
  ) {}
  
  @Process('sync-wallet')
  async syncWallet(job: Job<{ walletId: string }>) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: job.data.walletId },
      include: { company: true },
    });
    
    if (!wallet) {
      throw new Error('Wallet not found');
    }
    
    try {
      // Update status
      await this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { syncStatus: 'SYNCING' },
      });
      
      // Get last synced block
      const lastTx = await this.prisma.cryptoTransaction.findFirst({
        where: { walletId: wallet.id },
        orderBy: { blockNumber: 'desc' },
      });
      
      const startBlock = lastTx ? Number(lastTx.blockNumber) + 1 : undefined;
      
      // Fetch transactions
      const rawTxs = await this.covalent.getTransactions(
        wallet.chain,
        wallet.address,
        { startBlock }
      );
      
      // Parse and save transactions
      for (const rawTx of rawTxs) {
        const parsedTx = await this.txParser.parse(rawTx, wallet);
        
        await this.prisma.cryptoTransaction.create({
          data: {
            walletId: wallet.id,
            txHash: parsedTx.txHash,
            blockNumber: parsedTx.blockNumber,
            blockTimestamp: parsedTx.blockTimestamp,
            chain: wallet.chain,
            type: parsedTx.type,
            subtype: parsedTx.subtype,
            assetIn: parsedTx.assetIn,
            amountIn: parsedTx.amountIn,
            assetOut: parsedTx.assetOut,
            amountOut: parsedTx.amountOut,
            feeAsset: parsedTx.feeAsset,
            feeAmount: parsedTx.feeAmount,
            priceInEur: parsedTx.priceInEur,
            priceOutEur: parsedTx.priceOutEur,
            feeEur: parsedTx.feeEur,
            rawData: rawTx,
          },
        });
      }
      
      // Update sync status
      await this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          syncStatus: 'SYNCED',
          lastSyncAt: new Date(),
          syncError: null,
        },
      });
      
      return { processed: rawTxs.length };
      
    } catch (error) {
      await this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          syncStatus: 'ERROR',
          syncError: error.message,
        },
      });
      throw error;
    }
  }
}
```

### Scheduled Sync

```typescript
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class BlockchainScheduler {
  constructor(
    @InjectQueue('blockchain') private blockchainQueue: Queue,
    private prisma: PrismaClient,
  ) {}
  
  // Sync active wallets every 15 minutes
  @Cron('*/15 * * * *')
  async syncActiveWallets() {
    const wallets = await this.prisma.wallet.findMany({
      where: {
        isActive: true,
        syncStatus: { not: 'SYNCING' },
      },
    });
    
    for (const wallet of wallets) {
      await this.blockchainQueue.add('sync-wallet', {
        walletId: wallet.id,
      });
    }
  }
  
  // Update prices every 5 minutes
  @Cron('*/5 * * * *')
  async updatePrices() {
    await this.blockchainQueue.add('update-prices', {});
  }
}
```

---

## Tax Reporting

### Model 721 (Foreign Crypto Declaration)

```typescript
interface Model721Data {
  year: number;
  taxpayerId: string;
  declarations: Array<{
    exchangeName: string;
    exchangeCountry: string;
    accountNumber: string;
    assets: Array<{
      symbol: string;
      balanceJan1: number;    // Balance on Jan 1
      balanceDec31: number;   // Balance on Dec 31
      acquisitionValue: number;
      marketValueDec31: number;
    }>;
  }>;
}

async function generateModel721(
  companyId: string,
  year: number
): Promise<Model721Data> {
  // Get all exchange wallets
  const exchangeWallets = await prisma.wallet.findMany({
    where: {
      companyId,
      type: 'EXCHANGE',
    },
  });
  
  const declarations = [];
  
  for (const wallet of exchangeWallets) {
    // Get balances at year start and end
    const jan1 = new Date(year, 0, 1);
    const dec31 = new Date(year, 11, 31);
    
    const assets = await calculateWalletBalances(wallet.id, jan1, dec31);
    
    // Only report if total value > €50,000
    const totalValue = assets.reduce((sum, a) => sum + a.marketValueDec31, 0);
    
    if (totalValue > 50000) {
      declarations.push({
        exchangeName: wallet.label || 'Unknown Exchange',
        exchangeCountry: getExchangeCountry(wallet.address),
        accountNumber: wallet.address,
        assets,
      });
    }
  }
  
  return {
    year,
    taxpayerId: company.taxId,
    declarations,
  };
}
```
