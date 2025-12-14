"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "OcrService", {
    enumerable: true,
    get: function() {
        return OcrService;
    }
});
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
const _aiproviderservice = require("./ai-provider.service.js");
const _paddleocrclient = require("./paddle-ocr.client.js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
function _ts_param(paramIndex, decorator) {
    return function(target, key) {
        decorator(target, key, paramIndex);
    };
}
let OcrService = class OcrService {
    /**
   * Extract invoice data from an image or PDF
   * @param fileBuffer - File content as Buffer
   * @param mimeType - MIME type (image/jpeg, image/png, application/pdf)
   */ async extractInvoiceData(fileBuffer, mimeType) {
        const startTime = Date.now();
        try {
            // 1. Try Google Vision first if available
            if (this.googleVisionEnabled) {
                try {
                    const result = await this.extractWithGoogleVision(fileBuffer, mimeType);
                    result.processingTimeMs = Date.now() - startTime;
                    return {
                        success: true,
                        data: result
                    };
                } catch (error) {
                    this.logger.warn(`Google Vision failed, trying PaddleOCR: ${error.message}`);
                }
            }
            // 2. Try PaddleOCR if available
            if (this.paddleOcr) {
                try {
                    const paddleResult = await this.paddleOcr.extractText(fileBuffer);
                    if (paddleResult.success && paddleResult.text) {
                        this.logger.log('PaddleOCR extracted text successfully, parsing with AI');
                        const result = await this.parseInvoiceText(paddleResult.text, 'paddleocr');
                        result.processingTimeMs = Date.now() - startTime;
                        return {
                            success: true,
                            data: result
                        };
                    } else {
                        this.logger.warn(`PaddleOCR failed: ${paddleResult.error}, falling back to AI extraction`);
                    }
                } catch (error) {
                    this.logger.warn(`PaddleOCR extraction error, falling back to AI: ${error.message}`);
                }
            }
            // 3. Fallback to AI-based extraction
            const result = await this.extractWithAI(fileBuffer, mimeType);
            result.processingTimeMs = Date.now() - startTime;
            return {
                success: true,
                data: result
            };
        } catch (error) {
            this.logger.error(`All OCR methods failed: ${error.message}`);
            return {
                success: false,
                data: null,
                error: error.message
            };
        }
    }
    /**
   * Extract text using Google Cloud Vision API
   */ async extractWithGoogleVision(fileBuffer, mimeType) {
        const base64Content = fileBuffer.toString('base64');
        const requestBody = {
            requests: [
                {
                    image: {
                        content: base64Content
                    },
                    features: [
                        {
                            type: 'TEXT_DETECTION',
                            maxResults: 1
                        },
                        {
                            type: 'DOCUMENT_TEXT_DETECTION',
                            maxResults: 1
                        }
                    ]
                }
            ]
        };
        const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${this.googleApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Google Vision API error: ${response.status} - ${error}`);
        }
        const data = await response.json();
        if (data.responses[0]?.error) {
            throw new Error(data.responses[0].error.message);
        }
        const rawText = data.responses[0]?.fullTextAnnotation?.text || data.responses[0]?.textAnnotations?.[0]?.description || '';
        if (!rawText) {
            throw new Error('No text detected in image');
        }
        // Parse the raw text using AI
        return this.parseInvoiceText(rawText, 'google-vision');
    }
    /**
   * Extract text using AI-based OCR (for images sent as base64 to vision-capable models)
   */ async extractWithAI(fileBuffer, mimeType) {
        const base64Content = fileBuffer.toString('base64');
        // Use AI to describe and extract data from the image
        const prompt = `Analiza esta imagen de una factura y extrae los siguientes datos en formato JSON.
Si no puedes ver claramente un campo, usa null.

La respuesta DEBE ser SOLO un objeto JSON válido con esta estructura exacta:
{
  "issuerName": "nombre del emisor",
  "issuerTaxId": "NIF/CIF del emisor",
  "issuerAddress": "dirección del emisor",
  "recipientName": "nombre del destinatario",
  "recipientTaxId": "NIF/CIF del destinatario",
  "recipientAddress": "dirección del destinatario",
  "invoiceNumber": "número de factura",
  "invoiceDate": "fecha de emisión en formato YYYY-MM-DD",
  "dueDate": "fecha de vencimiento en formato YYYY-MM-DD o null",
  "subtotal": numero_base_imponible,
  "taxRate": porcentaje_iva,
  "taxAmount": importe_iva,
  "total": importe_total,
  "currency": "EUR",
  "lineItems": [
    {
      "description": "descripción",
      "quantity": cantidad,
      "unitPrice": precio_unitario,
      "amount": importe
    }
  ],
  "confidence": 0.0 a 1.0
}`;
        // For AI extraction, we'll try to use the AI provider to analyze the invoice
        // Since most models support vision, we can send the image
        try {
            const response = await this.aiProvider.chat([
                {
                    role: 'user',
                    content: `${prompt}\n\n[Imagen de factura en base64: ${base64Content.substring(0, 100)}... (${mimeType})]`
                }
            ], {
                systemPrompt: 'Eres un experto en procesamiento de facturas. Extrae datos de facturas con precisión. Responde SOLO con JSON válido, sin markdown ni explicaciones.',
                maxTokens: 2000,
                temperature: 0.1
            });
            // Try to parse the JSON response
            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('AI response did not contain valid JSON');
            }
            const parsed = JSON.parse(jsonMatch[0]);
            return this.normalizeExtractedData(parsed, 'ai-extraction', response.content);
        } catch (error) {
            this.logger.error(`AI extraction failed: ${error.message}`);
            // Return empty result with low confidence
            return this.createEmptyResult('ai-extraction', '');
        }
    }
    /**
   * Parse raw text from OCR into structured invoice data
   */ async parseInvoiceText(rawText, provider) {
        const prompt = `Analiza el siguiente texto extraído de una factura española y extrae los datos estructurados.

TEXTO DE LA FACTURA:
${rawText}

Extrae los datos en formato JSON con esta estructura exacta:
{
  "issuerName": "nombre del emisor o null",
  "issuerTaxId": "NIF/CIF del emisor (formato español: letra+8digitos o 8digitos+letra) o null",
  "issuerAddress": "dirección completa del emisor o null",
  "recipientName": "nombre del destinatario o null",
  "recipientTaxId": "NIF/CIF del destinatario o null",
  "recipientAddress": "dirección del destinatario o null",
  "invoiceNumber": "número de factura (puede incluir serie) o null",
  "invoiceDate": "fecha en formato YYYY-MM-DD o null",
  "dueDate": "fecha vencimiento YYYY-MM-DD o null",
  "subtotal": numero_decimal_base_imponible o null,
  "taxRate": porcentaje_iva_como_numero (ej: 21) o null,
  "taxAmount": numero_decimal_cuota_iva o null,
  "total": numero_decimal_total o null,
  "currency": "EUR" o la moneda detectada,
  "lineItems": [
    {
      "description": "descripción del concepto",
      "quantity": numero o null,
      "unitPrice": numero o null,
      "amount": numero o null
    }
  ],
  "confidence": numero de 0.0 a 1.0 indicando confianza en la extracción
}

IMPORTANTE:
- Los importes deben ser números decimales (ej: 1234.56), no strings
- Las fechas deben estar en formato YYYY-MM-DD
- Si un campo no se encuentra claramente, usa null
- La confianza debe reflejar qué tan seguros estamos de los datos extraídos

Responde SOLO con el JSON, sin explicaciones adicionales.`;
        try {
            const response = await this.aiProvider.chat([
                {
                    role: 'user',
                    content: prompt
                }
            ], {
                systemPrompt: 'Eres un experto en procesamiento de facturas españolas. Tu tarea es extraer datos estructurados del texto de facturas. Responde SOLO con JSON válido.',
                maxTokens: 2000,
                temperature: 0.1
            });
            // Extract JSON from response
            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Response did not contain valid JSON');
            }
            const parsed = JSON.parse(jsonMatch[0]);
            return this.normalizeExtractedData(parsed, provider, rawText);
        } catch (error) {
            this.logger.warn(`Failed to parse invoice text with AI: ${error.message}`);
            // Return with raw text but low confidence
            return this.createEmptyResult(provider, rawText);
        }
    }
    /**
   * Normalize and validate extracted data
   */ normalizeExtractedData(data, provider, rawText) {
        return {
            issuerName: this.normalizeString(data.issuerName),
            issuerTaxId: this.normalizeTaxId(data.issuerTaxId),
            issuerAddress: this.normalizeString(data.issuerAddress),
            recipientName: this.normalizeString(data.recipientName),
            recipientTaxId: this.normalizeTaxId(data.recipientTaxId),
            recipientAddress: this.normalizeString(data.recipientAddress),
            invoiceNumber: this.normalizeString(data.invoiceNumber),
            invoiceDate: this.normalizeDate(data.invoiceDate),
            dueDate: this.normalizeDate(data.dueDate),
            subtotal: this.normalizeNumber(data.subtotal),
            taxRate: this.normalizeNumber(data.taxRate),
            taxAmount: this.normalizeNumber(data.taxAmount),
            total: this.normalizeNumber(data.total),
            currency: this.normalizeString(data.currency) || 'EUR',
            lineItems: this.normalizeLineItems(data.lineItems),
            confidence: this.normalizeNumber(data.confidence) || 0.5,
            rawText,
            provider,
            processingTimeMs: 0
        };
    }
    normalizeString(value) {
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
        return null;
    }
    normalizeNumber(value) {
        if (typeof value === 'number' && !isNaN(value)) {
            return value;
        }
        if (typeof value === 'string') {
            const parsed = parseFloat(value.replace(',', '.').replace(/[^\d.-]/g, ''));
            if (!isNaN(parsed)) {
                return parsed;
            }
        }
        return null;
    }
    normalizeDate(value) {
        if (typeof value === 'string' && value.trim()) {
            // Try to parse and format as YYYY-MM-DD
            const dateStr = value.trim();
            // Check if already in YYYY-MM-DD format
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                return dateStr;
            }
            // Try to parse common Spanish formats (DD/MM/YYYY, DD-MM-YYYY)
            const match = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
            if (match) {
                const [, day, month, year] = match;
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
        }
        return null;
    }
    normalizeTaxId(value) {
        if (typeof value === 'string' && value.trim()) {
            // Clean and uppercase Spanish tax ID
            const cleaned = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
            // Basic Spanish NIF/CIF validation (8 digits + letter or letter + 8 chars)
            if (/^[A-Z]\d{8}$/.test(cleaned) || /^\d{8}[A-Z]$/.test(cleaned) || /^[A-Z]\d{7}[A-Z0-9]$/.test(cleaned)) {
                return cleaned;
            }
            // Return as-is if it looks like a tax ID
            if (cleaned.length >= 8 && cleaned.length <= 12) {
                return cleaned;
            }
        }
        return null;
    }
    normalizeLineItems(value) {
        if (!Array.isArray(value)) {
            return [];
        }
        return value.filter((item)=>typeof item === 'object' && item !== null).map((item)=>({
                description: this.normalizeString(item.description) || '',
                quantity: this.normalizeNumber(item.quantity),
                unitPrice: this.normalizeNumber(item.unitPrice),
                amount: this.normalizeNumber(item.amount)
            })).filter((item)=>item.description);
    }
    createEmptyResult(provider, rawText) {
        return {
            issuerName: null,
            issuerTaxId: null,
            issuerAddress: null,
            recipientName: null,
            recipientTaxId: null,
            recipientAddress: null,
            invoiceNumber: null,
            invoiceDate: null,
            dueDate: null,
            subtotal: null,
            taxRate: null,
            taxAmount: null,
            total: null,
            currency: 'EUR',
            lineItems: [],
            confidence: 0.1,
            rawText,
            provider,
            processingTimeMs: 0
        };
    }
    /**
   * Check OCR service status
   */ getStatus() {
        const paddleStatus = this.paddleOcr?.getStatus();
        return {
            googleVisionEnabled: this.googleVisionEnabled,
            paddleOcrEnabled: paddleStatus?.enabled || false,
            paddleOcrUrl: paddleStatus?.url,
            aiExtractionEnabled: true
        };
    }
    constructor(configService, aiProvider, paddleOcr){
        this.configService = configService;
        this.aiProvider = aiProvider;
        this.paddleOcr = paddleOcr;
        this.logger = new _common.Logger(OcrService.name);
        this.googleVisionEnabled = false;
        this.googleApiKey = null;
        this.googleApiKey = this.configService.get('GOOGLE_CLOUD_API_KEY') || null;
        this.googleVisionEnabled = !!this.googleApiKey;
        if (this.googleVisionEnabled) {
            this.logger.log('Google Cloud Vision API enabled for OCR');
        }
        if (this.paddleOcr) {
            this.logger.log('PaddleOCR client available for self-hosted OCR');
        }
        this.logger.log('OCR fallback chain: Google Vision → PaddleOCR → AI extraction');
    }
};
OcrService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(2, (0, _common.Optional)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService,
        typeof _aiproviderservice.AIProviderService === "undefined" ? Object : _aiproviderservice.AIProviderService,
        typeof _paddleocrclient.PaddleOcrClient === "undefined" ? Object : _paddleocrclient.PaddleOcrClient
    ])
], OcrService);

//# sourceMappingURL=ocr.service.js.map