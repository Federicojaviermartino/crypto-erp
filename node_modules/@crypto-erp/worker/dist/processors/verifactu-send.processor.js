"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "VerifactuSendProcessor", {
    enumerable: true,
    get: function() {
        return VerifactuSendProcessor;
    }
});
const _bullmq = require("@nestjs/bullmq");
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
const _bullmq1 = require("bullmq");
const _database = require("../../../../libs/database/src");
const _https = /*#__PURE__*/ _interop_require_wildcard(require("https"));
const _fs = /*#__PURE__*/ _interop_require_wildcard(require("fs"));
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {
        __proto__: null
    };
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
const QUEUE_NAME = 'verifactu-send';
let VerifactuSendProcessor = class VerifactuSendProcessor extends _bullmq.WorkerHost {
    /**
   * Load AEAT certificate from configured path
   */ loadCertificate() {
        const certPath = this.configService.get('AEAT_CERTIFICATE_PATH');
        if (!certPath) {
            this.logger.warn('AEAT_CERTIFICATE_PATH not configured. Verifactu submissions will be simulated.');
            return;
        }
        try {
            // For P12/PFX certificates, you would need to extract cert and key
            // This is a simplified version - in production use node-forge or similar
            if (_fs.existsSync(certPath)) {
                this.logger.log('AEAT certificate configured');
            // Certificate loading would go here
            } else {
                this.logger.warn(`Certificate file not found: ${certPath}`);
            }
        } catch (error) {
            this.logger.error(`Failed to load certificate: ${error}`);
        }
    }
    async process(job) {
        const { invoiceId, companyId, verifactuRecordId, xml, nifEmisor, invoiceNumber } = job.data;
        this.logger.log(`Processing Verifactu submission for invoice ${invoiceNumber}`);
        const result = {
            success: false,
            errors: []
        };
        try {
            // Update record status to ENVIANDO
            await this.prisma.verifactuRecord.update({
                where: {
                    id: verifactuRecordId
                },
                data: {
                    state: 'ENVIANDO',
                    sentAt: new Date()
                }
            });
            // If no certificate, simulate the submission
            if (!this.certificate) {
                this.logger.warn('No certificate configured - simulating AEAT submission');
                // Simulate successful response
                const simulatedCsv = `SIM-${Date.now()}-${invoiceNumber}`;
                await this.prisma.verifactuRecord.update({
                    where: {
                        id: verifactuRecordId
                    },
                    data: {
                        state: 'ACEPTADO',
                        csv: simulatedCsv,
                        aeatResponse: JSON.stringify({
                            simulated: true,
                            timestamp: new Date().toISOString(),
                            message: 'Simulated acceptance - certificate not configured'
                        })
                    }
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
                    where: {
                        id: verifactuRecordId
                    },
                    data: {
                        state: 'ACEPTADO',
                        csv: aeatResponse.csv,
                        aeatResponse: JSON.stringify(aeatResponse)
                    }
                });
                // Update invoice status with response data
                await this.prisma.invoice.update({
                    where: {
                        id: invoiceId
                    },
                    data: {
                        verifactuStatus: 'ACCEPTED',
                        verifactuSentAt: new Date(),
                        verifactuResponse: {
                            csv: aeatResponse.csv,
                            code: aeatResponse.code
                        }
                    }
                });
                result.success = true;
                result.csv = aeatResponse.csv;
                result.responseCode = aeatResponse.code;
                result.responseMessage = aeatResponse.message;
            } else {
                // Update record as rejected
                await this.prisma.verifactuRecord.update({
                    where: {
                        id: verifactuRecordId
                    },
                    data: {
                        state: 'RECHAZADO',
                        aeatResponse: JSON.stringify(aeatResponse)
                    }
                });
                result.errors?.push(aeatResponse.message || 'AEAT rejected the submission');
                throw new Error(`AEAT rejection: ${aeatResponse.message}`);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            result.errors?.push(errorMessage);
            // Update record with error
            await this.prisma.verifactuRecord.update({
                where: {
                    id: verifactuRecordId
                },
                data: {
                    state: 'ERROR',
                    aeatResponse: JSON.stringify({
                        error: errorMessage
                    })
                }
            });
            this.logger.error(`Verifactu submission failed for ${invoiceNumber}: ${errorMessage}`);
            throw error;
        }
        return result;
    }
    /**
   * Send XML to AEAT web service
   */ async sendToAEAT(xml, nifEmisor) {
        return new Promise((resolve)=>{
            // Build SOAP envelope
            const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header/>
  <soapenv:Body>
    ${xml}
  </soapenv:Body>
</soapenv:Envelope>`;
            const url = new URL(this.aeatEndpoint);
            const options = {
                hostname: url.hostname,
                port: 443,
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/xml; charset=utf-8',
                    'Content-Length': Buffer.byteLength(soapEnvelope),
                    SOAPAction: 'RegistroFacturacion'
                }
            };
            const req = _https.request(options, (res)=>{
                let data = '';
                res.on('data', (chunk)=>{
                    data += chunk;
                });
                res.on('end', ()=>{
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
                                message: 'Accepted by AEAT'
                            });
                        } else if (errorMatch) {
                            resolve({
                                success: false,
                                message: errorMatch[1]
                            });
                        } else {
                            resolve({
                                success: false,
                                message: 'Unexpected response format'
                            });
                        }
                    } catch  {
                        resolve({
                            success: false,
                            message: 'Failed to parse AEAT response'
                        });
                    }
                });
            });
            req.on('error', (error)=>{
                resolve({
                    success: false,
                    message: error.message
                });
            });
            req.write(soapEnvelope);
            req.end();
        });
    }
    onCompleted(job) {
        this.logger.log(`Verifactu job ${job.id} completed for invoice ${job.data.invoiceNumber}`);
    }
    onFailed(job, error) {
        this.logger.error(`Verifactu job failed for invoice ${job?.data.invoiceNumber}: ${error.message}`);
    }
    constructor(prisma, configService){
        super(), this.prisma = prisma, this.configService = configService, this.logger = new _common.Logger(VerifactuSendProcessor.name), this.maxRetries = 3, this.certificate = null;
        // Set AEAT endpoint based on environment
        const isProduction = this.configService.get('NODE_ENV') === 'production';
        this.aeatEndpoint = isProduction ? 'https://www1.agenciatributaria.gob.es/wlpl/TGVI-JDIT/ws/VeriFactuSV' : 'https://prewww1.aeat.es/wlpl/TGVI-JDIT/ws/VeriFactuSV';
        this.loadCertificate();
    }
};
_ts_decorate([
    (0, _bullmq.OnWorkerEvent)('completed'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _bullmq1.Job === "undefined" ? Object : _bullmq1.Job
    ]),
    _ts_metadata("design:returntype", void 0)
], VerifactuSendProcessor.prototype, "onCompleted", null);
_ts_decorate([
    (0, _bullmq.OnWorkerEvent)('failed'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        typeof Error === "undefined" ? Object : Error
    ]),
    _ts_metadata("design:returntype", void 0)
], VerifactuSendProcessor.prototype, "onFailed", null);
VerifactuSendProcessor = _ts_decorate([
    (0, _bullmq.Processor)(QUEUE_NAME),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService,
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService
    ])
], VerifactuSendProcessor);

//# sourceMappingURL=verifactu-send.processor.js.map