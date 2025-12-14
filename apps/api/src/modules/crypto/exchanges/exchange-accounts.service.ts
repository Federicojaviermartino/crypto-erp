import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@crypto-erp/database';
import { ExchangeFactory } from './exchange.factory.js';
import { ExchangeName, EXCHANGE_INFO, ExchangeBalance, ExchangeTrade } from './exchange.interface.js';
import * as crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'crypto-erp-default-key-32bytes!';

@Injectable()
export class ExchangeAccountsService {
  private readonly logger = new Logger(ExchangeAccountsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly exchangeFactory: ExchangeFactory,
  ) {}

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(text: string): string {
    const [ivHex, encrypted] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async findAll(companyId: string) {
    const accounts = await this.prisma.exchangeAccount.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    return accounts.map(account => ({
      ...account,
      apiKey: account.apiKey ? '***' + account.apiKey.slice(-4) : null,
      apiSecret: '********',
    }));
  }

  async findOne(companyId: string, id: string) {
    const account = await this.prisma.exchangeAccount.findFirst({
      where: { id, companyId },
    });

    if (!account) {
      throw new NotFoundException(`Exchange account ${id} not found`);
    }

    return {
      ...account,
      apiKey: account.apiKey ? '***' + account.apiKey.slice(-4) : null,
      apiSecret: '********',
    };
  }

  async create(
    companyId: string,
    data: {
      exchange: string;
      label?: string;
      apiKey: string;
      apiSecret: string;
    },
  ) {
    const exchange = data.exchange as ExchangeName;

    if (!EXCHANGE_INFO[exchange]) {
      throw new BadRequestException(`Unsupported exchange: ${data.exchange}`);
    }

    // Test connection before saving
    const credentials = {
      apiKey: data.apiKey,
      apiSecret: data.apiSecret,
    };

    try {
      const client = this.exchangeFactory.createClient(exchange, credentials);
      const isValid = await client.testConnection();

      if (!isValid) {
        throw new BadRequestException('Invalid API credentials - connection test failed');
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Failed to connect to ${exchange}: ${error.message}`);
    }

    const exchangeInfo = EXCHANGE_INFO[exchange];

    const account = await this.prisma.exchangeAccount.create({
      data: {
        companyId,
        exchange,
        label: data.label || exchangeInfo.name,
        apiKey: this.encrypt(data.apiKey),
        apiSecret: this.encrypt(data.apiSecret),
        country: exchangeInfo.country,
        syncStatus: 'PENDING',
      },
    });

    return {
      ...account,
      apiKey: '***' + data.apiKey.slice(-4),
      apiSecret: '********',
    };
  }

  async update(
    companyId: string,
    id: string,
    data: {
      label?: string;
      apiKey?: string;
      apiSecret?: string;
    },
  ) {
    const existing = await this.prisma.exchangeAccount.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      throw new NotFoundException(`Exchange account ${id} not found`);
    }

    const updateData: Record<string, string> = {};

    if (data.label) {
      updateData.label = data.label;
    }

    if (data.apiKey && data.apiSecret) {
      // Test new credentials
      const credentials = {
        apiKey: data.apiKey,
        apiSecret: data.apiSecret,
      };

      try {
        const client = this.exchangeFactory.createClient(
          existing.exchange as ExchangeName,
          credentials,
        );
        const isValid = await client.testConnection();

        if (!isValid) {
          throw new BadRequestException('Invalid API credentials - connection test failed');
        }
      } catch (error) {
        if (error instanceof BadRequestException) throw error;
        throw new BadRequestException(`Failed to connect: ${error.message}`);
      }

      updateData.apiKey = this.encrypt(data.apiKey);
      updateData.apiSecret = this.encrypt(data.apiSecret);
    }

    const account = await this.prisma.exchangeAccount.update({
      where: { id },
      data: updateData,
    });

    return {
      ...account,
      apiKey: account.apiKey ? '***' + this.decrypt(account.apiKey).slice(-4) : null,
      apiSecret: '********',
    };
  }

  async delete(companyId: string, id: string) {
    const existing = await this.prisma.exchangeAccount.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      throw new NotFoundException(`Exchange account ${id} not found`);
    }

    await this.prisma.exchangeAccount.delete({
      where: { id },
    });

    return { success: true };
  }

  async testConnection(companyId: string, id: string): Promise<boolean> {
    const account = await this.prisma.exchangeAccount.findFirst({
      where: { id, companyId },
    });

    if (!account || !account.apiKey || !account.apiSecret) {
      throw new NotFoundException(`Exchange account ${id} not found or missing credentials`);
    }

    const credentials = {
      apiKey: this.decrypt(account.apiKey),
      apiSecret: this.decrypt(account.apiSecret),
    };

    const client = this.exchangeFactory.createClient(
      account.exchange as ExchangeName,
      credentials,
    );

    return client.testConnection();
  }

  async getBalances(companyId: string, id: string): Promise<ExchangeBalance[]> {
    const account = await this.prisma.exchangeAccount.findFirst({
      where: { id, companyId },
    });

    if (!account || !account.apiKey || !account.apiSecret) {
      throw new NotFoundException(`Exchange account ${id} not found`);
    }

    const credentials = {
      apiKey: this.decrypt(account.apiKey),
      apiSecret: this.decrypt(account.apiSecret),
    };

    const client = this.exchangeFactory.createClient(
      account.exchange as ExchangeName,
      credentials,
    );

    return client.getBalances();
  }

  async syncTrades(
    companyId: string,
    id: string,
    options: { startTime?: Date; endTime?: Date } = {},
  ): Promise<{ imported: number }> {
    const account = await this.prisma.exchangeAccount.findFirst({
      where: { id, companyId },
    });

    if (!account || !account.apiKey || !account.apiSecret) {
      throw new NotFoundException(`Exchange account ${id} not found`);
    }

    // Update sync status
    await this.prisma.exchangeAccount.update({
      where: { id },
      data: { syncStatus: 'SYNCING' },
    });

    try {
      const credentials = {
        apiKey: this.decrypt(account.apiKey),
        apiSecret: this.decrypt(account.apiSecret),
      };

      const client = this.exchangeFactory.createClient(
        account.exchange as ExchangeName,
        credentials,
      );

      // Get trades from exchange
      const trades = await client.getTrades({
        startTime: options.startTime,
        endTime: options.endTime,
      });

      let imported = 0;

      // Get or create exchange wallet for this account
      let exchangeWallet = await this.prisma.wallet.findFirst({
        where: {
          companyId,
          label: `Exchange: ${account.label || account.exchange}`,
        },
      });

      if (!exchangeWallet) {
        exchangeWallet = await this.prisma.wallet.create({
          data: {
            companyId,
            label: `Exchange: ${account.label || account.exchange}`,
            chain: 'EXCHANGE',
            address: account.id,
            isActive: true,
          },
        });
      }

      // Import trades as crypto transactions
      for (const trade of trades) {
        const baseAsset = this.extractBaseAsset(trade.symbol);
        const externalId = `${account.exchange}:${trade.id}`;

        // Check if trade already exists
        const existingTx = await this.prisma.cryptoTransaction.findFirst({
          where: {
            walletId: exchangeWallet.id,
            txHash: externalId,
          },
        });

        if (!existingTx) {
          const isBuy = trade.side === 'BUY';
          await this.prisma.cryptoTransaction.create({
            data: {
              walletId: exchangeWallet.id,
              type: isBuy ? 'TRANSFER_IN' : 'TRANSFER_OUT',
              subtype: 'EXCHANGE_TRADE',
              txHash: externalId,
              blockNumber: 0,
              chain: 'EXCHANGE',
              blockTimestamp: trade.timestamp,
              assetIn: isBuy ? baseAsset : undefined,
              amountIn: isBuy ? trade.quantity : undefined,
              assetOut: !isBuy ? baseAsset : undefined,
              amountOut: !isBuy ? trade.quantity : undefined,
            },
          });
          imported++;
        }
      }

      // Update sync status
      await this.prisma.exchangeAccount.update({
        where: { id },
        data: {
          syncStatus: 'SYNCED',
          lastSyncAt: new Date(),
        },
      });

      this.logger.log(`Synced ${imported} trades from ${account.exchange} for company ${companyId}`);

      return { imported };
    } catch (error) {
      await this.prisma.exchangeAccount.update({
        where: { id },
        data: { syncStatus: 'ERROR' },
      });
      throw error;
    }
  }

  async syncDepositsWithdrawals(
    companyId: string,
    id: string,
    options: { startTime?: Date; endTime?: Date } = {},
  ): Promise<{ deposits: number; withdrawals: number }> {
    const account = await this.prisma.exchangeAccount.findFirst({
      where: { id, companyId },
    });

    if (!account || !account.apiKey || !account.apiSecret) {
      throw new NotFoundException(`Exchange account ${id} not found`);
    }

    const credentials = {
      apiKey: this.decrypt(account.apiKey),
      apiSecret: this.decrypt(account.apiSecret),
    };

    const client = this.exchangeFactory.createClient(
      account.exchange as ExchangeName,
      credentials,
    );

    const [deposits, withdrawals] = await Promise.all([
      client.getDeposits(options),
      client.getWithdrawals(options),
    ]);

    // Get or create exchange wallet for this account
    let exchangeWallet = await this.prisma.wallet.findFirst({
      where: {
        companyId,
        label: `Exchange: ${account.label || account.exchange}`,
      },
    });

    if (!exchangeWallet) {
      exchangeWallet = await this.prisma.wallet.create({
        data: {
          companyId,
          label: `Exchange: ${account.label || account.exchange}`,
          chain: 'EXCHANGE',
          address: account.id,
          isActive: true,
        },
      });
    }

    let depositCount = 0;
    let withdrawalCount = 0;

    // Import deposits
    for (const deposit of deposits) {
      if (deposit.status !== 'COMPLETED') continue;

      const externalId = `${account.exchange}:deposit:${deposit.id}`;

      const existingTx = await this.prisma.cryptoTransaction.findFirst({
        where: {
          walletId: exchangeWallet.id,
          txHash: externalId,
        },
      });

      if (!existingTx) {
        await this.prisma.cryptoTransaction.create({
          data: {
            walletId: exchangeWallet.id,
            type: 'TRANSFER_IN',
            subtype: 'DEPOSIT',
            txHash: externalId,
            blockNumber: 0,
            chain: 'EXCHANGE',
            blockTimestamp: deposit.timestamp,
            assetIn: deposit.asset,
            amountIn: deposit.amount,
          },
        });
        depositCount++;
      }
    }

    // Import withdrawals
    for (const withdrawal of withdrawals) {
      if (withdrawal.status !== 'COMPLETED') continue;

      const externalId = `${account.exchange}:withdrawal:${withdrawal.id}`;

      const existingTx = await this.prisma.cryptoTransaction.findFirst({
        where: {
          walletId: exchangeWallet.id,
          txHash: externalId,
        },
      });

      if (!existingTx) {
        await this.prisma.cryptoTransaction.create({
          data: {
            walletId: exchangeWallet.id,
            type: 'TRANSFER_OUT',
            subtype: 'WITHDRAWAL',
            txHash: externalId,
            blockNumber: 0,
            chain: 'EXCHANGE',
            blockTimestamp: withdrawal.timestamp,
            assetOut: withdrawal.asset,
            amountOut: withdrawal.amount,
          },
        });
        withdrawalCount++;
      }
    }

    return { deposits: depositCount, withdrawals: withdrawalCount };
  }

  private extractBaseAsset(symbol: string): string {
    // Common quote currencies
    const quotes = ['EUR', 'USD', 'USDT', 'USDC', 'BTC', 'ETH', 'BUSD'];

    for (const quote of quotes) {
      if (symbol.endsWith(quote)) {
        return symbol.slice(0, -quote.length);
      }
    }

    return symbol;
  }

  getSupportedExchanges() {
    return Object.entries(EXCHANGE_INFO).map(([key, info]) => ({
      id: key,
      ...info,
      supported: this.exchangeFactory.getSupportedExchanges().includes(key as ExchangeName),
    }));
  }
}
