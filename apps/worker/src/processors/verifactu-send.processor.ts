import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { PrismaService } from '@crypto-erp/database';
import * as https from 'https';
import * as fs from 'fs';

const QUEUE_NAME = 'verifactu-send';

interface VerifactuSendJobData {
  invoiceId: string;
  companyId: string;
  verifactuRecordId: string;
  xml: string;
  nifEmisor: string;
  invoiceNumber: string;
  retryCount?: number;
}

interface VerifactuSendResult {
  success: boolean;
  csv?: string;
  responseCode?: string;
  responseMessage?: string;
  errors?: string[];
}

@Processor(QUEUE_NAME)
export class VerifactuSendProcessor extends WorkerHost {
  private readonly logger = new Logger(VerifactuSendProcessor.name);
  private readonly maxRetries = 3;
  private readonly aeatEndpoint: string;
  private certificate: { cert: string; key: string } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super();

    // Set AEAT endpoint based on environment
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    this.aeatEndpoint = isProduction
      ? 'https://www1.agenciatributaria.gob.es/wlpl/TGVI-JDIT/ws/VeriFactuSV'
      : 'https://prewww1.aeat.es/wlpl/TGVI-JDIT/ws/VeriFactuSV';

    this.loadCertificate();
  }

  /**
   * Load AEAT certificate from configured path
   */
  private loadCertificate(): void {
    const certPath = this.configService.get<string>('AEAT_CERTIFICATE_PATH');

    if (!certPath) {
      this.logger.warn('AEAT_CERTIFICATE_PATH not configured. Verifactu submissions will be simulated.');
      return;
    }

    try {
      // For P12/PFX certificates, you would need to extract cert and key
      // This is a simplified version - in production use node-forge or similar
      if (fs.existsSync(certPath)) {
        this.logger.log('AEAT certificate configured');
        // Certificate loading would go here
      } else {
        this.logger.warn(`Certificate file not found: ${certPath}`);
      }
    } catch (error) {
      this.logger.error(`Failed to load certificate: ${error}`);
    }
  }

  async process(job: Job<VerifactuSendJobData>): Promise<VerifactuSendResult> {
    const { invoiceId, companyId, verifactuRecordId, xml, nifEmisor, invoiceNumber } = job.data;

    this.logger.log(`Processing Verifactu submission for invoice ${invoiceNumber}`);

    const result: VerifactuSendResult = {
      success: false,
      errors: [],
    };

    try {
      // Update record status to ENVIANDO
      await this.prisma.verifactuRecord.update({
        where: { id: verifactuRecordId },
        data: {
          state: 'ENVIANDO',
          sentAt: new Date(),
        },
      });

      // If no certificate, simulate the submission
      if (!this.certificate) {
        this.logger.warn('No certificate configured - simulating AEAT submission');

        // Simulate successful response
        const simulatedCsv = `SIM-${Date.now()}-${invoiceNumber}`;

        await this.prisma.verifactuRecord.update({
          where: { id: verifactuRecordId },
          data: {
            state: 'ACEPTADO',
            csv: simulatedCsv,
            aeatResponse: JSON.stringify({
              simulated: true,
              timestamp: new Date().toISOString(),
              message: 'Simulated acceptance - certificate not configured',
            }),
          },
        });

        result.success = true;
        result.csv = simulatedCsv;
        result.responseMessage = 'Simulated acceptance';

        return result;
      }

      // Send to AEAT
      const aeatResponse = await this.sendToAEAT(xml, nifEmisor);

      if (aeatResponse.success) {
        // Update record as accepted
        await this.prisma.verifactuRecord.update({
          where: { id: verifactuRecordId },
          data: {
            state: 'ACEPTADO',
            csv: aeatResponse.csv,
            aeatResponse: JSON.stringify(aeatResponse),
          },
        });

        // Update invoice status with response data
        await this.prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            verifactuStatus: 'ACCEPTED',
            verifactuSentAt: new Date(),
            verifactuResponse: { csv: aeatResponse.csv, code: aeatResponse.code },
          },
        });

        result.success = true;
        result.csv = aeatResponse.csv;
        result.responseCode = aeatResponse.code;
        result.responseMessage = aeatResponse.message;
      } else {
        // Update record as rejected
        await this.prisma.verifactuRecord.update({
          where: { id: verifactuRecordId },
          data: {
            state: 'RECHAZADO',
            aeatResponse: JSON.stringify(aeatResponse),
          },
        });

        result.errors?.push(aeatResponse.message || 'AEAT rejected the submission');
        throw new Error(`AEAT rejection: ${aeatResponse.message}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors?.push(errorMessage);

      // Update record with error
      await this.prisma.verifactuRecord.update({
        where: { id: verifactuRecordId },
        data: {
          state: 'ERROR',
          aeatResponse: JSON.stringify({ error: errorMessage }),
        },
      });

      this.logger.error(`Verifactu submission failed for ${invoiceNumber}: ${errorMessage}`);
      throw error;
    }

    return result;
  }

  /**
   * Send XML to AEAT web service
   */
  private async sendToAEAT(
    xml: string,
    nifEmisor: string,
  ): Promise<{
    success: boolean;
    csv?: string;
    code?: string;
    message?: string;
  }> {
    return new Promise((resolve) => {
      // Build SOAP envelope
      const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header/>
  <soapenv:Body>
    ${xml}
  </soapenv:Body>
</soapenv:Envelope>`;

      const url = new URL(this.aeatEndpoint);
      const options: https.RequestOptions = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Content-Length': Buffer.byteLength(soapEnvelope),
          SOAPAction: 'RegistroFacturacion',
        },
        // Certificate would be added here
        // cert: this.certificate?.cert,
        // key: this.certificate?.key,
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            // Parse AEAT response
            // This is simplified - actual parsing would be more complex
            const csvMatch = data.match(/<CSV>([^<]+)<\/CSV>/);
            const errorMatch = data.match(/<DescripcionErrorRegistro>([^<]+)<\/DescripcionErrorRegistro>/);

            if (csvMatch) {
              resolve({
                success: true,
                csv: csvMatch[1],
                code: '0',
                message: 'Accepted by AEAT',
              });
            } else if (errorMatch) {
              resolve({
                success: false,
                message: errorMatch[1],
              });
            } else {
              resolve({
                success: false,
                message: 'Unexpected response format',
              });
            }
          } catch {
            resolve({
              success: false,
              message: 'Failed to parse AEAT response',
            });
          }
        });
      });

      req.on('error', (error) => {
        resolve({
          success: false,
          message: error.message,
        });
      });

      req.write(soapEnvelope);
      req.end();
    });
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<VerifactuSendJobData>) {
    this.logger.log(`Verifactu job ${job.id} completed for invoice ${job.data.invoiceNumber}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<VerifactuSendJobData> | undefined, error: Error) {
    this.logger.error(
      `Verifactu job failed for invoice ${job?.data.invoiceNumber}: ${error.message}`,
    );
  }
}
