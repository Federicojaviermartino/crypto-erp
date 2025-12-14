import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard, TenantGuard } from '../../../common/guards/index.js';
import { CurrentCompany } from '../../../common/decorators/index.js';
import { ReportsService } from '../services/index.js';
import { QueryReportsDto } from '../dto/index.js';

@ApiTags('Accounting Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('trial-balance')
  @ApiOperation({ summary: 'Generate trial balance report' })
  @ApiQuery({ name: 'fiscalYearId', required: false, description: 'Filter by fiscal year' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Returns trial balance report' })
  async getTrialBalance(
    @CurrentCompany() companyId: string,
    @Query() query: QueryReportsDto,
  ) {
    return this.reportsService.getTrialBalance(companyId, {
      fiscalYearId: query.fiscalYearId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });
  }

  @Get('balance-sheet')
  @ApiOperation({ summary: 'Generate balance sheet report' })
  @ApiQuery({ name: 'asOfDate', required: false, description: 'As of date (YYYY-MM-DD), defaults to today' })
  @ApiResponse({ status: 200, description: 'Returns balance sheet report' })
  async getBalanceSheet(
    @CurrentCompany() companyId: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    return this.reportsService.getBalanceSheet(
      companyId,
      asOfDate ? new Date(asOfDate) : new Date(),
    );
  }

  @Get('income-statement')
  @ApiOperation({ summary: 'Generate income statement (P&L) report' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Returns income statement report' })
  @ApiResponse({ status: 400, description: 'Missing required date parameters' })
  async getIncomeStatement(
    @CurrentCompany() companyId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    if (!startDate || !endDate) {
      return { error: 'Both startDate and endDate are required' };
    }

    return this.reportsService.getIncomeStatement(
      companyId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('general-ledger/:accountId')
  @ApiOperation({ summary: 'Generate general ledger report for an account' })
  @ApiParam({ name: 'accountId', description: 'Account ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Returns general ledger report' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async getGeneralLedger(
    @CurrentCompany() companyId: string,
    @Param('accountId') accountId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getGeneralLedger(companyId, accountId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }
}
