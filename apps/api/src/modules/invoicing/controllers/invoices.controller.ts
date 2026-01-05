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
  Res,
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
  ApiQuery,
  ApiProduces,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard, TenantGuard } from '../../../common/guards/index.js';
import { CurrentCompany, CurrentUser, AllowNoCompany } from '../../../common/decorators/index.js';
import { InvoicesService } from '../services/index.js';
import { InvoicePdfService } from '../services/invoice-pdf.service.js';
import { CreateInvoiceDto, QueryInvoicesDto } from '../dto/index.js';

interface JwtPayload {
  sub: string;
  email: string;
}

@ApiTags('Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@AllowNoCompany()
@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly pdfService: InvoicePdfService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all invoices' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of invoices' })
  async findAll(
    @CurrentCompany() companyId: string | null,
    @Query() query: QueryInvoicesDto,
  ) {
    if (!companyId) {
      return { invoices: [], total: 0 };
    }
    return this.invoicesService.findAll(companyId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Returns invoice details with lines' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async findById(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    return this.invoicesService.findById(companyId, id);
  }

  @Get(':id/verifactu-qr')
  @ApiOperation({ summary: 'Get Verifactu QR code data for an invoice' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Returns QR code data for Verifactu' })
  @ApiResponse({ status: 400, description: 'Invoice not registered with Verifactu' })
  async getVerifactuQR(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    const qrData = await this.invoicesService.getVerifactuQR(companyId, id);
    return { qrData };
  }

  @Post('sales')
  @ApiOperation({ summary: 'Create a new sales invoice' })
  @ApiResponse({ status: 201, description: 'Sales invoice created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  async createSales(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.invoicesService.create(companyId, user.sub, dto, 'ISSUED');
  }

  @Post('purchases')
  @ApiOperation({ summary: 'Create a new purchase invoice' })
  @ApiResponse({ status: 201, description: 'Purchase invoice created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  async createPurchase(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.invoicesService.create(companyId, user.sub, dto, 'RECEIVED');
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a draft invoice' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice updated successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  @ApiResponse({ status: 409, description: 'Only draft invoices can be modified' })
  async update(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateInvoiceDto>,
  ) {
    return this.invoicesService.update(companyId, id, dto);
  }

  @Patch(':id/issue')
  @ApiOperation({ summary: 'Issue an invoice (registers with Verifactu for sales)' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice issued successfully' })
  @ApiResponse({ status: 400, description: 'Verifactu registration failed' })
  @ApiResponse({ status: 409, description: 'Only draft invoices can be issued' })
  @HttpCode(HttpStatus.OK)
  async issue(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    return this.invoicesService.issue(companyId, id);
  }

  @Patch(':id/paid')
  @ApiOperation({ summary: 'Mark an invoice as paid' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice marked as paid' })
  @ApiResponse({ status: 409, description: 'Only issued/sent invoices can be marked as paid' })
  @HttpCode(HttpStatus.OK)
  async markAsPaid(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() body: { paidAt?: string },
  ) {
    return this.invoicesService.markAsPaid(
      companyId,
      id,
      body.paidAt ? new Date(body.paidAt) : undefined,
    );
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel an invoice' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice cancelled' })
  @ApiResponse({ status: 400, description: 'Cannot cancel Verifactu-registered invoice' })
  @HttpCode(HttpStatus.OK)
  async cancel(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    return this.invoicesService.cancel(companyId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a draft invoice' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 204, description: 'Invoice deleted successfully' })
  @ApiResponse({ status: 409, description: 'Only draft invoices can be deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    await this.invoicesService.delete(companyId, id);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download invoice as PDF' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiQuery({ name: 'lang', required: false, enum: ['es', 'en'], description: 'PDF language' })
  @ApiProduces('application/pdf')
  @ApiResponse({ status: 200, description: 'Returns PDF file' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async downloadPdf(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Query('lang') lang: 'es' | 'en' = 'es',
    @Res() res: Response,
  ) {
    const invoice = await this.invoicesService.findById(companyId, id);
    const pdfBuffer = await this.pdfService.generatePdf(companyId, id, {
      language: lang,
      includeQR: true,
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="factura-${invoice.fullNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }

  @Get(':id/pdf/preview')
  @ApiOperation({ summary: 'Preview invoice PDF in browser' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiQuery({ name: 'lang', required: false, enum: ['es', 'en'], description: 'PDF language' })
  @ApiProduces('application/pdf')
  @ApiResponse({ status: 200, description: 'Returns PDF for inline viewing' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async previewPdf(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Query('lang') lang: 'es' | 'en' = 'es',
    @Res() res: Response,
  ) {
    const invoice = await this.invoicesService.findById(companyId, id);
    const pdfBuffer = await this.pdfService.generatePdf(companyId, id, {
      language: lang,
      includeQR: true,
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="factura-${invoice.fullNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }
}
