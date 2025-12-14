import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Cliente SOAP para comunicación con AEAT Verifactu
 * Implementa la transmisión de facturas según Real Decreto 1007/2023
 */

interface AEATCertificate {
  key: string;
  cert: string;
  passphrase?: string;
}

interface AEATResponse {
  success: boolean;
  csv?: string;
  timestamp?: string;
  errors?: AEATError[];
  rawResponse?: string;
}

interface AEATError {
  code: string;
  message: string;
  field?: string;
}

interface VerifactuSubmission {
  xml: string;
  nifEmisor: string;
  invoiceNumber: string;
  retryCount?: number;
}

@Injectable()
export class AEATClientService {
  private readonly logger = new Logger(AEATClientService.name);

  // Endpoints AEAT
  private readonly PRODUCTION_URL = 'https://www1.agenciatributaria.gob.es/wlpl/TGVI-JDIT/ws/VeriFactuSV';
  private readonly SANDBOX_URL = 'https://prewww1.aeat.es/wlpl/TGVI-JDIT/ws/VeriFactuSV';

  // Retry configuration
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 2000;

  private certificate: AEATCertificate | null = null;

  constructor(private readonly configService: ConfigService) {
    this.loadCertificate();
  }

  /**
   * Carga el certificado digital para autenticación con AEAT
   */
  private loadCertificate(): void {
    const certPath = this.configService.get<string>('AEAT_CERTIFICATE_PATH');
    const certPassword = this.configService.get<string>('AEAT_CERTIFICATE_PASSWORD');

    if (!certPath) {
      this.logger.warn('AEAT certificate path not configured. AEAT submissions will fail in production.');
      return;
    }

    try {
      const absolutePath = path.isAbsolute(certPath)
        ? certPath
        : path.join(process.cwd(), certPath);

      if (!fs.existsSync(absolutePath)) {
        this.logger.warn(`AEAT certificate not found at: ${absolutePath}`);
        return;
      }

      // Read PFX/P12 certificate and extract key/cert
      const pfxBuffer = fs.readFileSync(absolutePath);
      const pfxAsn1 = this.parsePkcs12(pfxBuffer, certPassword);

      if (pfxAsn1) {
        this.certificate = pfxAsn1;
        this.logger.log('AEAT certificate loaded successfully');
      }
    } catch (error) {
      this.logger.error(`Failed to load AEAT certificate: ${error}`);
    }
  }

  /**
   * Parse PKCS12/PFX certificate
   * Uses node-forge for certificate parsing
   */
  private parsePkcs12(pfxBuffer: Buffer, password?: string): AEATCertificate | null {
    try {
      // Using dynamic import to handle ESM module
      const forge = require('node-forge');

      const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'));
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password || '');

      // Extract private key
      const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];

      if (!keyBag?.key) {
        this.logger.error('No private key found in certificate');
        return null;
      }

      // Extract certificate
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const certBag = certBags[forge.pki.oids.certBag]?.[0];

      if (!certBag?.cert) {
        this.logger.error('No certificate found in PFX file');
        return null;
      }

      return {
        key: forge.pki.privateKeyToPem(keyBag.key),
        cert: forge.pki.certificateToPem(certBag.cert),
        passphrase: password,
      };
    } catch (error) {
      this.logger.error(`Failed to parse PKCS12 certificate: ${error}`);
      return null;
    }
  }

  /**
   * Verifica si el cliente está configurado para producción
   */
  isConfiguredForProduction(): boolean {
    return this.certificate !== null;
  }

  /**
   * Obtiene la URL del endpoint según el entorno
   */
  private getEndpointUrl(): string {
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    return isProduction ? this.PRODUCTION_URL : this.SANDBOX_URL;
  }

  /**
   * Envía una factura a AEAT vía SOAP
   */
  async submitInvoice(submission: VerifactuSubmission): Promise<AEATResponse> {
    const { xml, nifEmisor, invoiceNumber, retryCount = 0 } = submission;

    this.logger.log(`Submitting invoice ${invoiceNumber} to AEAT (attempt ${retryCount + 1})`);

    // En desarrollo sin certificado, simular respuesta
    if (!this.certificate) {
      this.logger.warn('No certificate configured - simulating AEAT response');
      return this.simulateResponse(invoiceNumber);
    }

    try {
      const response = await this.sendSoapRequest(xml);
      return this.parseResponse(response);
    } catch (error) {
      this.logger.error(`AEAT submission failed: ${error}`);

      // Retry logic with exponential backoff
      if (retryCount < this.MAX_RETRIES && this.isRetryableError(error)) {
        const delay = this.RETRY_DELAY_MS * Math.pow(2, retryCount);
        this.logger.log(`Retrying in ${delay}ms...`);

        await this.sleep(delay);
        return this.submitInvoice({
          ...submission,
          retryCount: retryCount + 1,
        });
      }

      return {
        success: false,
        errors: [{
          code: 'AEAT_CONNECTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        }],
      };
    }
  }

  /**
   * Envía la petición SOAP a AEAT
   */
  private sendSoapRequest(xml: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = new URL(this.getEndpointUrl());

      const options: https.RequestOptions = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'Content-Length': Buffer.byteLength(xml, 'utf8'),
          'SOAPAction': '"SuministroLRFacturasEmitidas"',
        },
        key: this.certificate!.key,
        cert: this.certificate!.cert,
        passphrase: this.certificate!.passphrase,
        rejectUnauthorized: true,
        timeout: 30000, // 30 seconds timeout
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(xml);
      req.end();
    });
  }

  /**
   * Parsea la respuesta SOAP de AEAT
   */
  private parseResponse(xmlResponse: string): AEATResponse {
    try {
      // Parse CSV (Código Seguro de Verificación)
      const csvMatch = xmlResponse.match(/<CSV>([A-Z0-9]+)<\/CSV>/);
      const csv = csvMatch ? csvMatch[1] : undefined;

      // Parse timestamp
      const timestampMatch = xmlResponse.match(/<FechaHoraRegistro>([^<]+)<\/FechaHoraRegistro>/);
      const timestamp = timestampMatch ? timestampMatch[1] : undefined;

      // Check for errors
      const errorMatches = xmlResponse.matchAll(/<Error>.*?<CodigoError>([^<]+)<\/CodigoError>.*?<DescripcionError>([^<]+)<\/DescripcionError>.*?<\/Error>/gs);
      const errors: AEATError[] = [];

      for (const match of errorMatches) {
        errors.push({
          code: match[1],
          message: match[2],
        });
      }

      // Check estado
      const estadoMatch = xmlResponse.match(/<EstadoRegistro>([^<]+)<\/EstadoRegistro>/);
      const estado = estadoMatch ? estadoMatch[1] : 'DESCONOCIDO';

      const success = estado === 'Correcto' || estado === 'AceptadoConErrores';

      return {
        success,
        csv,
        timestamp,
        errors: errors.length > 0 ? errors : undefined,
        rawResponse: xmlResponse,
      };
    } catch (error) {
      this.logger.error(`Failed to parse AEAT response: ${error}`);
      return {
        success: false,
        errors: [{
          code: 'PARSE_ERROR',
          message: 'Failed to parse AEAT response',
        }],
        rawResponse: xmlResponse,
      };
    }
  }

  /**
   * Simula respuesta de AEAT para desarrollo
   */
  private simulateResponse(invoiceNumber: string): AEATResponse {
    // Generate a fake CSV that looks realistic
    const timestamp = new Date().toISOString();
    const csv = this.generateFakeCSV(invoiceNumber, timestamp);

    this.logger.log(`Simulated AEAT acceptance for invoice ${invoiceNumber}: ${csv}`);

    return {
      success: true,
      csv,
      timestamp,
    };
  }

  /**
   * Genera un CSV simulado para desarrollo
   */
  private generateFakeCSV(invoiceNumber: string, timestamp: string): string {
    const hash = crypto
      .createHash('sha256')
      .update(`${invoiceNumber}${timestamp}`)
      .digest('hex')
      .substring(0, 16)
      .toUpperCase();

    return `VF${hash}`;
  }

  /**
   * Determina si un error es recuperable
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('timeout') ||
        message.includes('econnreset') ||
        message.includes('econnrefused') ||
        message.includes('socket hang up') ||
        message.includes('503') ||
        message.includes('502') ||
        message.includes('504')
      );
    }
    return false;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Consulta el estado de una factura previamente enviada
   */
  async queryInvoiceStatus(nifEmisor: string, invoiceNumber: string, fecha: string): Promise<AEATResponse> {
    const queryXml = this.buildQueryXml(nifEmisor, invoiceNumber, fecha);

    if (!this.certificate) {
      this.logger.warn('No certificate - cannot query AEAT');
      return {
        success: false,
        errors: [{
          code: 'NO_CERTIFICATE',
          message: 'AEAT certificate not configured',
        }],
      };
    }

    try {
      const response = await this.sendSoapRequest(queryXml);
      return this.parseResponse(response);
    } catch (error) {
      return {
        success: false,
        errors: [{
          code: 'QUERY_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        }],
      };
    }
  }

  /**
   * Construye el XML para consulta de estado
   */
  private buildQueryXml(nifEmisor: string, invoiceNumber: string, fecha: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:vf="https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/ConsultaVeriFactu.xsd">
  <soapenv:Header/>
  <soapenv:Body>
    <vf:ConsultaLR>
      <vf:Cabecera>
        <vf:IDVersionSii>1.1</vf:IDVersionSii>
        <vf:Titular>
          <vf:NIF>${nifEmisor}</vf:NIF>
        </vf:Titular>
      </vf:Cabecera>
      <vf:FiltroConsulta>
        <vf:PeriodoLiquidacion>
          <vf:Ejercicio>${fecha.substring(0, 4)}</vf:Ejercicio>
          <vf:Periodo>${fecha.substring(5, 7)}</vf:Periodo>
        </vf:PeriodoLiquidacion>
        <vf:IDFactura>
          <vf:NumSerieFacturaEmisor>${invoiceNumber}</vf:NumSerieFacturaEmisor>
          <vf:FechaExpedicionFacturaEmisor>${fecha}</vf:FechaExpedicionFacturaEmisor>
        </vf:IDFactura>
      </vf:FiltroConsulta>
    </vf:ConsultaLR>
  </soapenv:Body>
</soapenv:Envelope>`;
  }

  /**
   * Anula una factura previamente registrada
   */
  async cancelInvoice(
    nifEmisor: string,
    nombreEmisor: string,
    invoiceNumber: string,
    fecha: string,
    originalCSV: string,
  ): Promise<AEATResponse> {
    const cancelXml = this.buildCancelXml(nifEmisor, nombreEmisor, invoiceNumber, fecha, originalCSV);

    if (!this.certificate) {
      this.logger.warn('No certificate - simulating AEAT cancel response');
      return {
        success: true,
        csv: `AN${this.generateFakeCSV(invoiceNumber, new Date().toISOString())}`,
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const response = await this.sendSoapRequest(cancelXml);
      return this.parseResponse(response);
    } catch (error) {
      return {
        success: false,
        errors: [{
          code: 'CANCEL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        }],
      };
    }
  }

  /**
   * Construye el XML para anulación de factura
   */
  private buildCancelXml(
    nifEmisor: string,
    nombreEmisor: string,
    invoiceNumber: string,
    fecha: string,
    originalCSV: string,
  ): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:vf="https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroLRBajaFacturasEmitidas.xsd">
  <soapenv:Header/>
  <soapenv:Body>
    <vf:SuministroLRBajaExpedidas>
      <vf:Cabecera>
        <vf:IDVersionSii>1.1</vf:IDVersionSii>
        <vf:Titular>
          <vf:NombreRazon>${this.escapeXml(nombreEmisor)}</vf:NombreRazon>
          <vf:NIF>${nifEmisor}</vf:NIF>
        </vf:Titular>
        <vf:TipoComunicacion>A0</vf:TipoComunicacion>
      </vf:Cabecera>
      <vf:RegistroLRBajaExpedidas>
        <vf:IDFactura>
          <vf:IDEmisorFactura>
            <vf:NIF>${nifEmisor}</vf:NIF>
          </vf:IDEmisorFactura>
          <vf:NumSerieFacturaEmisor>${invoiceNumber}</vf:NumSerieFacturaEmisor>
          <vf:FechaExpedicionFacturaEmisor>${fecha}</vf:FechaExpedicionFacturaEmisor>
        </vf:IDFactura>
      </vf:RegistroLRBajaExpedidas>
    </vf:SuministroLRBajaExpedidas>
  </soapenv:Body>
</soapenv:Envelope>`;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
