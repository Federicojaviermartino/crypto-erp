import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CompaniesService } from './companies.service.js';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/index.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser, JwtPayload } from '../../common/index.js';

@ApiTags('companies')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private companiesService: CompaniesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new company with PGC chart of accounts' })
  @ApiResponse({ status: 201, description: 'Company created with seed data' })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCompanyDto) {
    return this.companiesService.create(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all companies for current user' })
  @ApiResponse({ status: 200, description: 'List of companies' })
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.companiesService.findAllByUser(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company by ID' })
  @ApiResponse({ status: 200, description: 'Company details' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.companiesService.findById(id, user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update company' })
  @ApiResponse({ status: 200, description: 'Company updated' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companiesService.update(id, user.sub, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete company (OWNER only)' })
  @ApiResponse({ status: 200, description: 'Company deleted' })
  @ApiResponse({ status: 403, description: 'Only OWNER can delete' })
  async delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.companiesService.delete(id, user.sub);
  }

  @Post(':id/default')
  @ApiOperation({ summary: 'Set company as default for user' })
  @ApiResponse({ status: 200, description: 'Default company updated' })
  async setDefault(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.companiesService.setDefault(id, user.sub);
  }
}
