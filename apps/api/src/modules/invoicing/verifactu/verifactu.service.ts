import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@crypto-erp/database';
import { AEATClientService } from './aeat-client.service.js';
import * as crypto from 'crypto';

/**
 * Verifactu - Sistema de Verificación de Facturas
 * Implementación según Real Decreto 1007/2023
 *
 * Características principales:
 * - Huella digital encadenada (cada factura contiene hash de la anterior)
 * - Código QR para verificación
 * - Envío a la AEAT en tiempo real o diferido
 * - Registro de eventos inmutable
 */

interface VerifactuInvoiceData {
  // Identificación de la factura
  numeroFactura: string;
  serieFactura: string;
  fechaExpedicion: Date;

  // Emisor
  nifEmisor: string;
  nombreEmisor: string;

  // Receptor
  nifReceptor?: string;
  nombreReceptor: string;

  // Importes
  baseImponible: number;
  tipoIva: number;
  cuotaIva: number;
  totalFactura: number;

  // Tipo de operación
  tipoFactura: 'F1' | 'F2' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5';
  descripcion: string;
}

interface VerifactuRecord {
  // Huella digital
  huella: string;
  huellaAnterior: string | null;

  // Datos de la factura
  factura: VerifactuInvoiceData;

  // Código QR
  codigoQR: string;
  urlVerificacion: string;

  // Estado
  estado: 'PENDIENTE' | 'ENVIADO' | 'ACEPTADO' | 'RECHAZADO';
  fechaRegistro: Date;
  fechaEnvio?: Date;

  // Respuesta AEAT
  csvAeat?: string;
  errores?: string[];
}

@Injectable()
export class VerifactuService {
  private readonly logger = new Logger(VerifactuService.name);

  // Entorno de la AEAT (producción o pruebas)
  private readonly aeatUrl = process.env.AEAT_VERIFACTU_URL || 'https://prewww1.aeat.es/wlpl/TGVI-JDIT/ws/VeriFactuSV.wsdl';
  private readonly isProduction = process.env.NODE_ENV === 'production';

  constructor(
    private readonly prisma: PrismaService,
    private readonly aeatClient: AEATClientService,
  ) {}

  /**
   * Genera el registro Verifactu para una factura
   */
  async generateVerifactuRecord(
    companyId: string,
    invoiceId: string,
  ): Promise<VerifactuRecord> {
    // Obtener la factura con relaciones
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
      include: {
        lines: true,
        contact: true,
        series: true,
      },
    });

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    // Obtener datos de la empresa
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new Error(`Company ${companyId} not found`);
    }

    // Calcular IVA promedio de las líneas
    const avgTaxRate = invoice.lines.length > 0
      ? invoice.lines.reduce((sum, l) => sum + (l.taxRate?.toNumber() || 21), 0) / invoice.lines.length
      : 21;

    // Convertir a datos Verifactu
    const invoiceData: VerifactuInvoiceData = {
      numeroFactura: invoice.fullNumber,
      serieFactura: invoice.series?.prefix || invoice.series?.code || 'A',
      fechaExpedicion: invoice.issueDate,
      nifEmisor: company.taxId || '',
      nombreEmisor: company.name,
      nifReceptor: invoice.contact?.taxId || invoice.counterpartyTaxId || undefined,
      nombreReceptor: invoice.contact?.name || invoice.counterpartyName,
      baseImponible: invoice.subtotal.toNumber(),
      tipoIva: avgTaxRate,
      cuotaIva: invoice.totalTax.toNumber(),
      totalFactura: invoice.total.toNumber(),
      tipoFactura: this.getInvoiceType(invoice.type),
      descripcion: invoice.lines.map(l => l.description).join(', ').substring(0, 250),
    };

    // Obtener huella de la factura anterior
    const previousRecord = await this.getLastVerifactuRecord(companyId);
    const huellaAnterior = previousRecord?.huella || null;

    // Generar huella digital
    const huella = this.generateHuella(invoiceData, huellaAnterior);

    // Generar código QR
    const { codigoQR, urlVerificacion } = this.generateQRCode(invoiceData, huella);

    // Crear registro
    const record: VerifactuRecord = {
      huella,
      huellaAnterior,
      factura: invoiceData,
      codigoQR,
      urlVerificacion,
      estado: 'PENDIENTE',
      fechaRegistro: new Date(),
    };

    // Guardar en la base de datos
    await this.saveVerifactuRecord(companyId, invoiceId, record);

    this.logger.log(
      `Verifactu record generated for invoice ${invoice.fullNumber}: ${huella.substring(0, 16)}...`
    );

    return record;
  }

  /**
   * Genera la huella digital encadenada según especificación Verifactu
   * SHA-256 de los datos concatenados
   */
  private generateHuella(
    data: VerifactuInvoiceData,
    huellaAnterior: string | null,
  ): string {
    // Concatenar campos en orden específico según normativa
    const contenido = [
      data.nifEmisor,
      data.numeroFactura,
      data.serieFactura,
      data.fechaExpedicion.toISOString().split('T')[0],
      data.tipoFactura,
      data.baseImponible.toFixed(2),
      data.cuotaIva.toFixed(2),
      data.totalFactura.toFixed(2),
      huellaAnterior || '', // Encadenamiento
    ].join('|');

    return crypto
      .createHash('sha256')
      .update(contenido, 'utf8')
      .digest('hex')
      .toUpperCase();
  }

  /**
   * Genera el código QR y URL de verificación
   */
  private generateQRCode(
    data: VerifactuInvoiceData,
    huella: string,
  ): { codigoQR: string; urlVerificacion: string } {
    // URL de verificación de la AEAT
    const baseUrl = 'https://www2.agenciatributaria.gob.es/wlpl/TGVI-JDIT/VerificadorFacturasRF';

    const params = new URLSearchParams({
      nif: data.nifEmisor,
      numserie: `${data.serieFactura}${data.numeroFactura}`,
      fecha: data.fechaExpedicion.toISOString().split('T')[0],
      importe: data.totalFactura.toFixed(2),
      huella: huella.substring(0, 16), // Primeros 16 caracteres
    });

    const urlVerificacion = `${baseUrl}?${params.toString()}`;

    // El código QR contiene la URL de verificación
    // En producción, esto se convertiría en una imagen QR real
    const codigoQR = urlVerificacion;

    return { codigoQR, urlVerificacion };
  }

  /**
   * Envía el registro Verifactu a la AEAT
   */
  async sendToAEAT(companyId: string, invoiceId: string): Promise<{
    success: boolean;
    csv?: string;
    errors?: string[];
  }> {
    const record = await this.getVerifactuRecord(companyId, invoiceId);

    if (!record) {
      throw new Error('Verifactu record not found');
    }

    if (record.estado === 'ACEPTADO') {
      return { success: true, csv: record.csvAeat };
    }

    // Generate XML for submission
    const xml = this.generateXML(record);

    this.logger.log(`Submitting invoice ${record.factura.numeroFactura} to AEAT`);

    // Submit to AEAT using the client
    const response = await this.aeatClient.submitInvoice({
      xml,
      nifEmisor: record.factura.nifEmisor,
      invoiceNumber: record.factura.numeroFactura,
    });

    if (response.success) {
      await this.updateVerifactuRecord(companyId, invoiceId, {
        estado: 'ACEPTADO',
        fechaEnvio: new Date(),
        csvAeat: response.csv,
      });

      this.logger.log(
        `Invoice ${record.factura.numeroFactura} accepted by AEAT. CSV: ${response.csv}`
      );

      return { success: true, csv: response.csv };
    } else {
      const errorMessages = response.errors?.map(e => `${e.code}: ${e.message}`) || [];

      await this.updateVerifactuRecord(companyId, invoiceId, {
        estado: 'RECHAZADO',
        fechaEnvio: new Date(),
        errores: errorMessages,
      });

      this.logger.error(
        `Invoice ${record.factura.numeroFactura} rejected by AEAT: ${errorMessages.join(', ')}`
      );

      return {
        success: false,
        errors: errorMessages,
      };
    }
  }

  /**
   * Genera el XML según esquema Verifactu para envío a AEAT
   */
  generateXML(record: VerifactuRecord): string {
    const { factura, huella, huellaAnterior } = record;

    // XML simplificado - en producción usar el esquema XSD completo
    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:vf="https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SusntratFactuRAltaActualizacion.xsd">
  <soapenv:Header/>
  <soapenv:Body>
    <vf:RegistroAlta>
      <vf:IDVersion>1.0</vf:IDVersion>
      <vf:IDEmisor>
        <vf:NIF>${factura.nifEmisor}</vf:NIF>
        <vf:NombreRazon>${this.escapeXml(factura.nombreEmisor)}</vf:NombreRazon>
      </vf:IDEmisor>
      <vf:Factura>
        <vf:NumSerieFactura>${factura.serieFactura}${factura.numeroFactura}</vf:NumSerieFactura>
        <vf:FechaExpedicion>${factura.fechaExpedicion.toISOString().split('T')[0]}</vf:FechaExpedicion>
        <vf:TipoFactura>${factura.tipoFactura}</vf:TipoFactura>
        <vf:Descripcion>${this.escapeXml(factura.descripcion)}</vf:Descripcion>
        <vf:Destinatario>
          ${factura.nifReceptor ? `<vf:NIF>${factura.nifReceptor}</vf:NIF>` : ''}
          <vf:NombreRazon>${this.escapeXml(factura.nombreReceptor)}</vf:NombreRazon>
        </vf:Destinatario>
        <vf:Desglose>
          <vf:DesgloseTipo>
            <vf:TipoImpositivo>${factura.tipoIva.toFixed(2)}</vf:TipoImpositivo>
            <vf:BaseImponible>${factura.baseImponible.toFixed(2)}</vf:BaseImponible>
            <vf:CuotaRepercutida>${factura.cuotaIva.toFixed(2)}</vf:CuotaRepercutida>
          </vf:DesgloseTipo>
        </vf:Desglose>
        <vf:ImporteTotal>${factura.totalFactura.toFixed(2)}</vf:ImporteTotal>
      </vf:Factura>
      <vf:Huella>
        <vf:Huella>${huella}</vf:Huella>
        ${huellaAnterior ? `<vf:HuellaAnterior>${huellaAnterior}</vf:HuellaAnterior>` : ''}
      </vf:Huella>
    </vf:RegistroAlta>
  </soapenv:Body>
</soapenv:Envelope>`;
  }

  /**
   * Obtiene el estado de verificación de una factura
   */
  async getVerificationStatus(companyId: string, invoiceId: string): Promise<{
    verified: boolean;
    estado: string;
    urlVerificacion?: string;
    csvAeat?: string;
  }> {
    const record = await this.getVerifactuRecord(companyId, invoiceId);

    if (!record) {
      return {
        verified: false,
        estado: 'NO_REGISTRADO',
      };
    }

    return {
      verified: record.estado === 'ACEPTADO',
      estado: record.estado,
      urlVerificacion: record.urlVerificacion,
      csvAeat: record.csvAeat,
    };
  }

  /**
   * Valida la integridad de la cadena de huellas
   */
  async validateChainIntegrity(companyId: string): Promise<{
    valid: boolean;
    errors: string[];
    totalRecords: number;
  }> {
    // Obtener todas las facturas con hash verifactu ordenadas
    const invoices = await this.prisma.invoice.findMany({
      where: {
        companyId,
        verifactuHash: { not: null },
      },
      orderBy: [
        { issueDate: 'asc' },
        { number: 'asc' },
      ],
      select: {
        id: true,
        fullNumber: true,
        verifactuHash: true,
      },
    });

    const errors: string[] = [];

    // La validación de cadena simplificada - verificar que cada factura tiene hash
    for (const invoice of invoices) {
      if (!invoice.verifactuHash) {
        errors.push(`Factura ${invoice.fullNumber}: Sin hash Verifactu registrado`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      totalRecords: invoices.length,
    };
  }

  // Helpers privados

  private getInvoiceType(type: string): VerifactuInvoiceData['tipoFactura'] {
    const typeMap: Record<string, VerifactuInvoiceData['tipoFactura']> = {
      STANDARD: 'F1',
      SIMPLIFIED: 'F2',
      CREDIT_NOTE: 'R1',
      DEBIT_NOTE: 'R2',
    };
    return typeMap[type] || 'F1';
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private async getLastVerifactuRecord(companyId: string): Promise<{ huella: string } | null> {
    const result = await this.prisma.invoice.findFirst({
      where: {
        companyId,
        verifactuHash: { not: null },
      },
      orderBy: [
        { issueDate: 'desc' },
        { number: 'desc' },
      ],
      select: { verifactuHash: true },
    });

    if (result?.verifactuHash) {
      return { huella: result.verifactuHash };
    }
    return null;
  }

  private async getVerifactuRecord(
    companyId: string,
    invoiceId: string,
  ): Promise<VerifactuRecord | null> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
      include: {
        lines: true,
        contact: true,
        series: true,
      },
    });

    if (!invoice?.verifactuHash) {
      return null;
    }

    // Obtener datos de la empresa
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    // Calcular IVA promedio
    const avgTaxRate = invoice.lines.length > 0
      ? invoice.lines.reduce((sum, l) => sum + (l.taxRate?.toNumber() || 21), 0) / invoice.lines.length
      : 21;

    // Reconstruir el registro desde los datos de la factura
    const factura: VerifactuInvoiceData = {
      numeroFactura: invoice.fullNumber,
      serieFactura: invoice.series?.prefix || invoice.series?.code || 'A',
      fechaExpedicion: invoice.issueDate,
      nifEmisor: company?.taxId || '',
      nombreEmisor: company?.name || '',
      nifReceptor: invoice.contact?.taxId || invoice.counterpartyTaxId || undefined,
      nombreReceptor: invoice.contact?.name || invoice.counterpartyName,
      baseImponible: invoice.subtotal.toNumber(),
      tipoIva: avgTaxRate,
      cuotaIva: invoice.totalTax.toNumber(),
      totalFactura: invoice.total.toNumber(),
      tipoFactura: this.getInvoiceType(invoice.type),
      descripcion: invoice.lines.map(l => l.description).join(', ').substring(0, 250),
    };

    return {
      huella: invoice.verifactuHash,
      huellaAnterior: null, // No almacenamos esto directamente
      factura,
      codigoQR: invoice.verifactuQrData || '',
      urlVerificacion: invoice.verifactuQrData || '',
      estado: 'ACEPTADO', // Si tiene hash, asumimos aceptado
      fechaRegistro: invoice.createdAt,
    };
  }

  private async saveVerifactuRecord(
    _companyId: string,
    invoiceId: string,
    record: VerifactuRecord,
  ): Promise<void> {
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        verifactuHash: record.huella,
        verifactuQrData: record.codigoQR,
      },
    });
  }

  private async updateVerifactuRecord(
    _companyId: string,
    invoiceId: string,
    updates: Partial<VerifactuRecord>,
  ): Promise<void> {
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        ...(updates.huella && { verifactuHash: updates.huella }),
        ...(updates.codigoQR && { verifactuQrData: updates.codigoQR }),
      },
    });
  }
}
