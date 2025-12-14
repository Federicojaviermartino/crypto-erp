import { Module } from '@nestjs/common';
import { PrismaModule } from '@crypto-erp/database';
import {
  AccountsService,
  JournalEntriesService,
  FiscalYearsService,
  ReportsService,
} from './services/index.js';
import {
  AccountsController,
  JournalEntriesController,
  FiscalYearsController,
  ReportsController,
} from './controllers/index.js';

@Module({
  imports: [PrismaModule],
  controllers: [
    AccountsController,
    JournalEntriesController,
    FiscalYearsController,
    ReportsController,
  ],
  providers: [
    AccountsService,
    JournalEntriesService,
    FiscalYearsService,
    ReportsService,
  ],
  exports: [
    AccountsService,
    JournalEntriesService,
    FiscalYearsService,
    ReportsService,
  ],
})
export class AccountingModule {}
