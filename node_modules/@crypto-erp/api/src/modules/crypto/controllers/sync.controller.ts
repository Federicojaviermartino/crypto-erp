import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard, TenantGuard } from '../../../common/guards/index.js';
import { CurrentCompany } from '../../../common/decorators/index.js';
import { BlockchainSyncService, SyncResult } from '../services/blockchain-sync.service.js';
import { CryptoTxType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

class UpdateTransactionTypeDto {
  @IsEnum(CryptoTxType)
  type: CryptoTxType;

  @IsOptional()
  @IsString()
  notes?: string;
}

@ApiTags('Crypto - Blockchain Sync')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('crypto/sync')
export class SyncController {
  constructor(private readonly syncService: BlockchainSyncService) {}

  @Post('wallet/:id')
  @ApiOperation({ summary: 'Sync a wallet with blockchain data' })
  @ApiParam({ name: 'id', description: 'Wallet ID' })
  @ApiResponse({
    status: 200,
    description: 'Wallet sync completed',
  })
  async syncWallet(
    @CurrentCompany() companyId: string,
    @Param('id') walletId: string,
  ): Promise<SyncResult> {
    // TODO: Verify wallet belongs to company
    return this.syncService.syncWallet(walletId);
  }

  @Post('all')
  @ApiOperation({ summary: 'Sync all active wallets' })
  @ApiResponse({
    status: 200,
    description: 'All wallets synced',
  })
  async syncAll(@CurrentCompany() companyId: string): Promise<{ results: SyncResult[] }> {
    const results = await this.syncService.syncAllWallets(companyId);
    return { results };
  }

  @Get('wallet/:id/status')
  @ApiOperation({ summary: 'Check if wallet is currently syncing' })
  @ApiParam({ name: 'id', description: 'Wallet ID' })
  async getSyncStatus(
    @Param('id') walletId: string,
  ): Promise<{ syncing: boolean }> {
    return { syncing: this.syncService.isSyncing(walletId) };
  }

  @Get('transactions/review')
  @ApiOperation({ summary: 'Get transactions needing manual review' })
  @ApiResponse({
    status: 200,
    description: 'List of transactions needing review',
  })
  async getTransactionsNeedingReview(
    @CurrentCompany() companyId: string,
  ): Promise<{ transactions: any[] }> {
    const transactions = await this.syncService.getTransactionsNeedingReview(companyId);
    return { transactions };
  }

  @Patch('transactions/:id/type')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually update transaction type' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({
    status: 200,
    description: 'Transaction type updated',
  })
  async updateTransactionType(
    @CurrentCompany() companyId: string,
    @Param('id') transactionId: string,
    @Body() dto: UpdateTransactionTypeDto,
  ): Promise<{ success: boolean }> {
    await this.syncService.updateTransactionType(
      companyId,
      transactionId,
      dto.type,
      dto.notes,
    );
    return { success: true };
  }
}
