import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@crypto-erp/database';
import { Decimal } from 'decimal.js';

const QUEUE_NAME = 'journal-entry';

interface JournalEntryJobData {
  transactionId: string;
  companyId: string;
  autoPost?: boolean;
}

interface JournalEntryResult {
  success: boolean;
  journalEntryId?: string;
  errors?: string[];
}

interface JournalLineData {
  accountId: string;
  lineNumber: number;
  debit: Decimal;
  credit: Decimal;
  description: string;
}

// Spanish PGC account mapping for crypto operations
const CRYPTO_ACCOUNTS = {
  // Assets
  CRYPTO_WALLET: '5700', // Crypto wallets (sub-account per wallet)
  CRYPTO_INVENTORY: '305', // Crypto inventory (if trading activity)
  LONG_TERM_CRYPTO: '250', // Long-term crypto investments
  BANK: '572', // Bank account

  // Income
  EXCHANGE_GAIN: '768', // Positive exchange differences (crypto gains)
  OTHER_FINANCIAL_INCOME: '769', // Staking, airdrops
  SALES: '700', // Sales income

  // Expenses
  EXCHANGE_LOSS: '668', // Negative exchange differences (crypto losses)
  FEES: '662', // Transaction fees
  PURCHASES: '600', // Purchases
} as const;

@Processor(QUEUE_NAME)
export class JournalEntryProcessor extends WorkerHost {
  private readonly logger = new Logger(JournalEntryProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<JournalEntryJobData>): Promise<JournalEntryResult> {
    const { transactionId, companyId, autoPost = false } = job.data;

    this.logger.log(`Processing journal entry for transaction ${transactionId}`);

    const result: JournalEntryResult = {
      success: false,
      errors: [],
    };

    try {
      // Get transaction with related data
      const transaction = await this.prisma.cryptoTransaction.findUnique({
        where: { id: transactionId },
        include: {
          wallet: true,
        },
      });

      if (!transaction) {
        throw new Error(`Transaction ${transactionId} not found`);
      }

      // Check if journal entry already exists
      const existingEntry = await this.prisma.journalEntry.findFirst({
        where: {
          companyId,
          reference: `CRYPTO-${transaction.txHash.slice(0, 16)}`,
        },
      });

      if (existingEntry) {
        this.logger.warn(`Journal entry already exists for transaction ${transactionId}`);
        result.success = true;
        result.journalEntryId = existingEntry.id;
        return result;
      }

      // Get current fiscal year (using isClosed = false for open years)
      const fiscalYear = await this.prisma.fiscalYear.findFirst({
        where: {
          companyId,
          isClosed: false,
          startDate: { lte: transaction.blockTimestamp },
          endDate: { gte: transaction.blockTimestamp },
        },
      });

      if (!fiscalYear) {
        throw new Error('No open fiscal year found for transaction date');
      }

      // Generate journal entry based on transaction type
      const entryData = await this.generateEntryData(transaction, companyId);

      if (!entryData) {
        this.logger.warn(`No journal entry generated for transaction type: ${transaction.type}`);
        result.success = true;
        return result;
      }

      // Create journal entry with proper line numbers
      const journalEntry = await this.prisma.journalEntry.create({
        data: {
          companyId,
          fiscalYearId: fiscalYear.id,
          number: await this.getNextEntryNumber(companyId, fiscalYear.id),
          date: transaction.blockTimestamp,
          description: entryData.description,
          reference: `CRYPTO-${transaction.txHash.slice(0, 16)}`,
          status: autoPost ? 'POSTED' : 'DRAFT',
          lines: {
            create: entryData.lines.map((line) => ({
              accountId: line.accountId,
              lineNumber: line.lineNumber,
              debit: line.debit,
              credit: line.credit,
              description: line.description,
            })),
          },
        },
      });

      // Link transaction to journal entry (use COMPLETED status)
      await this.prisma.cryptoTransaction.update({
        where: { id: transactionId },
        data: {
          journalEntryId: journalEntry.id,
          status: 'COMPLETED',
        },
      });

      result.success = true;
      result.journalEntryId = journalEntry.id;

      this.logger.log(`Journal entry ${journalEntry.id} created for transaction ${transactionId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors?.push(errorMessage);
      this.logger.error(`Failed to create journal entry: ${errorMessage}`);
      throw error;
    }

    return result;
  }

  /**
   * Generate journal entry data based on transaction type
   */
  private async generateEntryData(
    transaction: {
      type: string;
      assetIn: string | null;
      amountIn: unknown;
      assetOut: string | null;
      amountOut: unknown;
      priceInEur: unknown;
      priceOutEur: unknown;
      feeAsset: string | null;
      feeAmount: unknown;
      feeEur: unknown;
      walletId: string;
      wallet: { label: string | null; companyId: string };
    },
    companyId: string,
  ): Promise<{
    description: string;
    lines: JournalLineData[];
  } | null> {
    const amountIn = new Decimal(String(transaction.amountIn || '0'));
    const amountOut = new Decimal(String(transaction.amountOut || '0'));
    const priceInEur = new Decimal(String(transaction.priceInEur || '0'));
    const priceOutEur = new Decimal(String(transaction.priceOutEur || '0'));
    const feeEur = new Decimal(String(transaction.feeEur || '0'));

    const valueInEur = amountIn.mul(priceInEur);
    const valueOutEur = amountOut.mul(priceOutEur);

    // Get or create wallet account
    const walletAccount = await this.getOrCreateAccount(
      companyId,
      `${CRYPTO_ACCOUNTS.CRYPTO_WALLET}${transaction.walletId.slice(-4)}`,
      `Wallet ${transaction.wallet?.label || transaction.walletId.slice(-8)}`,
    );

    let lineNumber = 1;
    const lines: JournalLineData[] = [];

    switch (transaction.type) {
      case 'TRANSFER_IN':
        // Incoming transfer - crypto enters the wallet
        lines.push({
          accountId: walletAccount.id,
          lineNumber: lineNumber++,
          debit: valueInEur,
          credit: new Decimal(0),
          description: `${transaction.assetIn} @ ${priceInEur.toFixed(4)} EUR`,
        });
        lines.push({
          accountId: await this.getAccountId(companyId, CRYPTO_ACCOUNTS.BANK),
          lineNumber: lineNumber++,
          debit: new Decimal(0),
          credit: valueInEur.plus(feeEur),
          description: 'Salida banco',
        });
        if (feeEur.gt(0)) {
          lines.push({
            accountId: await this.getAccountId(companyId, CRYPTO_ACCOUNTS.FEES),
            lineNumber: lineNumber++,
            debit: feeEur,
            credit: new Decimal(0),
            description: 'Comisión transacción',
          });
        }
        return {
          description: `Entrada ${amountIn.toFixed(8)} ${transaction.assetIn}`,
          lines,
        };

      case 'TRANSFER_OUT':
        // Outgoing transfer - crypto leaves the wallet with potential gain/loss
        const costBasis = await this.calculateFIFOCostBasis(
          companyId,
          transaction.assetOut || '',
          amountOut,
        );
        const gainLoss = valueOutEur.minus(costBasis);
        const isGain = gainLoss.gte(0);

        lines.push({
          accountId: await this.getAccountId(companyId, CRYPTO_ACCOUNTS.BANK),
          lineNumber: lineNumber++,
          debit: valueOutEur.minus(feeEur),
          credit: new Decimal(0),
          description: 'Entrada banco',
        });
        lines.push({
          accountId: walletAccount.id,
          lineNumber: lineNumber++,
          debit: new Decimal(0),
          credit: costBasis,
          description: `Coste adquisición ${transaction.assetOut}`,
        });
        lines.push({
          accountId: await this.getAccountId(
            companyId,
            isGain ? CRYPTO_ACCOUNTS.EXCHANGE_GAIN : CRYPTO_ACCOUNTS.EXCHANGE_LOSS,
          ),
          lineNumber: lineNumber++,
          debit: isGain ? new Decimal(0) : gainLoss.abs(),
          credit: isGain ? gainLoss : new Decimal(0),
          description: isGain ? 'Ganancia patrimonial' : 'Pérdida patrimonial',
        });
        if (feeEur.gt(0)) {
          lines.push({
            accountId: await this.getAccountId(companyId, CRYPTO_ACCOUNTS.FEES),
            lineNumber: lineNumber++,
            debit: feeEur,
            credit: new Decimal(0),
            description: 'Comisión transacción',
          });
        }
        return {
          description: `Salida ${amountOut.toFixed(8)} ${transaction.assetOut}`,
          lines,
        };

      case 'CLAIM_REWARD':
      case 'AIRDROP':
        // Income from staking rewards or airdrops
        lines.push({
          accountId: walletAccount.id,
          lineNumber: lineNumber++,
          debit: valueInEur,
          credit: new Decimal(0),
          description: `${transaction.assetIn} recibido`,
        });
        lines.push({
          accountId: await this.getAccountId(companyId, CRYPTO_ACCOUNTS.OTHER_FINANCIAL_INCOME),
          lineNumber: lineNumber++,
          debit: new Decimal(0),
          credit: valueInEur,
          description: 'Ingreso financiero',
        });
        return {
          description: `${transaction.type === 'CLAIM_REWARD' ? 'Recompensa staking' : 'Airdrop'} ${amountIn.toFixed(8)} ${transaction.assetIn}`,
          lines,
        };

      case 'SWAP':
        // Swaps: credit out asset, debit in asset
        lines.push({
          accountId: walletAccount.id,
          lineNumber: lineNumber++,
          debit: valueInEur,
          credit: new Decimal(0),
          description: `${transaction.assetIn} recibido`,
        });
        lines.push({
          accountId: walletAccount.id,
          lineNumber: lineNumber++,
          debit: new Decimal(0),
          credit: valueOutEur,
          description: `${transaction.assetOut} entregado`,
        });
        // If there's a difference, record gain/loss
        const swapDiff = valueInEur.minus(valueOutEur);
        if (swapDiff.abs().gt(0.01)) {
          lines.push({
            accountId: await this.getAccountId(
              companyId,
              swapDiff.gte(0) ? CRYPTO_ACCOUNTS.EXCHANGE_GAIN : CRYPTO_ACCOUNTS.EXCHANGE_LOSS,
            ),
            lineNumber: lineNumber++,
            debit: swapDiff.lt(0) ? swapDiff.abs() : new Decimal(0),
            credit: swapDiff.gte(0) ? swapDiff : new Decimal(0),
            description: swapDiff.gte(0) ? 'Ganancia swap' : 'Pérdida swap',
          });
        }
        return {
          description: `Swap ${amountOut.toFixed(8)} ${transaction.assetOut} → ${amountIn.toFixed(8)} ${transaction.assetIn}`,
          lines,
        };

      case 'STAKE':
      case 'UNSTAKE':
      case 'LIQUIDITY_ADD':
      case 'LIQUIDITY_REMOVE':
      case 'BRIDGE_IN':
      case 'BRIDGE_OUT':
        // These are typically asset movements without P&L
        // Record the movement but don't generate income/expense
        if (amountIn.gt(0)) {
          lines.push({
            accountId: walletAccount.id,
            lineNumber: lineNumber++,
            debit: valueInEur,
            credit: new Decimal(0),
            description: `${transaction.assetIn} ${transaction.type}`,
          });
        }
        if (amountOut.gt(0)) {
          lines.push({
            accountId: walletAccount.id,
            lineNumber: lineNumber++,
            debit: new Decimal(0),
            credit: valueOutEur,
            description: `${transaction.assetOut} ${transaction.type}`,
          });
        }
        if (lines.length === 0) return null;
        return {
          description: `${transaction.type} ${amountIn.gt(0) ? amountIn.toFixed(8) + ' ' + transaction.assetIn : ''} ${amountOut.gt(0) ? amountOut.toFixed(8) + ' ' + transaction.assetOut : ''}`.trim(),
          lines,
        };

      case 'NFT_MINT':
      case 'NFT_TRANSFER':
      case 'NFT_SALE':
      case 'APPROVE':
      case 'CONTRACT_INTERACTION':
      case 'UNKNOWN':
        // Skip these transaction types for now
        return null;

      default:
        this.logger.warn(`Unknown transaction type: ${transaction.type}`);
        return null;
    }
  }

  /**
   * Get or create a ledger account
   */
  private async getOrCreateAccount(
    companyId: string,
    code: string,
    name: string,
  ): Promise<{ id: string }> {
    let account = await this.prisma.account.findFirst({
      where: { companyId, code },
    });

    if (!account) {
      account = await this.prisma.account.create({
        data: {
          companyId,
          code,
          name,
          type: 'ASSET',
          isActive: true,
        },
      });
    }

    return account;
  }

  /**
   * Get account ID by code
   */
  private async getAccountId(companyId: string, code: string): Promise<string> {
    const account = await this.prisma.account.findFirst({
      where: { companyId, code: { startsWith: code } },
    });

    if (!account) {
      throw new Error(`Account with code ${code} not found for company ${companyId}`);
    }

    return account.id;
  }

  /**
   * Calculate FIFO cost basis for a sale
   * Uses cryptoAsset relation via symbol lookup
   */
  private async calculateFIFOCostBasis(
    companyId: string,
    assetSymbol: string,
    amount: Decimal,
  ): Promise<Decimal> {
    // First find the cryptoAsset
    const cryptoAsset = await this.prisma.cryptoAsset.findFirst({
      where: { companyId, symbol: assetSymbol },
    });

    if (!cryptoAsset) {
      this.logger.warn(`CryptoAsset ${assetSymbol} not found for company ${companyId}`);
      return new Decimal(0);
    }

    // Get acquisition lots ordered by date (FIFO)
    const lots = await this.prisma.cryptoLot.findMany({
      where: {
        companyId,
        cryptoAssetId: cryptoAsset.id,
        remainingAmount: { gt: 0 },
      },
      orderBy: { acquiredAt: 'asc' },
    });

    let remainingToSell = amount;
    let totalCost = new Decimal(0);

    for (const lot of lots) {
      if (remainingToSell.lte(0)) break;

      const lotRemaining = new Decimal(String(lot.remainingAmount));
      const lotCostPerUnit = new Decimal(String(lot.costPerUnit));
      const useFromLot = Decimal.min(remainingToSell, lotRemaining);

      totalCost = totalCost.plus(useFromLot.mul(lotCostPerUnit));
      remainingToSell = remainingToSell.minus(useFromLot);

      // Update lot remaining amount
      await this.prisma.cryptoLot.update({
        where: { id: lot.id },
        data: {
          remainingAmount: lotRemaining.minus(useFromLot),
        },
      });
    }

    return totalCost;
  }

  /**
   * Get next entry number for the fiscal year
   */
  private async getNextEntryNumber(companyId: string, fiscalYearId: string): Promise<number> {
    const lastEntry = await this.prisma.journalEntry.findFirst({
      where: { companyId, fiscalYearId },
      orderBy: { number: 'desc' },
    });

    return (lastEntry?.number || 0) + 1;
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<JournalEntryJobData>) {
    this.logger.debug(`Journal entry job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<JournalEntryJobData> | undefined, error: Error) {
    this.logger.error(`Journal entry job failed: ${error.message}`);
  }
}
