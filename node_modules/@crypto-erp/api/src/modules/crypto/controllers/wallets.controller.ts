import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
import { WalletsService, WalletWithBalances } from '../services/wallets.service.js';
import { CreateWalletDto, UpdateWalletDto } from '../dto/index.js';
import { Wallet } from '@prisma/client';

@ApiTags('Crypto - Wallets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('crypto/wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get()
  @ApiOperation({ summary: 'List all wallets' })
  @ApiResponse({
    status: 200,
    description: 'List of wallets',
  })
  async findAll(@CurrentCompany() companyId: string): Promise<{ wallets: Wallet[] }> {
    const wallets = await this.walletsService.findAll(companyId);
    return { wallets };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get wallet by ID' })
  @ApiParam({ name: 'id', description: 'Wallet ID' })
  @ApiResponse({
    status: 200,
    description: 'Wallet details',
  })
  async findById(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ): Promise<Wallet> {
    return this.walletsService.findById(companyId, id);
  }

  @Get(':id/balances')
  @ApiOperation({ summary: 'Get wallet with current balances from blockchain' })
  @ApiParam({ name: 'id', description: 'Wallet ID' })
  @ApiResponse({
    status: 200,
    description: 'Wallet with current blockchain balances',
  })
  async getWithBalances(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ): Promise<WalletWithBalances> {
    return this.walletsService.getWalletWithBalances(companyId, id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get wallet statistics' })
  @ApiParam({ name: 'id', description: 'Wallet ID' })
  @ApiResponse({
    status: 200,
    description: 'Wallet statistics',
  })
  async getStats(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ): Promise<{
    transactionCount: number;
    lastTransaction: Date | null;
    uniqueAssets: number;
  }> {
    return this.walletsService.getWalletStats(companyId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Add a new wallet' })
  @ApiResponse({
    status: 201,
    description: 'Wallet created successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Wallet already exists',
  })
  async create(
    @CurrentCompany() companyId: string,
    @Body() dto: CreateWalletDto,
  ): Promise<Wallet> {
    return this.walletsService.create(companyId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update wallet' })
  @ApiParam({ name: 'id', description: 'Wallet ID' })
  @ApiResponse({
    status: 200,
    description: 'Wallet updated successfully',
  })
  async update(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWalletDto,
  ): Promise<Wallet> {
    return this.walletsService.update(companyId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete wallet' })
  @ApiParam({ name: 'id', description: 'Wallet ID' })
  @ApiResponse({
    status: 204,
    description: 'Wallet deleted successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Cannot delete wallet with transactions',
  })
  async delete(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.walletsService.delete(companyId, id);
  }
}
