import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@crypto-erp/database';
import { Invoice, InvoiceDirection } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { createWriteStream } from 'fs';
import { Decimal } from '@prisma/client/runtime/library';

export interface LibroRegistroEntry {
  fecha: Date;
  numeroFactura: string;
  serie: string;
  nifContraparte: string;
  nombreContraparte: string;
  baseImponible: Decimal;
  tipoImpositivo: number;
  cuotaIVA: Decimal;
  total: Decimal;
  retencionIRPF?: Decimal;
  observaciones?: string;
  verifactuId?: string;
}

export interface LibroRegistroData {
  empresa: {
    nombre: string;
    nif: string;
  };
  periodo: {
    fechaInicio: Date;
    fechaFin: Date;
  };
  facturasEmitidas: LibroRegistroEntry[];
  facturasRecibidas: LibroRegistroEntry[];
  totales: {
    emitidas: {
      baseImponible: Decimal;
      cuotaIVA: Decimal;
      total: Decimal;
    };
    recibidas: {
      baseImponible: Decimal;
      cuotaIVA: Decimal;
      total: Decimal;
    };
  };
}

@Injectable()
export class LibroRegistroService {
  private readonly logger = new Logger(LibroRegistroService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate Libro Registro data for a company and period
   */
  async generateLibroRegistro(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<LibroRegistroData> {
    this.logger.log(
      `Generating Libro Registro for company ${companyId} from ${startDate.toISOString()} to ${endDate.toISOString()}`,
    );

    // Get company
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException(`Company ${companyId} not found`);
    }

    // Get issued invoices (facturas emitidas)
    const issuedInvoices = await this.prisma.invoice.findMany({
      where: {
        companyId,
        direction: InvoiceDirection.ISSUED,
        issueDate: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ['SENT', 'PAID', 'OVERDUE'],
        },
      },
      include: {
        contact: true,
        lines: true,
      },
      orderBy: [{ issueDate: 'asc' }, { number: 'asc' }],
    });

    // Get received invoices (facturas recibidas)
    const receivedInvoices = await this.prisma.invoice.findMany({
      where: {
        companyId,
        direction: InvoiceDirection.RECEIVED,
        issueDate: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ['SENT', 'PAID', 'OVERDUE'],
        },
      },
      include: {
        contact: true,
        lines: true,
      },
      orderBy: [{ issueDate: 'asc' }, { number: 'asc' }],
    });

    // Transform invoices to libro registro entries
    const facturasEmitidas = issuedInvoices.map((invoice) =>
      this.invoiceToLibroEntry(invoice),
    );
    const facturasRecibidas = receivedInvoices.map((invoice) =>
      this.invoiceToLibroEntry(invoice),
    );

    // Calculate totals
    const totales = this.calculateTotales(facturasEmitidas, facturasRecibidas);

    return {
      empresa: {
        nombre: company.name,
        nif: company.taxId,
      },
      periodo: {
        fechaInicio: startDate,
        fechaFin: endDate,
      },
      facturasEmitidas,
      facturasRecibidas,
      totales,
    };
  }

  /**
   * Transform Invoice to LibroRegistroEntry
   */
  private invoiceToLibroEntry(invoice: Invoice & { lines: any[]; contact?: any }): LibroRegistroEntry {
    // Calculate totals
    let baseImponible = new Decimal(0);
    let cuotaIVA = new Decimal(0);

    invoice.lines.forEach((line) => {
      const lineBase = new Decimal(line.quantity).times(line.unitPrice);
      const lineTax = lineBase.times(line.taxRate || 0).dividedBy(100);

      baseImponible = baseImponible.plus(lineBase);
      cuotaIVA = cuotaIVA.plus(lineTax);
    });

    const total = baseImponible.plus(cuotaIVA);

    // Extract tax rate (assume first line's tax rate for simplicity)
    const tipoImpositivo = invoice.lines.length > 0 ? (invoice.lines[0].taxRate || 21) : 21;

    return {
      fecha: invoice.issueDate,
      numeroFactura: String(invoice.number),
      serie: 'A', // Default series since field doesn't exist in schema
      nifContraparte: invoice.counterpartyTaxId || 'N/A',
      nombreContraparte: invoice.counterpartyName || invoice.contact?.name || 'N/A',
      baseImponible,
      tipoImpositivo,
      cuotaIVA,
      total,
      retencionIRPF: undefined, // Field doesn't exist in current schema
      observaciones: invoice.notes || undefined,
      verifactuId: undefined, // Field doesn't exist on Invoice model
    };
  }

  /**
   * Calculate totals
   */
  private calculateTotales(
    facturasEmitidas: LibroRegistroEntry[],
    facturasRecibidas: LibroRegistroEntry[],
  ) {
    const sumEntries = (entries: LibroRegistroEntry[]) => {
      return entries.reduce(
        (acc, entry) => ({
          baseImponible: acc.baseImponible.plus(entry.baseImponible),
          cuotaIVA: acc.cuotaIVA.plus(entry.cuotaIVA),
          total: acc.total.plus(entry.total),
        }),
        {
          baseImponible: new Decimal(0),
          cuotaIVA: new Decimal(0),
          total: new Decimal(0),
        },
      );
    };

    return {
      emitidas: sumEntries(facturasEmitidas),
      recibidas: sumEntries(facturasRecibidas),
    };
  }

  /**
   * Export to CSV
   */
  async exportToCSV(
    companyId: string,
    startDate: Date,
    endDate: Date,
    type: 'emitidas' | 'recibidas' = 'emitidas',
  ): Promise<string> {
    const data = await this.generateLibroRegistro(companyId, startDate, endDate);

    const entries = type === 'emitidas' ? data.facturasEmitidas : data.facturasRecibidas;

    // Generate CSV header
    const headers = [
      'Date',
      'Series',
      'Number',
      'Counterparty Tax ID',
      'Counterparty Name',
      'Tax Base',
      'VAT Rate (%)',
      'VAT Amount',
      'Total',
      'IRPF Withholding',
      'Verifactu ID',
      'Notes',
    ];

    // Generate CSV rows
    const rows = entries.map((entry) => [
      entry.fecha.toISOString().split('T')[0],
      entry.serie,
      entry.numeroFactura,
      entry.nifContraparte,
      entry.nombreContraparte,
      entry.baseImponible.toFixed(2),
      entry.tipoImpositivo.toFixed(2),
      entry.cuotaIVA.toFixed(2),
      entry.total.toFixed(2),
      entry.retencionIRPF?.toFixed(2) || '0.00',
      entry.verifactuId || '',
      entry.observaciones || '',
    ]);

    // Combine headers and rows
    const csvLines = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    return csvLines;
  }

  /**
   * Export to Excel
   */
  async exportToExcel(
    companyId: string,
    startDate: Date,
    endDate: Date,
    filePath: string,
  ): Promise<void> {
    const data = await this.generateLibroRegistro(companyId, startDate, endDate);

    const workbook = new ExcelJS.Workbook();

    // Add company info
    workbook.creator = data.empresa.nombre;
    workbook.created = new Date();

    // Sheet 1: Issued Invoices
    const sheetEmitidas = workbook.addWorksheet('Issued Invoices');
    this.addSheetData(sheetEmitidas, data.facturasEmitidas, 'Issued Invoices', data);

    // Sheet 2: Received Invoices
    const sheetRecibidas = workbook.addWorksheet('Received Invoices');
    this.addSheetData(sheetRecibidas, data.facturasRecibidas, 'Received Invoices', data);

    // Sheet 3: Summary
    const sheetResumen = workbook.addWorksheet('Summary');
    this.addResumenSheet(sheetResumen, data);

    // Save to file
    await workbook.xlsx.writeFile(filePath);

    this.logger.log(`Excel exported to ${filePath}`);
  }

  /**
   * Add data to Excel sheet
   */
  private addSheetData(
    sheet: ExcelJS.Worksheet,
    entries: LibroRegistroEntry[],
    title: string,
    data: LibroRegistroData,
  ): void {
    // Title row
    sheet.mergeCells('A1:L1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `${title} - ${data.empresa.nombre} (${data.empresa.nif})`;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    // Period row
    sheet.mergeCells('A2:L2');
    const periodCell = sheet.getCell('A2');
    periodCell.value = `Period: ${data.periodo.fechaInicio.toLocaleDateString('en-US')} - ${data.periodo.fechaFin.toLocaleDateString('en-US')}`;
    periodCell.alignment = { horizontal: 'center' };

    // Empty row
    sheet.addRow([]);

    // Headers
    const headerRow = sheet.addRow([
      'Date',
      'Series',
      'Number',
      'Counterparty Tax ID',
      'Counterparty Name',
      'Tax Base',
      'VAT Rate (%)',
      'VAT Amount',
      'Total',
      'IRPF Withholding',
      'Verifactu ID',
      'Notes',
    ]);

    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };

    // Data rows
    entries.forEach((entry) => {
      sheet.addRow([
        entry.fecha.toLocaleDateString('en-US'),
        entry.serie,
        entry.numeroFactura,
        entry.nifContraparte,
        entry.nombreContraparte,
        parseFloat(entry.baseImponible.toFixed(2)),
        entry.tipoImpositivo,
        parseFloat(entry.cuotaIVA.toFixed(2)),
        parseFloat(entry.total.toFixed(2)),
        entry.retencionIRPF ? parseFloat(entry.retencionIRPF.toFixed(2)) : 0,
        entry.verifactuId || '',
        entry.observaciones || '',
      ]);
    });

    // Column widths
    sheet.getColumn(1).width = 12; // Date
    sheet.getColumn(2).width = 8;  // Series
    sheet.getColumn(3).width = 15; // Number
    sheet.getColumn(4).width = 12; // Tax ID
    sheet.getColumn(5).width = 30; // Name
    sheet.getColumn(6).width = 15; // Tax Base
    sheet.getColumn(7).width = 12; // VAT Rate
    sheet.getColumn(8).width = 12; // VAT Amount
    sheet.getColumn(9).width = 12; // Total
    sheet.getColumn(10).width = 15; // IRPF
    sheet.getColumn(11).width = 20; // Verifactu ID
    sheet.getColumn(12).width = 30; // Notes

    // Number formatting
    for (let i = 5; i <= sheet.rowCount; i++) {
      sheet.getCell(`F${i}`).numFmt = '#,##0.00 €'; // Tax Base
      sheet.getCell(`G${i}`).numFmt = '0.00 "%"';   // VAT Rate
      sheet.getCell(`H${i}`).numFmt = '#,##0.00 €'; // VAT Amount
      sheet.getCell(`I${i}`).numFmt = '#,##0.00 €'; // Total
      sheet.getCell(`J${i}`).numFmt = '#,##0.00 €'; // IRPF
    }
  }

  /**
   * Add summary sheet
   */
  private addResumenSheet(sheet: ExcelJS.Worksheet, data: LibroRegistroData): void {
    // Title
    sheet.mergeCells('A1:D1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `Summary - ${data.empresa.nombre}`;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    // Empty row
    sheet.addRow([]);

    // Issued Invoices Summary
    sheet.addRow(['ISSUED INVOICES', '', '', '']).font = { bold: true };
    sheet.addRow([
      'Tax Base:',
      parseFloat(data.totales.emitidas.baseImponible.toFixed(2)),
      '€',
      '',
    ]);
    sheet.addRow([
      'VAT Amount:',
      parseFloat(data.totales.emitidas.cuotaIVA.toFixed(2)),
      '€',
      '',
    ]);
    sheet.addRow([
      'TOTAL:',
      parseFloat(data.totales.emitidas.total.toFixed(2)),
      '€',
      '',
    ]).font = { bold: true };

    // Empty row
    sheet.addRow([]);

    // Received Invoices Summary
    sheet.addRow(['RECEIVED INVOICES', '', '', '']).font = { bold: true };
    sheet.addRow([
      'Tax Base:',
      parseFloat(data.totales.recibidas.baseImponible.toFixed(2)),
      '€',
      '',
    ]);
    sheet.addRow([
      'VAT Amount:',
      parseFloat(data.totales.recibidas.cuotaIVA.toFixed(2)),
      '€',
      '',
    ]);
    sheet.addRow([
      'TOTAL:',
      parseFloat(data.totales.recibidas.total.toFixed(2)),
      '€',
      '',
    ]).font = { bold: true };

    // Empty row
    sheet.addRow([]);

    // Balance
    const balanceBase = data.totales.emitidas.baseImponible.minus(
      data.totales.recibidas.baseImponible,
    );
    const balanceIVA = data.totales.emitidas.cuotaIVA.minus(data.totales.recibidas.cuotaIVA);
    const balanceTotal = data.totales.emitidas.total.minus(data.totales.recibidas.total);

    sheet.addRow(['BALANCE (Issued - Received)', '', '', '']).font = {
      bold: true,
      color: { argb: 'FF0000FF' },
    };
    sheet.addRow([
      'Tax Base:',
      parseFloat(balanceBase.toFixed(2)),
      '€',
      balanceBase.isNegative() ? '(In favor of AEAT)' : '(In favor of company)',
    ]);
    sheet.addRow([
      'VAT Amount:',
      parseFloat(balanceIVA.toFixed(2)),
      '€',
      balanceIVA.isNegative() ? '(To be refunded)' : '(To be paid)',
    ]);
    sheet.addRow([
      'TOTAL:',
      parseFloat(balanceTotal.toFixed(2)),
      '€',
      '',
    ]).font = { bold: true };

    // Column widths
    sheet.getColumn(1).width = 20;
    sheet.getColumn(2).width = 15;
    sheet.getColumn(3).width = 5;
    sheet.getColumn(4).width = 20;

    // Number formatting
    for (let i = 4; i <= 13; i++) {
      if (sheet.getRow(i).getCell(2).value !== '') {
        sheet.getRow(i).getCell(2).numFmt = '#,##0.00';
      }
    }
  }
}
