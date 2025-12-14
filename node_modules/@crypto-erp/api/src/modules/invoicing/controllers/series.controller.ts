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
import { SeriesService } from '../services/index.js';
import { CreateSeriesDto } from '../dto/index.js';

@ApiTags('Invoice Series')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('invoice-series')
export class SeriesController {
  constructor(private readonly seriesService: SeriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all invoice series' })
  @ApiResponse({ status: 200, description: 'Returns list of invoice series' })
  async findAll(@CurrentCompany() companyId: string) {
    return this.seriesService.findAll(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice series by ID' })
  @ApiParam({ name: 'id', description: 'Series ID' })
  @ApiResponse({ status: 200, description: 'Returns series details' })
  @ApiResponse({ status: 404, description: 'Series not found' })
  async findById(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    return this.seriesService.findById(companyId, id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get invoice series statistics' })
  @ApiParam({ name: 'id', description: 'Series ID' })
  @ApiResponse({ status: 200, description: 'Returns series statistics' })
  async getStats(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    return this.seriesService.getStats(companyId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new invoice series' })
  @ApiResponse({ status: 201, description: 'Series created successfully' })
  @ApiResponse({ status: 409, description: 'Series with prefix already exists' })
  async create(
    @CurrentCompany() companyId: string,
    @Body() dto: CreateSeriesDto,
  ) {
    return this.seriesService.create(companyId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an invoice series' })
  @ApiParam({ name: 'id', description: 'Series ID' })
  @ApiResponse({ status: 200, description: 'Series updated successfully' })
  @ApiResponse({ status: 404, description: 'Series not found' })
  async update(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateSeriesDto>,
  ) {
    return this.seriesService.update(companyId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an invoice series' })
  @ApiParam({ name: 'id', description: 'Series ID' })
  @ApiResponse({ status: 204, description: 'Series deleted successfully' })
  @ApiResponse({ status: 409, description: 'Cannot delete series with invoices' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    await this.seriesService.delete(companyId, id);
  }
}
