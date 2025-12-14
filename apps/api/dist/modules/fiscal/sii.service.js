"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SIIService", {
    enumerable: true,
    get: function() {
        return SIIService;
    }
});
const _common = require("@nestjs/common");
const _database = require("../../../../../libs/database/src");
const _aeatclientservice = require("../invoicing/verifactu/aeat-client.service.js");
const _xmlbuilder2 = require("xmlbuilder2");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let SIIService = class SIIService {
    /**
   * Send issued invoices (Facturas Emitidas) to AEAT
   */ async submitIssuedInvoices(companyId, invoiceIds) {
        this.logger.log(`Submitting ${invoiceIds.length} issued invoices to SII for company ${companyId}`);
        const company = await this.prisma.company.findUniqueOrThrow({
            where: {
                id: companyId
            }
        });
        const invoices = await this.prisma.invoice.findMany({
            where: {
                id: {
                    in: invoiceIds
                },
                companyId,
                direction: 'SALE',
                status: {
                    in: [
                        'SENT',
                        'PAID',
                        'OVERDUE'
                    ]
                }
            },
            include: {
                taxes: true,
                lines: true
            }
        });
        if (invoices.length === 0) {
            this.logger.warn('No valid invoices to submit');
            return [];
        }
        // Generate SII XML for issued invoices
        const xml = this.generateIssuedInvoicesXML(company.taxId, company.name, invoices);
        // Send to AEAT via SOAP
        const endpoint = this.getSIIEndpoint();
        const results = [];
        try {
            const response = await this.aeatClient.sendSoapRequest(endpoint, 'SuministroLRFacturasEmitidas', xml);
            // Parse response and update invoices
            for (const invoice of invoices){
                const accepted = this.parseResponseForInvoice(response, invoice.fullNumber);
                await this.prisma.invoice.update({
                    where: {
                        id: invoice.id
                    },
                    data: {
                        verifactuSentAt: new Date(),
                        verifactuStatus: accepted ? 'ACCEPTED' : 'REJECTED',
                        verifactuResponse: response
                    }
                });
                results.push({
                    invoiceId: invoice.id,
                    success: accepted,
                    csv: accepted ? this.extractCSV(response) : undefined,
                    errors: accepted ? undefined : this.extractErrors(response),
                    submittedAt: new Date()
                });
            }
            this.logger.log(`SII submission completed: ${results.filter((r)=>r.success).length}/${results.length} accepted`);
        } catch (error) {
            this.logger.error('Failed to submit to SII:', error);
            // Mark all as failed
            for (const invoice of invoices){
                results.push({
                    invoiceId: invoice.id,
                    success: false,
                    errors: [
                        error.message
                    ],
                    submittedAt: new Date()
                });
            }
        }
        return results;
    }
    /**
   * Send received invoices (Facturas Recibidas) to AEAT
   */ async submitReceivedInvoices(companyId, invoiceIds) {
        this.logger.log(`Submitting ${invoiceIds.length} received invoices to SII for company ${companyId}`);
        const company = await this.prisma.company.findUniqueOrThrow({
            where: {
                id: companyId
            }
        });
        const invoices = await this.prisma.invoice.findMany({
            where: {
                id: {
                    in: invoiceIds
                },
                companyId,
                direction: 'PURCHASE',
                status: {
                    in: [
                        'SENT',
                        'PAID',
                        'OVERDUE'
                    ]
                }
            },
            include: {
                taxes: true,
                lines: true
            }
        });
        if (invoices.length === 0) {
            this.logger.warn('No valid invoices to submit');
            return [];
        }
        // Generate SII XML for received invoices
        const xml = this.generateReceivedInvoicesXML(company.taxId, company.name, invoices);
        // Send to AEAT via SOAP
        const endpoint = this.getSIIEndpoint();
        const results = [];
        try {
            const response = await this.aeatClient.sendSoapRequest(endpoint, 'SuministroLRFacturasRecibidas', xml);
            // Parse response and update invoices
            for (const invoice of invoices){
                const accepted = this.parseResponseForInvoice(response, invoice.fullNumber);
                await this.prisma.invoice.update({
                    where: {
                        id: invoice.id
                    },
                    data: {
                        verifactuSentAt: new Date(),
                        verifactuStatus: accepted ? 'ACCEPTED' : 'REJECTED',
                        verifactuResponse: response
                    }
                });
                results.push({
                    invoiceId: invoice.id,
                    success: accepted,
                    csv: accepted ? this.extractCSV(response) : undefined,
                    errors: accepted ? undefined : this.extractErrors(response),
                    submittedAt: new Date()
                });
            }
            this.logger.log(`SII submission completed: ${results.filter((r)=>r.success).length}/${results.length} accepted`);
        } catch (error) {
            this.logger.error('Failed to submit to SII:', error);
            for (const invoice of invoices){
                results.push({
                    invoiceId: invoice.id,
                    success: false,
                    errors: [
                        error.message
                    ],
                    submittedAt: new Date()
                });
            }
        }
        return results;
    }
    /**
   * Get invoices pending SII submission (issued >4 days ago, not sent)
   */ async getPendingSubmissions(companyId) {
        const fourDaysAgo = new Date();
        fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
        return this.prisma.invoice.findMany({
            where: {
                companyId,
                issueDate: {
                    lte: fourDaysAgo
                },
                status: {
                    in: [
                        'SENT',
                        'PAID',
                        'OVERDUE'
                    ]
                },
                verifactuSentAt: null,
                // Exclude exports and intra-EU (different regime)
                counterpartyCountry: 'ES'
            },
            include: {
                taxes: true
            },
            orderBy: {
                issueDate: 'asc'
            }
        });
    }
    /**
   * Generate XML for issued invoices (Facturas Emitidas)
   */ generateIssuedInvoicesXML(declarantNif, declarantName, invoices) {
        const doc = (0, _xmlbuilder2.create)({
            version: '1.0',
            encoding: 'UTF-8'
        }).ele('sii:SuministroLRFacturasEmitidas', {
            'xmlns:sii': 'https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/ssii/fact/ws/SuministroInformacion.xsd'
        }).ele('sii:Cabecera').ele('sii:IDVersionSii').txt('1.1').up().ele('sii:Titular').ele('sii:NIF').txt(declarantNif).up().ele('sii:NombreRazon').txt(declarantName).up().up() // Close Titular
        .ele('sii:TipoComunicacion').txt('A0').up() // A0 = Alta de facturas
        .up(); // Close Cabecera
        const registros = doc.ele('sii:RegistroLRFacturasEmitidas');
        for (const invoice of invoices){
            const registro = registros.ele('sii:RegistroLRFacturasEmitidas');
            // Periodo impositivo
            const year = invoice.issueDate.getFullYear();
            const month = String(invoice.issueDate.getMonth() + 1).padStart(2, '0');
            registro.ele('sii:PeriodoImpositivo').ele('sii:Ejercicio').txt(year.toString()).up().ele('sii:Periodo').txt(month).up().up();
            // ID factura
            registro.ele('sii:IDFactura').ele('sii:IDEmisorFactura').ele('sii:NIF').txt(declarantNif).up().up().ele('sii:NumSerieFacturaEmisor').txt(invoice.fullNumber).up().ele('sii:FechaExpedicionFacturaEmisor').txt(this.formatDate(invoice.issueDate)).up().up();
            // Factura
            const facturaNode = registro.ele('sii:FacturaExpedida');
            facturaNode.ele('sii:TipoFactura').txt(this.getSIIInvoiceType(invoice)).up().ele('sii:ClaveRegimenEspecialOTrascendencia').txt('01').up() // 01 = Régimen general
            .ele('sii:DescripcionOperacion').txt(this.getInvoiceDescription(invoice)).up();
            // Contraparte (if exists)
            if (invoice.counterpartyTaxId) {
                facturaNode.ele('sii:Contraparte').ele('sii:NombreRazon').txt(invoice.counterpartyName).up().ele('sii:NIF').txt(invoice.counterpartyTaxId).up().up();
            }
            // Importe total
            facturaNode.ele('sii:TipoDesglose').ele('sii:DesgloseFactura').ele('sii:Sujeta').ele('sii:NoExenta').ele('sii:TipoNoExenta').txt('S1').up() // S1 = Sujeto/No exento
            .ele('sii:DesgloseIVA');
            // Tax breakdown
            for (const tax of invoice.taxes){
                facturaNode.ele('sii:DetalleIVA').ele('sii:TipoImpositivo').txt(tax.taxRate.toFixed(2)).up().ele('sii:BaseImponible').txt(tax.taxableBase.toFixed(2)).up().ele('sii:CuotaRepercutida').txt(tax.taxAmount.toFixed(2)).up().up();
            }
            facturaNode.up().up().up().up().up(); // Close nested elements
            // Import total
            facturaNode.ele('sii:ImporteTotal').txt(invoice.total.toFixed(2)).up();
            facturaNode.up(); // Close FacturaExpedida
            registro.up(); // Close RegistroLRFacturasEmitidas
        }
        return doc.end({
            prettyPrint: true
        });
    }
    /**
   * Generate XML for received invoices (Facturas Recibidas)
   */ generateReceivedInvoicesXML(declarantNif, declarantName, invoices) {
        const doc = (0, _xmlbuilder2.create)({
            version: '1.0',
            encoding: 'UTF-8'
        }).ele('sii:SuministroLRFacturasRecibidas', {
            'xmlns:sii': 'https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/ssii/fact/ws/SuministroInformacion.xsd'
        }).ele('sii:Cabecera').ele('sii:IDVersionSii').txt('1.1').up().ele('sii:Titular').ele('sii:NIF').txt(declarantNif).up().ele('sii:NombreRazon').txt(declarantName).up().up().ele('sii:TipoComunicacion').txt('A0').up().up();
        const registros = doc.ele('sii:RegistroLRFacturasRecibidas');
        for (const invoice of invoices){
            const registro = registros.ele('sii:RegistroLRFacturasRecibidas');
            const year = invoice.issueDate.getFullYear();
            const month = String(invoice.issueDate.getMonth() + 1).padStart(2, '0');
            registro.ele('sii:PeriodoImpositivo').ele('sii:Ejercicio').txt(year.toString()).up().ele('sii:Periodo').txt(month).up().up();
            registro.ele('sii:IDFactura').ele('sii:IDEmisorFactura');
            if (invoice.counterpartyTaxId) {
                registro.ele('sii:NIF').txt(invoice.counterpartyTaxId).up();
            } else {
                registro.ele('sii:NombreRazon').txt(invoice.counterpartyName).up();
            }
            registro.up().ele('sii:NumSerieFacturaEmisor').txt(invoice.fullNumber).up().ele('sii:FechaExpedicionFacturaEmisor').txt(this.formatDate(invoice.issueDate)).up().up();
            const facturaNode = registro.ele('sii:FacturaRecibida');
            facturaNode.ele('sii:TipoFactura').txt(this.getSIIInvoiceType(invoice)).up().ele('sii:ClaveRegimenEspecialOTrascendencia').txt('01').up().ele('sii:DescripcionOperacion').txt(this.getInvoiceDescription(invoice)).up().ele('sii:DesgloseFactura').ele('sii:DesgloseIVA');
            for (const tax of invoice.taxes){
                facturaNode.ele('sii:DetalleIVA').ele('sii:TipoImpositivo').txt(tax.taxRate.toFixed(2)).up().ele('sii:BaseImponible').txt(tax.taxableBase.toFixed(2)).up().ele('sii:CuotaSoportada').txt(tax.taxAmount.toFixed(2)).up().up();
            }
            facturaNode.up().up();
            facturaNode.ele('sii:ImporteTotal').txt(invoice.total.toFixed(2)).up();
            facturaNode.up();
            registro.up();
        }
        return doc.end({
            prettyPrint: true
        });
    }
    /**
   * Get SII endpoint based on environment
   */ getSIIEndpoint() {
        const isProduction = process.env.AEAT_ENVIRONMENT === 'production';
        return isProduction ? this.SII_ENDPOINT_PRODUCTION : this.SII_ENDPOINT_TEST;
    }
    /**
   * Map internal invoice type to SII type
   */ getSIIInvoiceType(invoice) {
        // F1 = Factura normal
        // F2 = Factura simplificada
        // R1-R5 = Rectificativas
        if (invoice.type === 'CREDIT_NOTE') return 'R1';
        if (invoice.type === 'DEBIT_NOTE') return 'R1';
        return 'F1';
    }
    /**
   * Get invoice description (first line or summary)
   */ getInvoiceDescription(invoice) {
        if (invoice.lines && invoice.lines.length > 0) {
            return invoice.lines[0].description.substring(0, 500);
        }
        return `Factura ${invoice.fullNumber}`;
    }
    /**
   * Format date to SII format (DD-MM-YYYY)
   */ formatDate(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    }
    /**
   * Parse SOAP response to check if invoice was accepted
   */ parseResponseForInvoice(response, invoiceNumber) {
        // Simplified - real implementation would parse XML response
        return response && response.EstadoEnvio === 'Correcto';
    }
    /**
   * Extract CSV (Código Seguro Verificación) from response
   */ extractCSV(response) {
        return response?.CSV;
    }
    /**
   * Extract error messages from response
   */ extractErrors(response) {
        if (!response || !response.RespuestaLinea) return [
            'Unknown error'
        ];
        const errors = [];
        const lines = Array.isArray(response.RespuestaLinea) ? response.RespuestaLinea : [
            response.RespuestaLinea
        ];
        for (const line of lines){
            if (line.EstadoRegistro === 'Incorrecto' && line.Errores) {
                errors.push(...line.Errores.map((e)=>e.DescripcionError));
            }
        }
        return errors.length > 0 ? errors : [
            'Submission rejected'
        ];
    }
    constructor(prisma, aeatClient){
        this.prisma = prisma;
        this.aeatClient = aeatClient;
        this.logger = new _common.Logger(SIIService.name);
        // SII SOAP endpoints
        this.SII_ENDPOINT_PRODUCTION = 'https://www1.agenciatributaria.gob.es/wlpl/SSII-FACT/ws/fe/SiiFactFEV1SOAP';
        this.SII_ENDPOINT_TEST = 'https://prewww1.aeat.es/wlpl/SSII-FACT/ws/fe/SiiFactFEV1SOAP';
    }
};
SIIService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService,
        typeof _aeatclientservice.AEATClientService === "undefined" ? Object : _aeatclientservice.AEATClientService
    ])
], SIIService);

//# sourceMappingURL=sii.service.js.map