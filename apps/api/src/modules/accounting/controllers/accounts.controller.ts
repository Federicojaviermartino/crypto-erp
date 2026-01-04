import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Body,
    Param,
    Query,
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
import { CurrentCompany, AllowNoCompany } from '../../../common/decorators/index.js';
import { AccountsService } from '../services/index.js';
import { CreateAccountDto, QueryAccountsDto } from '../dto/index.js';

@ApiTags('Accounts')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard)
  @AllowNoCompany()
  @Controller('accounts')
  export class AccountsController {
    constructor(private readonly accountsService: AccountsService) {}

    @Get()
    @ApiOperation({ summary: 'List all accounts' })
    @ApiResponse({ status: 200, description: 'Returns list of accounts' })
    async findAll(
          @CurrentCompany() companyId: string | null,
          @Query() query: QueryAccountsDto,
        ) {
          if (!companyId) {
                  return [];
          }
          return this.accountsService.findAll(companyId, query);
    }

    @Get('tree')
    @ApiOperation({ summary: 'Get accounts as hierarchical tree' })
    @ApiResponse({ status: 200, description: 'Returns account tree structure' })
    async getTree(@CurrentCompany() companyId: string | null) {
          if (!companyId) {
                  return [];
          }
          return this.accountsService.findTree(companyId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get account by ID' })
    @ApiParam({ name: 'id', description: 'Account ID' })
    @ApiResponse({ status: 200, description: 'Returns account details' })
    @ApiResponse({ status: 404, description: 'Account not found' })
    async findById(
          @CurrentCompany() companyId: string | null,
          @Param('id') id: string,
        ) {
          if (!companyId) {
                  return { error: 'No company selected' };
          }
          return this.accountsService.findById(companyId, id);
    }

    @Get('code/:code')
    @ApiOperation({ summary: 'Get account by code' })
    @ApiParam({ name: 'code', description: 'Account code (e.g., 100, 400)' })
    @ApiResponse({ status: 200, description: 'Returns account details' })
    @ApiResponse({ status: 404, description: 'Account not found' })
    async findByCode(
          @CurrentCompany() companyId: string | null,
          @Param('code') code: string,
        ) {
          if (!companyId) {
                  return { error: 'No company selected' };
          }
          const account = await this.accountsService.findByCode(companyId, code);
          if (!account) {
                  return { error: 'Account not found', code };
          }
          return account;
    }

    @Get(':id/balance')
    @ApiOperation({ summary: 'Get account balance' })
    @ApiParam({ name: 'id', description: 'Account ID' })
    @ApiResponse({ status: 200, description: 'Returns account balance' })
    async getBalance(
          @CurrentCompany() companyId: string | null,
          @Param('id') id: string,
          @Query('startDate') startDate?: string,
          @Query('endDate') endDate?: string,
        ) {
          if (!companyId) {
                  return { error: 'No company selected' };
          }
          return this.accountsService.getBalance(
                  companyId,
                  id,
                  startDate ? new Date(startDate) : undefined,
                  endDate ? new Date(endDate) : undefined,
                );
    }

    @Post()
    @ApiOperation({ summary: 'Create a new account' })
    @ApiResponse({ status: 201, description: 'Account created successfully' })
    @ApiResponse({ status: 409, description: 'Account code already exists' })
    async create(
          @CurrentCompany() companyId: string | null,
          @Body() dto: CreateAccountDto,
        ) {
          if (!companyId) {
                  return { error: 'No company selected' };
          }
          return this.accountsService.create(companyId, dto);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update an account' })
    @ApiParam({ name: 'id', description: 'Account ID' })
    @ApiResponse({ status: 200, description: 'Account updated successfully' })
    @ApiResponse({ status: 404, description: 'Account not found' })
    async update(
          @CurrentCompany() companyId: string | null,
          @Param('id') id: string,
          @Body() dto: Partial<CreateAccountDto>,
        ) {
          if (!companyId) {
                  return { error: 'No company selected' };
          }
          return this.accountsService.update(companyId, id, dto);
    }

    @Patch(':id/deactivate')
    @ApiOperation({ summary: 'Deactivate an account' })
    @ApiParam({ name: 'id', description: 'Account ID' })
    @ApiResponse({ status: 200, description: 'Account deactivated' })
    @HttpCode(HttpStatus.OK)
    async deactivate(
          @CurrentCompany() companyId: string | null,
          @Param('id') id: string,
        ) {
          if (!companyId) {
                  return { error: 'No company selected' };
          }
          return this.accountsService.deactivate(companyId, id);
    }

    @Patch(':id/activate')
    @ApiOperation({ summary: 'Activate an account' })
    @ApiParam({ name: 'id', description: 'Account ID' })
    @ApiResponse({ status: 200, description: 'Account activated' })
    @HttpCode(HttpStatus.OK)
    async activate(
          @CurrentCompany() companyId: string | null,
          @Param('id') id: string,
        ) {
          if (!companyId) {
                  return { error: 'No company selected' };
          }
          return this.accountsService.activate(companyId, id);
    }
}
