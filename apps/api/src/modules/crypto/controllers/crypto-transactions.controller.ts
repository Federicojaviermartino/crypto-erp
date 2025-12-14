import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JwtAuthGuard, TenantGuard } from '../../../common/guards/index.js';
import { CurrentCompany } from '../../../common/decorators/index.js';
import { CryptoTransactionsService, CostBasisService, TaxReportEntry } from '../services/index.js';
import { CryptoTxType } from '@prisma/client';
import {
  BatchCategorizeDto,
  BatchCategorizeResponseDto,
  BatchJobStatusResponseDto,
} from '../dto/batch-categorize.dto.js';

@ApiTags('Crypto Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('crypto/transactions')
export class CryptoTransactionsController {
  constructor(
    private readonly transactionsService: CryptoTransactionsService,
    private readonly costBasisService: CostBasisService,
    @InjectQueue('ai-categorize') private readonly categorizeQueue: Queue,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all crypto transactions' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of transactions' })
  @ApiQuery({ name: 'type', required: false, description: 'Transaction type filter' })
  @ApiQuery({ name: 'walletId', required: false, description: 'Wallet ID filter' })
  @ApiQuery({ name: 'chain', required: false, description: 'Blockchain filter' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date filter' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date filter' })
  @ApiQuery({ name: 'skip', required: false, description: 'Pagination offset' })
  @ApiQuery({ name: 'take', required: false, description: 'Pagination limit' })
  async findAll(
    @CurrentCompany() companyId: string,
    @Query('type') type?: string,
    @Query('walletId') walletId?: string,
    @Query('chain') chain?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.transactionsService.findAll(companyId, {
      type,
      walletId,
      chain,
      startDate,
      endDate,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get('portfolio')
  @ApiOperation({ summary: 'Get portfolio summary with cost basis' })
  @ApiResponse({ status: 200, description: 'Returns portfolio positions' })
  async getPortfolioSummary(@CurrentCompany() companyId: string) {
    return this.transactionsService.getPortfolioSummary(companyId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get transaction statistics' })
  @ApiResponse({ status: 200, description: 'Returns transaction statistics' })
  async getStats(@CurrentCompany() companyId: string) {
    return this.transactionsService.getTransactionStats(companyId);
  }

  @Get('tax-report')
  @ApiOperation({ summary: 'Generate tax report for realized gains/losses' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Returns tax report' })
  async getTaxReport(
    @CurrentCompany() companyId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<{
    entries: TaxReportEntry[];
    summary: {
      totalProceeds: number;
      totalCostBasis: number;
      totalGainLoss: number;
      shortTermGainLoss: number;
      longTermGainLoss: number;
    };
  }> {
    if (!startDate || !endDate) {
      return {
        entries: [],
        summary: {
          totalProceeds: 0,
          totalCostBasis: 0,
          totalGainLoss: 0,
          shortTermGainLoss: 0,
          longTermGainLoss: 0,
        },
      };
    }
    return this.transactionsService.getTaxReport(companyId, startDate, endDate);
  }

  @Get('lots/:assetId')
  @ApiOperation({ summary: 'Get cost basis lots for an asset' })
  @ApiParam({ name: 'assetId', description: 'Asset ID' })
  @ApiQuery({ name: 'includeExhausted', required: false, description: 'Include exhausted lots' })
  @ApiResponse({ status: 200, description: 'Returns cost basis lots' })
  async getLots(
    @CurrentCompany() companyId: string,
    @Param('assetId') assetId: string,
    @Query('includeExhausted') includeExhausted?: string,
  ) {
    return this.costBasisService.getLotsForAsset(
      companyId,
      assetId,
      includeExhausted === 'true',
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Returns transaction details' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async findById(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    return this.transactionsService.findById(companyId, id);
  }

  @Post('recalculate/:assetId')
  @ApiOperation({ summary: 'Recalculate cost basis for an asset' })
  @ApiParam({ name: 'assetId', description: 'Asset ID' })
  @ApiResponse({ status: 200, description: 'Cost basis recalculated' })
  @HttpCode(HttpStatus.OK)
  async recalculateCostBasis(
    @CurrentCompany() companyId: string,
    @Param('assetId') assetId: string,
  ) {
    await this.costBasisService.recalculateForAsset(companyId, assetId);
    return { success: true, message: 'Cost basis recalculated' };
  }

  @Patch(':id/recategorize')
  @ApiOperation({ summary: 'Recategorize a transaction' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Transaction recategorized' })
  async recategorize(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() body: { type: CryptoTxType; notes?: string },
  ) {
    return this.transactionsService.recategorizeTransaction(companyId, id, body.type, body.notes);
  }

  @Post('batch-categorize')
  @ApiOperation({
    summary: 'Batch categorize transactions with AI',
    description:
      'Queues transactions for AI categorization. Provide either specific transaction IDs, ' +
      'a wallet ID to categorize all uncategorized transactions, or a date range.',
  })
  @ApiResponse({
    status: 201,
    description: 'Batch categorization job created',
    type: BatchCategorizeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request - must provide transactionIds, walletId, or date range',
  })
  @HttpCode(HttpStatus.CREATED)
  async batchCategorize(
    @CurrentCompany() companyId: string,
    @Body() dto: BatchCategorizeDto,
  ): Promise<BatchCategorizeResponseDto> {
    let transactionIds: string[] = [];

    // Option 1: Specific transaction IDs provided
    if (dto.transactionIds && dto.transactionIds.length > 0) {
      transactionIds = dto.transactionIds;
    }
    // Option 2: All uncategorized transactions for a wallet
    else if (dto.walletId) {
      const where: any = {
        walletId: dto.walletId,
        aiCategorized: false,
      };

      if (dto.startDate || dto.endDate) {
        where.blockTimestamp = {};
        if (dto.startDate) where.blockTimestamp.gte = new Date(dto.startDate);
        if (dto.endDate) where.blockTimestamp.lte = new Date(dto.endDate);
      }

      const transactions = await this.transactionsService.findAllForBatch(companyId, where);
      transactionIds = transactions.map((tx: any) => tx.id);
    }
    // Option 3: Date range for all wallets
    else if (dto.startDate || dto.endDate) {
      const where: any = {
        aiCategorized: false,
        blockTimestamp: {},
      };

      if (dto.startDate) where.blockTimestamp.gte = new Date(dto.startDate);
      if (dto.endDate) where.blockTimestamp.lte = new Date(dto.endDate);

      const transactions = await this.transactionsService.findAllForBatch(companyId, where);
      transactionIds = transactions.map((tx: any) => tx.id);
    } else {
      throw new BadRequestException(
        'Must provide either transactionIds, walletId, or date range (startDate/endDate)',
      );
    }

    if (transactionIds.length === 0) {
      throw new BadRequestException('No transactions found matching criteria');
    }

    // Queue the job
    const jobId = `batch-cat-${Date.now()}-${companyId}`;
    await this.categorizeQueue.add(
      'categorize-batch',
      {
        transactionIds,
        companyId,
      },
      {
        jobId,
        priority: 10,
      },
    );

    // Estimate time: ~3 seconds per transaction (AI calls can be slow)
    const estimatedTime = transactionIds.length * 3;

    return {
      jobId,
      transactionCount: transactionIds.length,
      estimatedTime,
    };
  }

  @Get('batch-categorize/:jobId/status')
  @ApiOperation({ summary: 'Get batch categorization job status' })
  @ApiParam({ name: 'jobId', description: 'Job ID returned from batch-categorize' })
  @ApiResponse({
    status: 200,
    description: 'Job status retrieved',
    type: BatchJobStatusResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found',
  })
  async getBatchStatus(
    @Param('jobId') jobId: string,
  ): Promise<BatchJobStatusResponseDto> {
    const job = await this.categorizeQueue.getJob(jobId);

    if (!job) {
      throw new BadRequestException(`Job ${jobId} not found`);
    }

    const state = await job.getState();
    const progress = job.progress as number || 0;

    const response: BatchJobStatusResponseDto = {
      jobId,
      state,
      progress,
    };

    // Include result if completed
    if (state === 'completed') {
      response.result = job.returnvalue;
    }

    // Include error if failed
    if (state === 'failed') {
      response.error = job.failedReason;
    }

    return response;
  }
}
