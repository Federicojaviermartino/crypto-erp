import { Module } from '@nestjs/common';
import { PrismaModule } from '@crypto-erp/database';
import { Modelo721Service } from './modelo721.service.js';
import { Modelo721Controller } from './modelo721.controller.js';
import { TaxReportService } from './tax-report.service.js';
import { TaxReportController } from './tax-report.controller.js';
import { TaxPredictionService } from './tax-prediction.service.js';
import { Modelo347Service } from './modelo347.service.js';
import { SIIService } from './sii.service.js';
import { LibroRegistroService } from './libro-registro.service.js';
import { FiscalController } from './fiscal.controller.js';
import { InvoicingModule } from '../invoicing/invoicing.module.js';

@Module({
  imports: [PrismaModule, InvoicingModule],
  controllers: [Modelo721Controller, TaxReportController, FiscalController],
  providers: [
    Modelo721Service,
    TaxReportService,
    TaxPredictionService,
    Modelo347Service,
    SIIService,
    LibroRegistroService,
  ],
  exports: [
    Modelo721Service,
    TaxReportService,
    TaxPredictionService,
    Modelo347Service,
    SIIService,
    LibroRegistroService,
  ],
})
export class FiscalModule {}
