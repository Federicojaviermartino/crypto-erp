import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
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
import { FiscalYearsService } from '../services/index.js';
import { CreateFiscalYearDto } from '../dto/index.js';

@ApiTags('Fiscal Years')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('fiscal-years')
export class FiscalYearsController {
  constructor(private readonly fiscalYearsService: FiscalYearsService) {}

  @Get()
  @ApiOperation({ summary: 'List all fiscal years' })
  @ApiResponse({ status: 200, description: 'Returns list of fiscal years' })
  async findAll(@CurrentCompany() companyId: string) {
    return this.fiscalYearsService.findAll(companyId);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current fiscal year' })
  @ApiResponse({ status: 200, description: 'Returns current fiscal year' })
  @ApiResponse({ status: 404, description: 'No active fiscal year found' })
  async findCurrent(@CurrentCompany() companyId: string) {
    const fiscalYear = await this.fiscalYearsService.findCurrent(companyId);
    if (!fiscalYear) {
      return { error: 'No active fiscal year found for current date' };
    }
    return fiscalYear;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get fiscal year by ID' })
  @ApiParam({ name: 'id', description: 'Fiscal year ID' })
  @ApiResponse({ status: 200, description: 'Returns fiscal year details' })
  @ApiResponse({ status: 404, description: 'Fiscal year not found' })
  async findById(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    return this.fiscalYearsService.findById(companyId, id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get fiscal year statistics' })
  @ApiParam({ name: 'id', description: 'Fiscal year ID' })
  @ApiResponse({ status: 200, description: 'Returns fiscal year statistics' })
  async getStats(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    return this.fiscalYearsService.getStats(companyId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new fiscal year' })
  @ApiResponse({ status: 201, description: 'Fiscal year created successfully' })
  @ApiResponse({ status: 409, description: 'Overlapping or duplicate fiscal year' })
  async create(
    @CurrentCompany() companyId: string,
    @Body() dto: CreateFiscalYearDto,
  ) {
    return this.fiscalYearsService.create(companyId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a fiscal year' })
  @ApiParam({ name: 'id', description: 'Fiscal year ID' })
  @ApiResponse({ status: 200, description: 'Fiscal year updated successfully' })
  @ApiResponse({ status: 404, description: 'Fiscal year not found' })
  @ApiResponse({ status: 409, description: 'Cannot modify closed fiscal year' })
  async update(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateFiscalYearDto>,
  ) {
    return this.fiscalYearsService.update(companyId, id, dto);
  }

  @Patch(':id/close')
  @ApiOperation({ summary: 'Close a fiscal year' })
  @ApiParam({ name: 'id', description: 'Fiscal year ID' })
  @ApiResponse({ status: 200, description: 'Fiscal year closed successfully' })
  @ApiResponse({ status: 400, description: 'Draft entries exist' })
  @ApiResponse({ status: 409, description: 'Already closed' })
  @HttpCode(HttpStatus.OK)
  async close(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    return this.fiscalYearsService.close(companyId, id);
  }

  @Patch(':id/reopen')
  @ApiOperation({ summary: 'Reopen a closed fiscal year' })
  @ApiParam({ name: 'id', description: 'Fiscal year ID' })
  @ApiResponse({ status: 200, description: 'Fiscal year reopened successfully' })
  @ApiResponse({ status: 409, description: 'Fiscal year is not closed' })
  @HttpCode(HttpStatus.OK)
  async reopen(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    return this.fiscalYearsService.reopen(companyId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a fiscal year' })
  @ApiParam({ name: 'id', description: 'Fiscal year ID' })
  @ApiResponse({ status: 204, description: 'Fiscal year deleted successfully' })
  @ApiResponse({ status: 404, description: 'Fiscal year not found' })
  @ApiResponse({ status: 409, description: 'Cannot delete fiscal year with entries' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    await this.fiscalYearsService.delete(companyId, id);
  }
}
