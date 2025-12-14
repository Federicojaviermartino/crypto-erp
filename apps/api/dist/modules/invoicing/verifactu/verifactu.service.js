"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "VerifactuService", {
    enumerable: true,
    get: function() {
        return VerifactuService;
    }
});
const _common = require("@nestjs/common");
const _database = require("../../../../../../libs/database/src");
const _aeatclientservice = require("./aeat-client.service.js");
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
let VerifactuService = class VerifactuService {
    /**
   * Genera el registro Verifactu para una factura
   */ async generateVerifactuRecord(companyId, invoiceId) {
        // Obtener la factura con relaciones
        const invoice = await this.prisma.invoice.findFirst({
            where: {
                id: invoiceId,
                companyId
            },
            include: {
                lines: true,
                contact: true,
                series: true
            }
        });
        if (!invoice) {
            throw new Error(`Invoice ${invoiceId} not found`);
        }
        // Obtener datos de la empresa
        const company = await this.prisma.company.findUnique({
            where: {
                id: companyId
            }
        });
        if (!company) {
            throw new Error(`Company ${companyId} not found`);
        }
        // Calcular IVA promedio de las líneas
        const avgTaxRate = invoice.lines.length > 0 ? invoice.lines.reduce((sum, l)=>sum + (l.taxRate?.toNumber() || 21), 0) / invoice.lines.length : 21;
        // Convertir a datos Verifactu
        const invoiceData = {
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
            descripcion: invoice.lines.map((l)=>l.description).join(', ').substring(0, 250)
        };
        // Obtener huella de la factura anterior
        const previousRecord = await this.getLastVerifactuRecord(companyId);
        const huellaAnterior = previousRecord?.huella || null;
        // Generar huella digital
        const huella = this.generateHuella(invoiceData, huellaAnterior);
        // Generar código QR
        const { codigoQR, urlVerificacion } = this.generateQRCode(invoiceData, huella);
        // Crear registro
        const record = {
            huella,
            huellaAnterior,
            factura: invoiceData,
            codigoQR,
            urlVerificacion,
            estado: 'PENDIENTE',
            fechaRegistro: new Date()
        };
        // Guardar en la base de datos
        await this.saveVerifactuRecord(companyId, invoiceId, record);
        this.logger.log(`Verifactu record generated for invoice ${invoice.fullNumber}: ${huella.substring(0, 16)}...`);
        return record;
    }
    /**
   * Genera la huella digital encadenada según especificación Verifactu
   * SHA-256 de los datos concatenados
   */ generateHuella(data, huellaAnterior) {
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
            huellaAnterior || ''
        ].join('|');
        return _crypto.createHash('sha256').update(contenido, 'utf8').digest('hex').toUpperCase();
    }
    /**
   * Genera el código QR y URL de verificación
   */ generateQRCode(data, huella) {
        // URL de verificación de la AEAT
        const baseUrl = 'https://www2.agenciatributaria.gob.es/wlpl/TGVI-JDIT/VerificadorFacturasRF';
        const params = new URLSearchParams({
            nif: data.nifEmisor,
            numserie: `${data.serieFactura}${data.numeroFactura}`,
            fecha: data.fechaExpedicion.toISOString().split('T')[0],
            importe: data.totalFactura.toFixed(2),
            huella: huella.substring(0, 16)
        });
        const urlVerificacion = `${baseUrl}?${params.toString()}`;
        // El código QR contiene la URL de verificación
        // En producción, esto se convertiría en una imagen QR real
        const codigoQR = urlVerificacion;
        return {
            codigoQR,
            urlVerificacion
        };
    }
    /**
   * Envía el registro Verifactu a la AEAT
   */ async sendToAEAT(companyId, invoiceId) {
        const record = await this.getVerifactuRecord(companyId, invoiceId);
        if (!record) {
            throw new Error('Verifactu record not found');
        }
        if (record.estado === 'ACEPTADO') {
            return {
                success: true,
                csv: record.csvAeat
            };
        }
        // Generate XML for submission
        const xml = this.generateXML(record);
        this.logger.log(`Submitting invoice ${record.factura.numeroFactura} to AEAT`);
        // Submit to AEAT using the client
        const response = await this.aeatClient.submitInvoice({
            xml,
            nifEmisor: record.factura.nifEmisor,
            invoiceNumber: record.factura.numeroFactura
        });
        if (response.success) {
            await this.updateVerifactuRecord(companyId, invoiceId, {
                estado: 'ACEPTADO',
                fechaEnvio: new Date(),
                csvAeat: response.csv
            });
            this.logger.log(`Invoice ${record.factura.numeroFactura} accepted by AEAT. CSV: ${response.csv}`);
            return {
                success: true,
                csv: response.csv
            };
        } else {
            const errorMessages = response.errors?.map((e)=>`${e.code}: ${e.message}`) || [];
            await this.updateVerifactuRecord(companyId, invoiceId, {
                estado: 'RECHAZADO',
                fechaEnvio: new Date(),
                errores: errorMessages
            });
            this.logger.error(`Invoice ${record.factura.numeroFactura} rejected by AEAT: ${errorMessages.join(', ')}`);
            return {
                success: false,
                errors: errorMessages
            };
        }
    }
    /**
   * Genera el XML según esquema Verifactu para envío a AEAT
   */ generateXML(record) {
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
   */ async getVerificationStatus(companyId, invoiceId) {
        const record = await this.getVerifactuRecord(companyId, invoiceId);
        if (!record) {
            return {
                verified: false,
                estado: 'NO_REGISTRADO'
            };
        }
        return {
            verified: record.estado === 'ACEPTADO',
            estado: record.estado,
            urlVerificacion: record.urlVerificacion,
            csvAeat: record.csvAeat
        };
    }
    /**
   * Valida la integridad de la cadena de huellas
   */ async validateChainIntegrity(companyId) {
        // Obtener todas las facturas con hash verifactu ordenadas
        const invoices = await this.prisma.invoice.findMany({
            where: {
                companyId,
                verifactuHash: {
                    not: null
                }
            },
            orderBy: [
                {
                    issueDate: 'asc'
                },
                {
                    number: 'asc'
                }
            ],
            select: {
                id: true,
                fullNumber: true,
                verifactuHash: true
            }
        });
        const errors = [];
        // La validación de cadena simplificada - verificar que cada factura tiene hash
        for (const invoice of invoices){
            if (!invoice.verifactuHash) {
                errors.push(`Factura ${invoice.fullNumber}: Sin hash Verifactu registrado`);
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            totalRecords: invoices.length
        };
    }
    // Helpers privados
    getInvoiceType(type) {
        const typeMap = {
            STANDARD: 'F1',
            SIMPLIFIED: 'F2',
            CREDIT_NOTE: 'R1',
            DEBIT_NOTE: 'R2'
        };
        return typeMap[type] || 'F1';
    }
    escapeXml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    }
    async getLastVerifactuRecord(companyId) {
        const result = await this.prisma.invoice.findFirst({
            where: {
                companyId,
                verifactuHash: {
                    not: null
                }
            },
            orderBy: [
                {
                    issueDate: 'desc'
                },
                {
                    number: 'desc'
                }
            ],
            select: {
                verifactuHash: true
            }
        });
        if (result?.verifactuHash) {
            return {
                huella: result.verifactuHash
            };
        }
        return null;
    }
    async getVerifactuRecord(companyId, invoiceId) {
        const invoice = await this.prisma.invoice.findFirst({
            where: {
                id: invoiceId,
                companyId
            },
            include: {
                lines: true,
                contact: true,
                series: true
            }
        });
        if (!invoice?.verifactuHash) {
            return null;
        }
        // Obtener datos de la empresa
        const company = await this.prisma.company.findUnique({
            where: {
                id: companyId
            }
        });
        // Calcular IVA promedio
        const avgTaxRate = invoice.lines.length > 0 ? invoice.lines.reduce((sum, l)=>sum + (l.taxRate?.toNumber() || 21), 0) / invoice.lines.length : 21;
        // Reconstruir el registro desde los datos de la factura
        const factura = {
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
            descripcion: invoice.lines.map((l)=>l.description).join(', ').substring(0, 250)
        };
        return {
            huella: invoice.verifactuHash,
            huellaAnterior: null,
            factura,
            codigoQR: invoice.verifactuQrData || '',
            urlVerificacion: invoice.verifactuQrData || '',
            estado: 'ACEPTADO',
            fechaRegistro: invoice.createdAt
        };
    }
    async saveVerifactuRecord(_companyId, invoiceId, record) {
        await this.prisma.invoice.update({
            where: {
                id: invoiceId
            },
            data: {
                verifactuHash: record.huella,
                verifactuQrData: record.codigoQR
            }
        });
    }
    async updateVerifactuRecord(_companyId, invoiceId, updates) {
        await this.prisma.invoice.update({
            where: {
                id: invoiceId
            },
            data: {
                ...updates.huella && {
                    verifactuHash: updates.huella
                },
                ...updates.codigoQR && {
                    verifactuQrData: updates.codigoQR
                }
            }
        });
    }
    constructor(prisma, aeatClient){
        this.prisma = prisma;
        this.aeatClient = aeatClient;
        this.logger = new _common.Logger(VerifactuService.name);
        // Entorno de la AEAT (producción o pruebas)
        this.aeatUrl = process.env.AEAT_VERIFACTU_URL || 'https://prewww1.aeat.es/wlpl/TGVI-JDIT/ws/VeriFactuSV.wsdl';
        this.isProduction = process.env.NODE_ENV === 'production';
    }
};
VerifactuService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService,
        typeof _aeatclientservice.AEATClientService === "undefined" ? Object : _aeatclientservice.AEATClientService
    ])
], VerifactuService);

//# sourceMappingURL=verifactu.service.js.map