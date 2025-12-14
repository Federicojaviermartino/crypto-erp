import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
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
import { CurrentCompany, CurrentUser } from '../../../common/decorators/index.js';
import { JournalEntriesService } from '../services/index.js';
import { CreateJournalEntryDto, QueryJournalEntriesDto } from '../dto/index.js';

interface JwtPayload {
  sub: string;
  email: string;
}

@ApiTags('Journal Entries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('journal-entries')
export class JournalEntriesController {
  constructor(private readonly journalEntriesService: JournalEntriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all journal entries' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of journal entries' })
  async findAll(
    @CurrentCompany() companyId: string,
    @Query() query: QueryJournalEntriesDto,
  ) {
    return this.journalEntriesService.findAll(companyId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get journal entry by ID' })
  @ApiParam({ name: 'id', description: 'Journal entry ID' })
  @ApiResponse({ status: 200, description: 'Returns journal entry details with lines' })
  @ApiResponse({ status: 404, description: 'Journal entry not found' })
  async findById(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    return this.journalEntriesService.findById(companyId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new journal entry' })
  @ApiResponse({ status: 201, description: 'Journal entry created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data or unbalanced entry' })
  async create(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateJournalEntryDto,
  ) {
    return this.journalEntriesService.create(companyId, user.sub, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a journal entry' })
  @ApiParam({ name: 'id', description: 'Journal entry ID' })
  @ApiResponse({ status: 200, description: 'Journal entry updated successfully' })
  @ApiResponse({ status: 404, description: 'Journal entry not found' })
  @ApiResponse({ status: 409, description: 'Cannot modify posted entry' })
  async update(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateJournalEntryDto>,
  ) {
    return this.journalEntriesService.update(companyId, id, dto);
  }

  @Patch(':id/post')
  @ApiOperation({ summary: 'Post a journal entry' })
  @ApiParam({ name: 'id', description: 'Journal entry ID' })
  @ApiResponse({ status: 200, description: 'Journal entry posted successfully' })
  @ApiResponse({ status: 404, description: 'Journal entry not found' })
  @ApiResponse({ status: 409, description: 'Entry already posted or voided' })
  @HttpCode(HttpStatus.OK)
  async post(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.journalEntriesService.post(companyId, id, user.sub);
  }

  @Patch(':id/void')
  @ApiOperation({ summary: 'Void a journal entry' })
  @ApiParam({ name: 'id', description: 'Journal entry ID' })
  @ApiResponse({ status: 200, description: 'Journal entry voided successfully' })
  @ApiResponse({ status: 404, description: 'Journal entry not found' })
  @ApiResponse({ status: 409, description: 'Entry already voided' })
  @HttpCode(HttpStatus.OK)
  async void(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.journalEntriesService.void(companyId, id, user.sub);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a draft journal entry' })
  @ApiParam({ name: 'id', description: 'Journal entry ID' })
  @ApiResponse({ status: 204, description: 'Journal entry deleted successfully' })
  @ApiResponse({ status: 404, description: 'Journal entry not found' })
  @ApiResponse({ status: 409, description: 'Only draft entries can be deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    await this.journalEntriesService.delete(companyId, id);
  }
}
