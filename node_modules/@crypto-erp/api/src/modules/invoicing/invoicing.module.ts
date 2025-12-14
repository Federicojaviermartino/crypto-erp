import { Module } from '@nestjs/common';
import { PrismaModule } from '@crypto-erp/database';
import {
  ContactsService,
  InvoicesService,
  SeriesService,
} from './services/index.js';
import { InvoicePdfService } from './services/invoice-pdf.service.js';
import {
  ContactsController,
  InvoicesController,
  SeriesController,
} from './controllers/index.js';
import { VerifactuService } from './verifactu/verifactu.service.js';
import { VerifactuController } from './verifactu/verifactu.controller.js';
import { AEATClientService } from './verifactu/aeat-client.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [
    ContactsController,
    InvoicesController,
    SeriesController,
    VerifactuController,
  ],
  providers: [
    ContactsService,
    InvoicesService,
    SeriesService,
    VerifactuService,
    AEATClientService,
    InvoicePdfService,
  ],
  exports: [
    ContactsService,
    InvoicesService,
    SeriesService,
    VerifactuService,
    AEATClientService,
    InvoicePdfService,
  ],
})
export class InvoicingModule {}
