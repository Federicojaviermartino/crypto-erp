import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@crypto-erp/database';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import { Readable } from 'stream';

interface InvoiceForPDF {
  id: string;
  invoiceNumber: string;
  type: string;
  direction: string;
  date: Date;
  dueDate: Date | null;
  status: string;
  subtotal: { toNumber: () => number };
  vatAmount: { toNumber: () => number };
  totalAmount: { toNumber: () => number };
  notes: string | null;
  verifactuHash: string | null;
  metadata: Record<string, unknown> | null;
  lines: Array<{
    lineNumber: number;
    description: string;
    quantity: { toNumber: () => number };
    unitPrice: { toNumber: () => number };
    vatRate: { toNumber: () => number };
    discountPercent: { toNumber: () => number };
    lineTotal: { toNumber: () => number };
  }>;
  contact: {
    id: string;
    name: string;
    taxId: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    postalCode: string | null;
    country: string | null;
  };
  company: {
    id: string;
    name: string;
    taxId: string;
    address: string | null;
    city: string | null;
    postalCode: string | null;
    country: string | null;
    phone: string | null;
    email: string | null;
  };
  series: {
    prefix: string;
    name: string;
  } | null;
}

interface PDFOptions {
  language?: 'es' | 'en';
  includeQR?: boolean;
  includeLogo?: boolean;
  logoPath?: string;
}

const TRANSLATIONS = {
  es: {
    invoice: 'FACTURA',
    simplifiedInvoice: 'FACTURA SIMPLIFICADA',
    creditNote: 'FACTURA RECTIFICATIVA',
    invoiceNumber: 'N\u00ba Factura',
    date: 'Fecha',
    dueDate: 'Vencimiento',
    from: 'De',
    to: 'Para',
    taxId: 'NIF/CIF',
    description: 'Descripci\u00f3n',
    quantity: 'Cant.',
    unitPrice: 'Precio',
    vatRate: 'IVA %',
    discount: 'Dto.',
    lineTotal: 'Total',
    subtotal: 'Base Imponible',
    vatAmount: 'IVA',
    total: 'TOTAL',
    notes: 'Notas',
    paymentTerms: 'Condiciones de pago',
    verifactuFooter: 'Factura verificable en la AEAT',
    verifactuHash: 'Huella Verifactu',
    page: 'P\u00e1gina',
    of: 'de',
    status: {
      DRAFT: 'Borrador',
      ISSUED: 'Emitida',
      SENT: 'Enviada',
      PAID: 'Pagada',
      CANCELLED: 'Anulada',
    },
  },
  en: {
    invoice: 'INVOICE',
    simplifiedInvoice: 'SIMPLIFIED INVOICE',
    creditNote: 'CREDIT NOTE',
    invoiceNumber: 'Invoice No.',
    date: 'Date',
    dueDate: 'Due Date',
    from: 'From',
    to: 'To',
    taxId: 'Tax ID',
    description: 'Description',
    quantity: 'Qty',
    unitPrice: 'Price',
    vatRate: 'VAT %',
    discount: 'Disc.',
    lineTotal: 'Total',
    subtotal: 'Subtotal',
    vatAmount: 'VAT',
    total: 'TOTAL',
    notes: 'Notes',
    paymentTerms: 'Payment Terms',
    verifactuFooter: 'Invoice verifiable at AEAT',
    verifactuHash: 'Verifactu Hash',
    page: 'Page',
    of: 'of',
    status: {
      DRAFT: 'Draft',
      ISSUED: 'Issued',
      SENT: 'Sent',
      PAID: 'Paid',
      CANCELLED: 'Cancelled',
    },
  },
};

@Injectable()
export class InvoicePdfService {
  private readonly logger = new Logger(InvoicePdfService.name);

  // Colors
  private readonly PRIMARY_COLOR = '#1a365d';
  private readonly SECONDARY_COLOR = '#4a5568';
  private readonly ACCENT_COLOR = '#3182ce';
  private readonly LIGHT_GRAY = '#e2e8f0';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Genera el PDF de una factura
   */
  async generatePdf(
    companyId: string,
    invoiceId: string,
    options: PDFOptions = {},
  ): Promise<Buffer> {
    const invoice = await this.getInvoiceData(companyId, invoiceId);
    const lang = options.language || 'es';
    const t = TRANSLATIONS[lang];

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `${t.invoice} ${invoice.invoiceNumber}`,
          Author: invoice.company.name,
          Subject: `${t.invoice} para ${invoice.contact.name}`,
          Creator: 'Crypto ERP - Sistema de Facturaci\u00f3n',
        },
      });

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Generate PDF content
      this.renderPdf(doc, invoice, t, options);

      doc.end();
    });
  }

  /**
   * Genera el PDF como stream
   */
  async generatePdfStream(
    companyId: string,
    invoiceId: string,
    options: PDFOptions = {},
  ): Promise<Readable> {
    const invoice = await this.getInvoiceData(companyId, invoiceId);
    const lang = options.language || 'es';
    const t = TRANSLATIONS[lang];

    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
    });

    // Render in next tick to allow stream to be returned
    setImmediate(() => {
      this.renderPdf(doc, invoice, t, options);
      doc.end();
    });

    return doc as unknown as Readable;
  }

  /**
   * Obtiene los datos de la factura para el PDF
   */
  private async getInvoiceData(companyId: string, invoiceId: string): Promise<InvoiceForPDF> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
      include: {
        lines: {
          orderBy: { lineNumber: 'asc' },
        },
        contact: true,
        company: true,
        series: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    return invoice as unknown as InvoiceForPDF;
  }

  /**
   * Renderiza el contenido del PDF
   */
  private async renderPdf(
    doc: PDFKit.PDFDocument,
    invoice: InvoiceForPDF,
    t: typeof TRANSLATIONS['es'],
    options: PDFOptions,
  ): Promise<void> {
    const pageWidth = doc.page.width - 100; // 50px margin on each side

    // Header
    this.renderHeader(doc, invoice, t, pageWidth);

    // Company and client info
    this.renderParties(doc, invoice, t);

    // Line items table
    this.renderLineItems(doc, invoice, t, pageWidth);

    // Totals
    this.renderTotals(doc, invoice, t);

    // Notes
    if (invoice.notes) {
      this.renderNotes(doc, invoice, t);
    }

    // Verifactu footer with QR
    if (invoice.verifactuHash || invoice.metadata?.huella) {
      await this.renderVerifactuFooter(doc, invoice, t, options.includeQR !== false);
    }

    // Page numbers
    this.addPageNumbers(doc, t);
  }

  /**
   * Renderiza el encabezado
   */
  private renderHeader(
    doc: PDFKit.PDFDocument,
    invoice: InvoiceForPDF,
    t: typeof TRANSLATIONS['es'],
    pageWidth: number,
  ): void {
    const startY = doc.y;

    // Invoice type title
    let title = t.invoice;
    if (invoice.type === 'SIMPLIFIED') title = t.simplifiedInvoice;
    if (invoice.type === 'CREDIT_NOTE') title = t.creditNote;

    doc
      .fillColor(this.PRIMARY_COLOR)
      .fontSize(24)
      .font('Helvetica-Bold')
      .text(title, 50, startY);

    // Invoice number and dates on the right
    const rightColumnX = 350;

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor(this.SECONDARY_COLOR)
      .text(`${t.invoiceNumber}:`, rightColumnX, startY)
      .font('Helvetica-Bold')
      .fillColor(this.PRIMARY_COLOR)
      .text(invoice.invoiceNumber, rightColumnX + 80, startY);

    doc
      .font('Helvetica')
      .fillColor(this.SECONDARY_COLOR)
      .text(`${t.date}:`, rightColumnX, startY + 15)
      .fillColor(this.PRIMARY_COLOR)
      .text(this.formatDate(invoice.date), rightColumnX + 80, startY + 15);

    if (invoice.dueDate) {
      doc
        .fillColor(this.SECONDARY_COLOR)
        .text(`${t.dueDate}:`, rightColumnX, startY + 30)
        .fillColor(this.PRIMARY_COLOR)
        .text(this.formatDate(invoice.dueDate), rightColumnX + 80, startY + 30);
    }

    // Status badge
    const statusText = t.status[invoice.status as keyof typeof t.status] || invoice.status;
    const statusColor = this.getStatusColor(invoice.status);

    doc
      .roundedRect(rightColumnX, startY + 50, 100, 20, 3)
      .fill(statusColor);

    doc
      .fillColor('#ffffff')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(statusText, rightColumnX + 10, startY + 55, { width: 80, align: 'center' });

    doc.moveDown(4);
  }

  /**
   * Renderiza la informaci\u00f3n de emisor y receptor
   */
  private renderParties(
    doc: PDFKit.PDFDocument,
    invoice: InvoiceForPDF,
    t: typeof TRANSLATIONS['es'],
  ): void {
    const startY = doc.y;
    const leftColumnX = 50;
    const rightColumnX = 320;

    // From (Company)
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor(this.ACCENT_COLOR)
      .text(t.from, leftColumnX, startY);

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor(this.PRIMARY_COLOR)
      .text(invoice.company.name, leftColumnX, startY + 15);

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(this.SECONDARY_COLOR);

    let companyY = startY + 30;
    doc.text(`${t.taxId}: ${invoice.company.taxId}`, leftColumnX, companyY);
    companyY += 12;

    if (invoice.company.address) {
      doc.text(invoice.company.address, leftColumnX, companyY);
      companyY += 12;
    }

    if (invoice.company.postalCode || invoice.company.city) {
      doc.text(
        `${invoice.company.postalCode || ''} ${invoice.company.city || ''}`.trim(),
        leftColumnX,
        companyY,
      );
      companyY += 12;
    }

    if (invoice.company.email) {
      doc.text(invoice.company.email, leftColumnX, companyY);
    }

    // To (Contact)
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor(this.ACCENT_COLOR)
      .text(t.to, rightColumnX, startY);

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor(this.PRIMARY_COLOR)
      .text(invoice.contact.name, rightColumnX, startY + 15);

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(this.SECONDARY_COLOR);

    let contactY = startY + 30;

    if (invoice.contact.taxId) {
      doc.text(`${t.taxId}: ${invoice.contact.taxId}`, rightColumnX, contactY);
      contactY += 12;
    }

    if (invoice.contact.address) {
      doc.text(invoice.contact.address, rightColumnX, contactY);
      contactY += 12;
    }

    if (invoice.contact.postalCode || invoice.contact.city) {
      doc.text(
        `${invoice.contact.postalCode || ''} ${invoice.contact.city || ''}`.trim(),
        rightColumnX,
        contactY,
      );
      contactY += 12;
    }

    if (invoice.contact.email) {
      doc.text(invoice.contact.email, rightColumnX, contactY);
    }

    doc.y = Math.max(companyY, contactY) + 30;
  }

  /**
   * Renderiza la tabla de l\u00edneas
   */
  private renderLineItems(
    doc: PDFKit.PDFDocument,
    invoice: InvoiceForPDF,
    t: typeof TRANSLATIONS['es'],
    pageWidth: number,
  ): void {
    const startY = doc.y;
    const tableTop = startY + 10;

    // Column widths
    const cols = {
      description: { x: 50, width: 200 },
      quantity: { x: 255, width: 50 },
      unitPrice: { x: 310, width: 70 },
      vatRate: { x: 385, width: 45 },
      discount: { x: 435, width: 45 },
      total: { x: 485, width: 70 },
    };

    // Table header
    doc
      .rect(50, tableTop, pageWidth, 20)
      .fill(this.PRIMARY_COLOR);

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#ffffff');

    doc.text(t.description, cols.description.x + 5, tableTop + 6);
    doc.text(t.quantity, cols.quantity.x, tableTop + 6, { width: cols.quantity.width, align: 'right' });
    doc.text(t.unitPrice, cols.unitPrice.x, tableTop + 6, { width: cols.unitPrice.width, align: 'right' });
    doc.text(t.vatRate, cols.vatRate.x, tableTop + 6, { width: cols.vatRate.width, align: 'right' });
    doc.text(t.discount, cols.discount.x, tableTop + 6, { width: cols.discount.width, align: 'right' });
    doc.text(t.lineTotal, cols.total.x, tableTop + 6, { width: cols.total.width, align: 'right' });

    // Table rows
    let rowY = tableTop + 25;

    invoice.lines.forEach((line, index) => {
      // Alternate row background
      if (index % 2 === 0) {
        doc.rect(50, rowY - 3, pageWidth, 18).fill('#f7fafc');
      }

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(this.SECONDARY_COLOR);

      // Description (may need word wrap)
      const description = line.description.length > 40
        ? line.description.substring(0, 40) + '...'
        : line.description;

      doc.text(description, cols.description.x + 5, rowY);
      doc.text(
        line.quantity.toNumber().toString(),
        cols.quantity.x,
        rowY,
        { width: cols.quantity.width, align: 'right' },
      );
      doc.text(
        this.formatCurrency(line.unitPrice.toNumber()),
        cols.unitPrice.x,
        rowY,
        { width: cols.unitPrice.width, align: 'right' },
      );
      doc.text(
        `${line.vatRate.toNumber()}%`,
        cols.vatRate.x,
        rowY,
        { width: cols.vatRate.width, align: 'right' },
      );
      doc.text(
        line.discountPercent.toNumber() > 0 ? `${line.discountPercent.toNumber()}%` : '-',
        cols.discount.x,
        rowY,
        { width: cols.discount.width, align: 'right' },
      );
      doc.text(
        this.formatCurrency(line.lineTotal.toNumber()),
        cols.total.x,
        rowY,
        { width: cols.total.width, align: 'right' },
      );

      rowY += 18;

      // Check if we need a new page
      if (rowY > doc.page.height - 200) {
        doc.addPage();
        rowY = 50;
      }
    });

    // Table bottom border
    doc
      .moveTo(50, rowY + 5)
      .lineTo(50 + pageWidth, rowY + 5)
      .stroke(this.LIGHT_GRAY);

    doc.y = rowY + 20;
  }

  /**
   * Renderiza los totales
   */
  private renderTotals(
    doc: PDFKit.PDFDocument,
    invoice: InvoiceForPDF,
    t: typeof TRANSLATIONS['es'],
  ): void {
    const startY = doc.y;
    const rightX = 400;
    const valueX = 500;

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor(this.SECONDARY_COLOR);

    // Subtotal
    doc.text(t.subtotal, rightX, startY);
    doc.text(
      this.formatCurrency(invoice.subtotal.toNumber()),
      valueX,
      startY,
      { width: 55, align: 'right' },
    );

    // VAT
    doc.text(t.vatAmount, rightX, startY + 18);
    doc.text(
      this.formatCurrency(invoice.vatAmount.toNumber()),
      valueX,
      startY + 18,
      { width: 55, align: 'right' },
    );

    // Total line
    doc
      .moveTo(rightX, startY + 38)
      .lineTo(555, startY + 38)
      .stroke(this.PRIMARY_COLOR);

    // Total
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor(this.PRIMARY_COLOR)
      .text(t.total, rightX, startY + 45);

    doc.text(
      this.formatCurrency(invoice.totalAmount.toNumber()),
      valueX,
      startY + 45,
      { width: 55, align: 'right' },
    );

    doc.y = startY + 80;
  }

  /**
   * Renderiza las notas
   */
  private renderNotes(
    doc: PDFKit.PDFDocument,
    invoice: InvoiceForPDF,
    t: typeof TRANSLATIONS['es'],
  ): void {
    const startY = doc.y;

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor(this.SECONDARY_COLOR)
      .text(t.notes, 50, startY);

    doc
      .fontSize(9)
      .font('Helvetica')
      .text(invoice.notes!, 50, startY + 15, { width: 400 });

    doc.moveDown(2);
  }

  /**
   * Renderiza el footer con Verifactu
   */
  private async renderVerifactuFooter(
    doc: PDFKit.PDFDocument,
    invoice: InvoiceForPDF,
    t: typeof TRANSLATIONS['es'],
    includeQR: boolean,
  ): Promise<void> {
    const footerY = doc.page.height - 120;
    const hash = (invoice.verifactuHash || invoice.metadata?.huella) as string;
    const urlVerificacion = invoice.metadata?.urlVerificacion as string;

    // Separator line
    doc
      .moveTo(50, footerY - 10)
      .lineTo(545, footerY - 10)
      .stroke(this.LIGHT_GRAY);

    // Verifactu badge
    doc
      .rect(50, footerY, 100, 20)
      .fill(this.ACCENT_COLOR);

    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .fillColor('#ffffff')
      .text('VERIFACTU', 60, footerY + 6);

    // Hash info
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor(this.SECONDARY_COLOR)
      .text(`${t.verifactuHash}: ${hash.substring(0, 32)}...`, 160, footerY + 6);

    doc
      .fontSize(7)
      .text(t.verifactuFooter, 50, footerY + 30);

    // QR Code
    if (includeQR && urlVerificacion) {
      try {
        const qrDataUrl = await QRCode.toDataURL(urlVerificacion, {
          width: 80,
          margin: 1,
          color: {
            dark: this.PRIMARY_COLOR,
            light: '#ffffff',
          },
        });

        const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
        doc.image(qrBuffer, 480, footerY - 5, { width: 60, height: 60 });
      } catch (error) {
        this.logger.warn(`Failed to generate QR code: ${error}`);
      }
    }
  }

  /**
   * A\u00f1ade n\u00fameros de p\u00e1gina
   */
  private addPageNumbers(doc: PDFKit.PDFDocument, t: typeof TRANSLATIONS['es']): void {
    const pages = doc.bufferedPageRange();

    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);

      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor(this.SECONDARY_COLOR)
        .text(
          `${t.page} ${i + 1} ${t.of} ${pages.count}`,
          50,
          doc.page.height - 30,
          { align: 'center', width: doc.page.width - 100 },
        );
    }
  }

  // Helpers

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  }

  private getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      DRAFT: '#718096',
      ISSUED: '#3182ce',
      SENT: '#38a169',
      PAID: '#2f855a',
      CANCELLED: '#e53e3e',
    };
    return colors[status] || '#718096';
  }
}
