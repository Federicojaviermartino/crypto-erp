import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Headers,
  BadRequestException,
  UseGuards,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TaxPredictionService } from './tax-prediction.service.js';
import { PredictTaxImpactDto, TaxPredictionResponseDto } from './dto/predict-tax.dto.js';
import { Modelo347Service, Modelo347Data } from './modelo347.service.js';
import { SIIService } from './sii.service.js';
import { LibroRegistroService } from './libro-registro.service.js';
import { GenerateModelo347Dto } from './dto/generate-modelo347.dto.js';
import { GenerateLibroRegistroDto, ExportFormat } from './dto/generate-libro-registro.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { GetCompany } from '../../common/decorators/get-company.decorator.js';
import { UserRole } from '@prisma/client';
import { Auditable } from '../audit/decorators/auditable.decorator.js';

@ApiTags('fiscal')
@ApiBearerAuth()
@Controller('fiscal')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FiscalController {
  constructor(
    private readonly taxPredictionService: TaxPredictionService,
    private readonly modelo347: Modelo347Service,
    private readonly sii: SIIService,
    private readonly libroRegistro: LibroRegistroService,
  ) {}

  private getCompanyId(headers: Record<string, string>): string {
    const companyId = headers['x-company-id'];
    if (!companyId) {
      throw new BadRequestException('X-Company-Id header is required');
    }
    return companyId;
  }

  @Post('predict-tax-impact')
  @ApiOperation({
    summary: 'Predict tax impact of a prospective crypto transaction',
    description:
      'Simulates the tax consequences of selling or buying crypto assets using FIFO method. ' +
      'Does not persist any data to the database. Returns capital gains/losses and estimated tax.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tax prediction calculated successfully',
    type: TaxPredictionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: 404,
    description: 'Crypto asset or company not found',
  })
  async predictTaxImpact(
    @Headers() headers: Record<string, string>,
    @Body() dto: PredictTaxImpactDto,
  ): Promise<TaxPredictionResponseDto> {
    const companyId = this.getCompanyId(headers);
    return this.taxPredictionService.predictTaxImpact(companyId, dto);
  }

  /**
   * Calculate Modelo 347 data (preview)
   */
  @Get('modelo347/calculate')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({
    summary: 'Calculate Modelo 347 (preview)',
    description: 'Detects all operations with third parties exceeding 3,005.01€ for a fiscal year',
  })
  @ApiResponse({
    status: 200,
    description: 'Modelo 347 calculated successfully',
  })
  async calculateModelo347(
    @GetCompany() companyId: string,
    @Query() dto: GenerateModelo347Dto,
  ): Promise<Modelo347Data> {
    return this.modelo347.calculateModelo347(companyId, dto.fiscalYear);
  }

  /**
   * Download Modelo 347 as XML (AEAT format)
   */
  @Get('modelo347/xml')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @Auditable('Modelo347')
  @ApiOperation({
    summary: 'Download Modelo 347 XML',
    description: 'Generate and download Modelo 347 in AEAT XML format for submission',
  })
  @ApiResponse({
    status: 200,
    description: 'XML file generated successfully',
  })
  async downloadModelo347XML(
    @GetCompany() companyId: string,
    @Query() dto: GenerateModelo347Dto,
    @Res() res: Response,
  ) {
    const xml = await this.modelo347.generateXML(companyId, dto.fiscalYear);

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="modelo347_${dto.fiscalYear}.xml"`,
    );
    res.status(HttpStatus.OK).send(xml);
  }

  /**
   * Download Modelo 347 as CSV (for accounting software)
   */
  @Get('modelo347/csv')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @Auditable('Modelo347')
  @ApiOperation({
    summary: 'Download Modelo 347 CSV',
    description: 'Generate and download Modelo 347 as CSV for accounting software',
  })
  @ApiResponse({
    status: 200,
    description: 'CSV file generated successfully',
  })
  async downloadModelo347CSV(
    @GetCompany() companyId: string,
    @Query() dto: GenerateModelo347Dto,
    @Res() res: Response,
  ) {
    const csv = await this.modelo347.generateCSV(companyId, dto.fiscalYear);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="modelo347_${dto.fiscalYear}.csv"`,
    );
    res.status(HttpStatus.OK).send('\uFEFF' + csv); // Add BOM for Excel
  }

  /**
   * Get invoices pending SII submission
   */
  @Get('sii/pending')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({
    summary: 'Get invoices pending SII submission',
    description: 'Returns invoices issued >4 days ago that have not been submitted to AEAT SII',
  })
  async getSIIPendingInvoices(@GetCompany() companyId: string) {
    return this.sii.getPendingSubmissions(companyId);
  }

  /**
   * Submit issued invoices to SII
   */
  @Post('sii/submit-issued')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @Auditable('SII')
  @ApiOperation({
    summary: 'Submit issued invoices to SII',
    description: 'Send issued invoices (Facturas Emitidas) to AEAT SII system',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoices submitted successfully',
  })
  async submitIssuedInvoices(
    @GetCompany() companyId: string,
    @Body() body: { invoiceIds: string[] },
  ) {
    return this.sii.submitIssuedInvoices(companyId, body.invoiceIds);
  }

  /**
   * Submit received invoices to SII
   */
  @Post('sii/submit-received')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @Auditable('SII')
  @ApiOperation({
    summary: 'Submit received invoices to SII',
    description: 'Send received invoices (Facturas Recibidas) to AEAT SII system',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoices submitted successfully',
  })
  async submitReceivedInvoices(
    @GetCompany() companyId: string,
    @Body() body: { invoiceIds: string[] },
  ) {
    return this.sii.submitReceivedInvoices(companyId, body.invoiceIds);
  }

  /**
   * Generate Libro Registro de Facturas
   */
  @Get('libro-registro')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({
    summary: 'Generate Libro Registro de Facturas',
    description: 'Generate the official invoice registry book for a given period',
  })
  @ApiResponse({
    status: 200,
    description: 'Libro Registro generated successfully',
  })
  async generateLibroRegistro(
    @GetCompany() companyId: string,
    @Query() dto: GenerateLibroRegistroDto,
  ) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    return this.libroRegistro.generateLibroRegistro(companyId, startDate, endDate);
  }

  /**
   * Export Libro Registro to CSV
   */
  @Get('libro-registro/csv')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @Auditable('LibroRegistro')
  @ApiOperation({
    summary: 'Export Libro Registro to CSV',
    description: 'Download Libro Registro as CSV file',
  })
  async exportLibroRegistroCSV(
    @GetCompany() companyId: string,
    @Query() dto: GenerateLibroRegistroDto,
    @Res() res: Response,
  ) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    const csv = await this.libroRegistro.exportToCSV(
      companyId,
      startDate,
      endDate,
      dto.type === 'emitidas' ? 'emitidas' : 'recibidas',
    );

    const filename = `libro_registro_${dto.type}_${dto.startDate}_${dto.endDate}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send('\uFEFF' + csv); // Add BOM for Excel
  }

  /**
   * Export Libro Registro to Excel
   */
  @Get('libro-registro/excel')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @Auditable('LibroRegistro')
  @ApiOperation({
    summary: 'Export Libro Registro to Excel',
    description: 'Download Libro Registro as Excel file with formatted sheets',
  })
  async exportLibroRegistroExcel(
    @GetCompany() companyId: string,
    @Query() dto: GenerateLibroRegistroDto,
    @Res() res: Response,
  ) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    const filename = `libro_registro_${dto.startDate}_${dto.endDate}.xlsx`;
    const tmpFilePath = `/tmp/${filename}`;

    await this.libroRegistro.exportToExcel(companyId, startDate, endDate, tmpFilePath);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).sendFile(tmpFilePath);
  }
}
