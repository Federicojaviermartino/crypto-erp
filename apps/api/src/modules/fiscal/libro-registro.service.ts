import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@crypto-erp/database';
import { Invoice, InvoiceDirection } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { createWriteStream } from 'fs';
import { Decimal } from '@prisma/client/runtime/library';

interface LibroRegistroEntry {
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

interface LibroRegistroData {
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
        direction: InvoiceDirection.SALE,
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
        items: true,
      },
      orderBy: [{ issueDate: 'asc' }, { number: 'asc' }],
    });

    // Get received invoices (facturas recibidas)
    const receivedInvoices = await this.prisma.invoice.findMany({
      where: {
        companyId,
        direction: InvoiceDirection.PURCHASE,
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
        items: true,
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
  private invoiceToLibroEntry(invoice: Invoice & { items: any[]; contact?: any }): LibroRegistroEntry {
    // Calculate totals
    let baseImponible = new Decimal(0);
    let cuotaIVA = new Decimal(0);

    invoice.items.forEach((item) => {
      const itemBase = new Decimal(item.quantity).times(item.unitPrice);
      const itemTax = itemBase.times(item.taxRate).dividedBy(100);

      baseImponible = baseImponible.plus(itemBase);
      cuotaIVA = cuotaIVA.plus(itemTax);
    });

    const total = baseImponible.plus(cuotaIVA);

    // Extract tax rate (assume first item's tax rate for simplicity)
    const tipoImpositivo = invoice.items.length > 0 ? invoice.items[0].taxRate : 21;

    return {
      fecha: invoice.issueDate,
      numeroFactura: invoice.number,
      serie: invoice.series || 'A',
      nifContraparte: invoice.counterpartyTaxId || 'N/A',
      nombreContraparte: invoice.counterpartyName || invoice.contact?.name || 'N/A',
      baseImponible,
      tipoImpositivo,
      cuotaIVA,
      total,
      retencionIRPF: invoice.withholdingAmount ? new Decimal(invoice.withholdingAmount) : undefined,
      observaciones: invoice.notes || undefined,
      verifactuId: invoice.verifactuId || undefined,
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
      'Fecha',
      'Serie',
      'Número',
      'NIF Contraparte',
      'Nombre Contraparte',
      'Base Imponible',
      'Tipo IVA (%)',
      'Cuota IVA',
      'Total',
      'Retención IRPF',
      'Verifactu ID',
      'Observaciones',
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

    // Sheet 1: Facturas Emitidas
    const sheetEmitidas = workbook.addWorksheet('Facturas Emitidas');
    this.addSheetData(sheetEmitidas, data.facturasEmitidas, 'Facturas Emitidas', data);

    // Sheet 2: Facturas Recibidas
    const sheetRecibidas = workbook.addWorksheet('Facturas Recibidas');
    this.addSheetData(sheetRecibidas, data.facturasRecibidas, 'Facturas Recibidas', data);

    // Sheet 3: Resumen
    const sheetResumen = workbook.addWorksheet('Resumen');
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
    periodCell.value = `Período: ${data.periodo.fechaInicio.toLocaleDateString('es-ES')} - ${data.periodo.fechaFin.toLocaleDateString('es-ES')}`;
    periodCell.alignment = { horizontal: 'center' };

    // Empty row
    sheet.addRow([]);

    // Headers
    const headerRow = sheet.addRow([
      'Fecha',
      'Serie',
      'Número',
      'NIF Contraparte',
      'Nombre Contraparte',
      'Base Imponible',
      'Tipo IVA (%)',
      'Cuota IVA',
      'Total',
      'Retención IRPF',
      'Verifactu ID',
      'Observaciones',
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
        entry.fecha.toLocaleDateString('es-ES'),
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
    sheet.getColumn(1).width = 12; // Fecha
    sheet.getColumn(2).width = 8;  // Serie
    sheet.getColumn(3).width = 15; // Número
    sheet.getColumn(4).width = 12; // NIF
    sheet.getColumn(5).width = 30; // Nombre
    sheet.getColumn(6).width = 15; // Base
    sheet.getColumn(7).width = 12; // Tipo IVA
    sheet.getColumn(8).width = 12; // Cuota IVA
    sheet.getColumn(9).width = 12; // Total
    sheet.getColumn(10).width = 15; // IRPF
    sheet.getColumn(11).width = 20; // Verifactu ID
    sheet.getColumn(12).width = 30; // Observaciones

    // Number formatting
    for (let i = 5; i <= sheet.rowCount; i++) {
      sheet.getCell(`F${i}`).numFmt = '#,##0.00 €'; // Base Imponible
      sheet.getCell(`G${i}`).numFmt = '0.00 "%"';   // Tipo IVA
      sheet.getCell(`H${i}`).numFmt = '#,##0.00 €'; // Cuota IVA
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
    titleCell.value = `Resumen - ${data.empresa.nombre}`;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    // Empty row
    sheet.addRow([]);

    // Facturas Emitidas Summary
    sheet.addRow(['FACTURAS EMITIDAS', '', '', '']).font = { bold: true };
    sheet.addRow([
      'Base Imponible:',
      parseFloat(data.totales.emitidas.baseImponible.toFixed(2)),
      '€',
      '',
    ]);
    sheet.addRow([
      'Cuota IVA:',
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

    // Facturas Recibidas Summary
    sheet.addRow(['FACTURAS RECIBIDAS', '', '', '']).font = { bold: true };
    sheet.addRow([
      'Base Imponible:',
      parseFloat(data.totales.recibidas.baseImponible.toFixed(2)),
      '€',
      '',
    ]);
    sheet.addRow([
      'Cuota IVA:',
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

    sheet.addRow(['BALANCE (Emitidas - Recibidas)', '', '', '']).font = {
      bold: true,
      color: { argb: 'FF0000FF' },
    };
    sheet.addRow([
      'Base Imponible:',
      parseFloat(balanceBase.toFixed(2)),
      '€',
      balanceBase.isNegative() ? '(A favor AEAT)' : '(A favor empresa)',
    ]);
    sheet.addRow([
      'Cuota IVA:',
      parseFloat(balanceIVA.toFixed(2)),
      '€',
      balanceIVA.isNegative() ? '(A devolver)' : '(A ingresar)',
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
