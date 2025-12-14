"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AEATClientService", {
    enumerable: true,
    get: function() {
        return AEATClientService;
    }
});
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
const _https = /*#__PURE__*/ _interop_require_wildcard(require("https"));
const _fs = /*#__PURE__*/ _interop_require_wildcard(require("fs"));
const _path = /*#__PURE__*/ _interop_require_wildcard(require("path"));
const _crypto = /*#__PURE__*/ _interop_require_wildcard(require("crypto"));
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
let AEATClientService = class AEATClientService {
    /**
   * Carga el certificado digital para autenticación con AEAT
   */ loadCertificate() {
        const certPath = this.configService.get('AEAT_CERTIFICATE_PATH');
        const certPassword = this.configService.get('AEAT_CERTIFICATE_PASSWORD');
        if (!certPath) {
            this.logger.warn('AEAT certificate path not configured. AEAT submissions will fail in production.');
            return;
        }
        try {
            const absolutePath = _path.isAbsolute(certPath) ? certPath : _path.join(process.cwd(), certPath);
            if (!_fs.existsSync(absolutePath)) {
                this.logger.warn(`AEAT certificate not found at: ${absolutePath}`);
                return;
            }
            // Read PFX/P12 certificate and extract key/cert
            const pfxBuffer = _fs.readFileSync(absolutePath);
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
   */ parsePkcs12(pfxBuffer, password) {
        try {
            // Using dynamic import to handle ESM module
            const forge = require('node-forge');
            const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'));
            const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password || '');
            // Extract private key
            const keyBags = p12.getBags({
                bagType: forge.pki.oids.pkcs8ShroudedKeyBag
            });
            const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
            if (!keyBag?.key) {
                this.logger.error('No private key found in certificate');
                return null;
            }
            // Extract certificate
            const certBags = p12.getBags({
                bagType: forge.pki.oids.certBag
            });
            const certBag = certBags[forge.pki.oids.certBag]?.[0];
            if (!certBag?.cert) {
                this.logger.error('No certificate found in PFX file');
                return null;
            }
            return {
                key: forge.pki.privateKeyToPem(keyBag.key),
                cert: forge.pki.certificateToPem(certBag.cert),
                passphrase: password
            };
        } catch (error) {
            this.logger.error(`Failed to parse PKCS12 certificate: ${error}`);
            return null;
        }
    }
    /**
   * Verifica si el cliente está configurado para producción
   */ isConfiguredForProduction() {
        return this.certificate !== null;
    }
    /**
   * Obtiene la URL del endpoint según el entorno
   */ getEndpointUrl() {
        const isProduction = this.configService.get('NODE_ENV') === 'production';
        return isProduction ? this.PRODUCTION_URL : this.SANDBOX_URL;
    }
    /**
   * Envía una factura a AEAT vía SOAP
   */ async submitInvoice(submission) {
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
                    retryCount: retryCount + 1
                });
            }
            return {
                success: false,
                errors: [
                    {
                        code: 'AEAT_CONNECTION_ERROR',
                        message: error instanceof Error ? error.message : 'Unknown error'
                    }
                ]
            };
        }
    }
    /**
   * Envía la petición SOAP a AEAT
   */ sendSoapRequest(xml) {
        return new Promise((resolve, reject)=>{
            const url = new URL(this.getEndpointUrl());
            const options = {
                hostname: url.hostname,
                port: 443,
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'Content-Length': Buffer.byteLength(xml, 'utf8'),
                    'SOAPAction': '"SuministroLRFacturasEmitidas"'
                },
                key: this.certificate.key,
                cert: this.certificate.cert,
                passphrase: this.certificate.passphrase,
                rejectUnauthorized: true,
                timeout: 30000
            };
            const req = _https.request(options, (res)=>{
                let data = '';
                res.on('data', (chunk)=>data += chunk);
                res.on('end', ()=>{
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(data);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                });
            });
            req.on('error', reject);
            req.on('timeout', ()=>{
                req.destroy();
                reject(new Error('Request timeout'));
            });
            req.write(xml);
            req.end();
        });
    }
    /**
   * Parsea la respuesta SOAP de AEAT
   */ parseResponse(xmlResponse) {
        try {
            // Parse CSV (Código Seguro de Verificación)
            const csvMatch = xmlResponse.match(/<CSV>([A-Z0-9]+)<\/CSV>/);
            const csv = csvMatch ? csvMatch[1] : undefined;
            // Parse timestamp
            const timestampMatch = xmlResponse.match(/<FechaHoraRegistro>([^<]+)<\/FechaHoraRegistro>/);
            const timestamp = timestampMatch ? timestampMatch[1] : undefined;
            // Check for errors
            const errorMatches = xmlResponse.matchAll(/<Error>.*?<CodigoError>([^<]+)<\/CodigoError>.*?<DescripcionError>([^<]+)<\/DescripcionError>.*?<\/Error>/gs);
            const errors = [];
            for (const match of errorMatches){
                errors.push({
                    code: match[1],
                    message: match[2]
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
                rawResponse: xmlResponse
            };
        } catch (error) {
            this.logger.error(`Failed to parse AEAT response: ${error}`);
            return {
                success: false,
                errors: [
                    {
                        code: 'PARSE_ERROR',
                        message: 'Failed to parse AEAT response'
                    }
                ],
                rawResponse: xmlResponse
            };
        }
    }
    /**
   * Simula respuesta de AEAT para desarrollo
   */ simulateResponse(invoiceNumber) {
        // Generate a fake CSV that looks realistic
        const timestamp = new Date().toISOString();
        const csv = this.generateFakeCSV(invoiceNumber, timestamp);
        this.logger.log(`Simulated AEAT acceptance for invoice ${invoiceNumber}: ${csv}`);
        return {
            success: true,
            csv,
            timestamp
        };
    }
    /**
   * Genera un CSV simulado para desarrollo
   */ generateFakeCSV(invoiceNumber, timestamp) {
        const hash = _crypto.createHash('sha256').update(`${invoiceNumber}${timestamp}`).digest('hex').substring(0, 16).toUpperCase();
        return `VF${hash}`;
    }
    /**
   * Determina si un error es recuperable
   */ isRetryableError(error) {
        if (error instanceof Error) {
            const message = error.message.toLowerCase();
            return message.includes('timeout') || message.includes('econnreset') || message.includes('econnrefused') || message.includes('socket hang up') || message.includes('503') || message.includes('502') || message.includes('504');
        }
        return false;
    }
    /**
   * Sleep helper
   */ sleep(ms) {
        return new Promise((resolve)=>setTimeout(resolve, ms));
    }
    /**
   * Consulta el estado de una factura previamente enviada
   */ async queryInvoiceStatus(nifEmisor, invoiceNumber, fecha) {
        const queryXml = this.buildQueryXml(nifEmisor, invoiceNumber, fecha);
        if (!this.certificate) {
            this.logger.warn('No certificate - cannot query AEAT');
            return {
                success: false,
                errors: [
                    {
                        code: 'NO_CERTIFICATE',
                        message: 'AEAT certificate not configured'
                    }
                ]
            };
        }
        try {
            const response = await this.sendSoapRequest(queryXml);
            return this.parseResponse(response);
        } catch (error) {
            return {
                success: false,
                errors: [
                    {
                        code: 'QUERY_ERROR',
                        message: error instanceof Error ? error.message : 'Unknown error'
                    }
                ]
            };
        }
    }
    /**
   * Construye el XML para consulta de estado
   */ buildQueryXml(nifEmisor, invoiceNumber, fecha) {
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
   */ async cancelInvoice(nifEmisor, nombreEmisor, invoiceNumber, fecha, originalCSV) {
        const cancelXml = this.buildCancelXml(nifEmisor, nombreEmisor, invoiceNumber, fecha, originalCSV);
        if (!this.certificate) {
            this.logger.warn('No certificate - simulating AEAT cancel response');
            return {
                success: true,
                csv: `AN${this.generateFakeCSV(invoiceNumber, new Date().toISOString())}`,
                timestamp: new Date().toISOString()
            };
        }
        try {
            const response = await this.sendSoapRequest(cancelXml);
            return this.parseResponse(response);
        } catch (error) {
            return {
                success: false,
                errors: [
                    {
                        code: 'CANCEL_ERROR',
                        message: error instanceof Error ? error.message : 'Unknown error'
                    }
                ]
            };
        }
    }
    /**
   * Construye el XML para anulación de factura
   */ buildCancelXml(nifEmisor, nombreEmisor, invoiceNumber, fecha, originalCSV) {
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
    escapeXml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    }
    constructor(configService){
        this.configService = configService;
        this.logger = new _common.Logger(AEATClientService.name);
        // Endpoints AEAT
        this.PRODUCTION_URL = 'https://www1.agenciatributaria.gob.es/wlpl/TGVI-JDIT/ws/VeriFactuSV';
        this.SANDBOX_URL = 'https://prewww1.aeat.es/wlpl/TGVI-JDIT/ws/VeriFactuSV';
        // Retry configuration
        this.MAX_RETRIES = 3;
        this.RETRY_DELAY_MS = 2000;
        this.certificate = null;
        this.loadCertificate();
    }
};
AEATClientService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService
    ])
], AEATClientService);

//# sourceMappingURL=aeat-client.service.js.map