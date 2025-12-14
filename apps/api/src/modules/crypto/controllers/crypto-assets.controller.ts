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
import { CryptoAssetsService } from '../services/index.js';
import { CreateCryptoAssetDto } from '../dto/index.js';

@ApiTags('Crypto Assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('crypto/assets')
export class CryptoAssetsController {
  constructor(private readonly cryptoAssetsService: CryptoAssetsService) {}

  @Get()
  @ApiOperation({ summary: 'List all crypto assets' })
  @ApiResponse({ status: 200, description: 'Returns list of crypto assets' })
  async findAll(@CurrentCompany() companyId: string) {
    return this.cryptoAssetsService.findAll(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get crypto asset by ID' })
  @ApiParam({ name: 'id', description: 'Asset ID' })
  @ApiResponse({ status: 200, description: 'Returns asset details' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async findById(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    return this.cryptoAssetsService.findById(companyId, id);
  }

  @Get('symbol/:symbol')
  @ApiOperation({ summary: 'Get crypto asset by symbol' })
  @ApiParam({ name: 'symbol', description: 'Asset symbol (e.g., BTC, ETH)' })
  @ApiResponse({ status: 200, description: 'Returns asset details' })
  async findBySymbol(
    @CurrentCompany() companyId: string,
    @Param('symbol') symbol: string,
  ) {
    const asset = await this.cryptoAssetsService.findBySymbol(companyId, symbol);
    if (!asset) {
      return { error: 'Asset not found', symbol };
    }
    return asset;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new crypto asset' })
  @ApiResponse({ status: 201, description: 'Asset created successfully' })
  @ApiResponse({ status: 409, description: 'Asset with symbol already exists' })
  async create(
    @CurrentCompany() companyId: string,
    @Body() dto: CreateCryptoAssetDto,
  ) {
    return this.cryptoAssetsService.create(companyId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a crypto asset' })
  @ApiParam({ name: 'id', description: 'Asset ID' })
  @ApiResponse({ status: 200, description: 'Asset updated successfully' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async update(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateCryptoAssetDto>,
  ) {
    return this.cryptoAssetsService.update(companyId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a crypto asset' })
  @ApiParam({ name: 'id', description: 'Asset ID' })
  @ApiResponse({ status: 204, description: 'Asset deleted successfully' })
  @ApiResponse({ status: 409, description: 'Cannot delete asset with transactions' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    await this.cryptoAssetsService.delete(companyId, id);
  }
}
