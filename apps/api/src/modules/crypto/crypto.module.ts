import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '@crypto-erp/database';
import {
  CryptoAssetsService,
  CostBasisService,
  CryptoTransactionsService,
  WalletsService,
  BlockchainSyncService,
} from './services/index.js';
import {
  CryptoAssetsController,
  CryptoTransactionsController,
  WalletsController,
  SyncController,
} from './controllers/index.js';
import { CovalentClient } from './blockchain/covalent.client.js';
import { TransactionParser } from './blockchain/transaction-parser.js';
import { ExchangeFactory } from './exchanges/exchange.factory.js';
import { ExchangeAccountsService } from './exchanges/exchange-accounts.service.js';
import { ExchangeAccountsController } from './exchanges/exchange-accounts.controller.js';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    BullModule.registerQueue({ name: 'ai-categorize' }),
  ],
  controllers: [
    CryptoAssetsController,
    CryptoTransactionsController,
    WalletsController,
    SyncController,
    ExchangeAccountsController,
  ],
  providers: [
    // Blockchain clients
    CovalentClient,
    TransactionParser,
    // Exchange clients
    ExchangeFactory,
    ExchangeAccountsService,
    // Services
    CryptoAssetsService,
    CostBasisService,
    CryptoTransactionsService,
    WalletsService,
    BlockchainSyncService,
  ],
  exports: [
    CovalentClient,
    TransactionParser,
    ExchangeFactory,
    ExchangeAccountsService,
    CryptoAssetsService,
    CostBasisService,
    CryptoTransactionsService,
    WalletsService,
    BlockchainSyncService,
  ],
})
export class CryptoModule {}
