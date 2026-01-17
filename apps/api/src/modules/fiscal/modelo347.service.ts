import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@crypto-erp/database';
import { Decimal } from '@prisma/client/runtime/library';
import { create } from 'xmlbuilder2';

interface Modelo347Operation {
  contactId: string;
  contactName: string;
  contactTaxId: string;
  totalAmount: Decimal;
  invoiceCount: number;
  quarterBreakdown: {
    Q1: Decimal;
    Q2: Decimal;
    Q3: Decimal;
    Q4: Decimal;
  };
  cashOperations: Decimal; // Operations paid in cash/crypto >6,000€
  realEstateOperations: Decimal; // Real estate operations
}

export interface Modelo347Data {
  companyId: string;
  fiscalYear: number;
  declarantNif: string;
  declarantName: string;
  operations: Modelo347Operation[];
  totalDeclared: Decimal;
  operationCount: number;
}

@Injectable()
export class Modelo347Service {
  private readonly logger = new Logger(Modelo347Service.name);
  private readonly THRESHOLD = new Decimal(3005.01); // Minimum threshold for declaration

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate Modelo 347 data for a fiscal year
   * Detects all operations with third parties exceeding 3,005.01€
   */
  async calculateModelo347(
    companyId: string,
    fiscalYear: number,
  ): Promise<Modelo347Data> {
    this.logger.log(
      `Calculating Modelo 347 for company ${companyId}, year ${fiscalYear}`,
    );

    // Get company data
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
    });

    // Get all invoices for the fiscal year
    const startDate = new Date(fiscalYear, 0, 1); // Jan 1
    const endDate = new Date(fiscalYear, 11, 31, 23, 59, 59); // Dec 31

    const invoices = await this.prisma.invoice.findMany({
      where: {
        companyId,
        issueDate: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ['SENT', 'PAID', 'OVERDUE'], // Only final invoices
        },
        // Exclude intra-community and export (different tax regime)
        counterpartyCountry: 'ES',
      },
      include: {
        contact: true,
        taxes: true,
      },
      orderBy: {
        issueDate: 'asc',
      },
    });

    this.logger.log(`Found ${invoices.length} invoices for fiscal year ${fiscalYear}`);

    // Group by contact and aggregate
    const operationsByContact = new Map<string, Modelo347Operation>();

    for (const invoice of invoices) {
      const contactKey = invoice.contactId || 'UNKNOWN';

      if (!operationsByContact.has(contactKey)) {
        operationsByContact.set(contactKey, {
          contactId: contactKey,
          contactName: invoice.counterpartyName,
          contactTaxId: invoice.counterpartyTaxId || '',
          totalAmount: new Decimal(0),
          invoiceCount: 0,
          quarterBreakdown: {
            Q1: new Decimal(0),
            Q2: new Decimal(0),
            Q3: new Decimal(0),
            Q4: new Decimal(0),
          },
          cashOperations: new Decimal(0),
          realEstateOperations: new Decimal(0),
        });
      }

      const operation = operationsByContact.get(contactKey)!;

      // Add to total
      const invoiceTotal = new Decimal(invoice.total.toString());
      operation.totalAmount = operation.totalAmount.plus(invoiceTotal);
      operation.invoiceCount++;

      // Quarter breakdown
      const quarter = this.getQuarter(invoice.issueDate);
      operation.quarterBreakdown[quarter] = operation.quarterBreakdown[quarter].plus(invoiceTotal);

      // Cash/crypto operations >6,000€ (special reporting)
      if (
        (invoice.paymentMethod === 'CASH' || invoice.cryptoPayment) &&
        invoiceTotal.greaterThan(6000)
      ) {
        operation.cashOperations = operation.cashOperations.plus(invoiceTotal);
      }
    }

    // Filter operations above threshold
    const operations = Array.from(operationsByContact.values()).filter((op) =>
      op.totalAmount.greaterThanOrEqualTo(this.THRESHOLD),
    );

    this.logger.log(
      `Found ${operations.length} operations exceeding threshold of ${this.THRESHOLD}€`,
    );

    // Calculate totals
    const totalDeclared = operations.reduce(
      (sum, op) => sum.plus(op.totalAmount),
      new Decimal(0),
    );

    return {
      companyId,
      fiscalYear,
      declarantNif: company.taxId,
      declarantName: company.name,
      operations: operations.sort((a, b) =>
        a.totalAmount.lessThan(b.totalAmount) ? 1 : -1,
      ), // Descending order
      totalDeclared,
      operationCount: operations.length,
    };
  }

  /**
   * Generate XML file for AEAT submission (Modelo 347 format)
   */
  async generateXML(companyId: string, fiscalYear: number): Promise<string> {
    const data = await this.calculateModelo347(companyId, fiscalYear);

    this.logger.log(
      `Generating Modelo 347 XML for ${data.declarantName} (${data.declarantNif}), year ${fiscalYear}`,
    );

    // Build XML according to AEAT schema
    const doc = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('T347', {
        xmlns: 'http://www.aeat.es/esquemas/declaraciones/Modelo347/v1_0',
      })
      .ele('Cabecera')
      .ele('ModeloPresentacion').txt('347').up()
      .ele('Ejercicio').txt(fiscalYear.toString()).up()
      .ele('NIF').txt(data.declarantNif).up()
      .ele('NombreRazon').txt(data.declarantName).up()
      .up() // Close Cabecera
      .ele('OperacionesDetalladas');

    // Add each operation
    for (let i = 0; i < data.operations.length; i++) {
      const op = data.operations[i];

      doc
        .ele('Operacion')
        .ele('NumeroOperacion').txt((i + 1).toString()).up()
        .ele('NIF').txt(op.contactTaxId).up()
        .ele('NombreRazon').txt(op.contactName).up()
        .ele('ImporteAnual').txt(this.formatAmount(op.totalAmount)).up()
        .ele('ClaveOperacion').txt('A').up() // A = Adquisiciones/Entregas
        .ele('NumeroFacturas').txt(op.invoiceCount.toString()).up()
        .ele('ImporteTrimestre1').txt(this.formatAmount(op.quarterBreakdown.Q1)).up()
        .ele('ImporteTrimestre2').txt(this.formatAmount(op.quarterBreakdown.Q2)).up()
        .ele('ImporteTrimestre3').txt(this.formatAmount(op.quarterBreakdown.Q3)).up()
        .ele('ImporteTrimestre4').txt(this.formatAmount(op.quarterBreakdown.Q4)).up();

      // Add cash operations if any
      if (op.cashOperations.greaterThan(0)) {
        doc.ele('OperacionesCobrosMetalico').txt('S').up();
        doc.ele('ImporteCobrosMetalico').txt(this.formatAmount(op.cashOperations)).up();
      }

      doc.up(); // Close Operacion
    }

    doc.up(); // Close OperacionesDetalladas

    // Add summary
    doc
      .ele('Resumen')
      .ele('TotalOperaciones').txt(data.operationCount.toString()).up()
      .ele('ImporteTotal').txt(this.formatAmount(data.totalDeclared)).up()
      .up(); // Close Resumen

    const xml = doc.end({ prettyPrint: true });

    this.logger.log(
      `Generated Modelo 347 XML: ${data.operationCount} operations, total ${this.formatAmount(data.totalDeclared)}€`,
    );

    return xml;
  }

  /**
   * Generate CSV export for accounting software
   */
  async generateCSV(companyId: string, fiscalYear: number): Promise<string> {
    const data = await this.calculateModelo347(companyId, fiscalYear);

    const headers = [
      'NIF/CIF',
      'Nombre/Razón Social',
      'Importe Total',
      'Nº Facturas',
      'T1',
      'T2',
      'T3',
      'T4',
      'Cobros Metálico',
    ];

    const rows = data.operations.map((op) => [
      op.contactTaxId,
      op.contactName,
      this.formatAmount(op.totalAmount),
      op.invoiceCount.toString(),
      this.formatAmount(op.quarterBreakdown.Q1),
      this.formatAmount(op.quarterBreakdown.Q2),
      this.formatAmount(op.quarterBreakdown.Q3),
      this.formatAmount(op.quarterBreakdown.Q4),
      this.formatAmount(op.cashOperations),
    ]);

    const csv = [
      headers.join(';'),
      ...rows.map((row) => row.join(';')),
      '', // Empty line
      `TOTAL;${data.operationCount} operaciones;${this.formatAmount(data.totalDeclared)}€`,
    ].join('\n');

    return csv;
  }

  /**
   * Get fiscal quarter from date (Q1, Q2, Q3, Q4)
   */
  private getQuarter(date: Date): 'Q1' | 'Q2' | 'Q3' | 'Q4' {
    const month = date.getMonth() + 1;
    if (month <= 3) return 'Q1';
    if (month <= 6) return 'Q2';
    if (month <= 9) return 'Q3';
    return 'Q4';
  }

  /**
   * Format amount to string with 2 decimals (AEAT format)
   */
  private formatAmount(amount: Decimal): string {
    return amount.toFixed(2);
  }
}
