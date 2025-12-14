"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get OcrExtractedDataDto () {
        return OcrExtractedDataDto;
    },
    get OcrResponseDto () {
        return OcrResponseDto;
    },
    get OcrResponseLineItemDto () {
        return OcrResponseLineItemDto;
    },
    get OcrStatusResponseDto () {
        return OcrStatusResponseDto;
    }
});
const _swagger = require("@nestjs/swagger");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let OcrResponseLineItemDto = class OcrResponseLineItemDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Line item description'
    }),
    _ts_metadata("design:type", String)
], OcrResponseLineItemDto.prototype, "description", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Quantity',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], OcrResponseLineItemDto.prototype, "quantity", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Unit price',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], OcrResponseLineItemDto.prototype, "unitPrice", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Line amount',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], OcrResponseLineItemDto.prototype, "amount", void 0);
let OcrExtractedDataDto = class OcrExtractedDataDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Issuer name',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], OcrExtractedDataDto.prototype, "issuerName", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Issuer tax ID (NIF/CIF)',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], OcrExtractedDataDto.prototype, "issuerTaxId", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Issuer address',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], OcrExtractedDataDto.prototype, "issuerAddress", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Recipient name',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], OcrExtractedDataDto.prototype, "recipientName", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Recipient tax ID',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], OcrExtractedDataDto.prototype, "recipientTaxId", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Recipient address',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], OcrExtractedDataDto.prototype, "recipientAddress", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Invoice number',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], OcrExtractedDataDto.prototype, "invoiceNumber", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Invoice date (YYYY-MM-DD)',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], OcrExtractedDataDto.prototype, "invoiceDate", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Due date (YYYY-MM-DD)',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], OcrExtractedDataDto.prototype, "dueDate", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Subtotal amount',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], OcrExtractedDataDto.prototype, "subtotal", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Tax rate percentage',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], OcrExtractedDataDto.prototype, "taxRate", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Tax amount',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], OcrExtractedDataDto.prototype, "taxAmount", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Total amount',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], OcrExtractedDataDto.prototype, "total", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Currency code',
        default: 'EUR'
    }),
    _ts_metadata("design:type", String)
], OcrExtractedDataDto.prototype, "currency", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        type: [
            OcrResponseLineItemDto
        ],
        description: 'Invoice line items'
    }),
    _ts_metadata("design:type", Array)
], OcrExtractedDataDto.prototype, "lineItems", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Extraction confidence (0-1)'
    }),
    _ts_metadata("design:type", Number)
], OcrExtractedDataDto.prototype, "confidence", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'OCR provider used',
        enum: [
            'google-vision',
            'paddleocr',
            'ai-extraction'
        ]
    }),
    _ts_metadata("design:type", String)
], OcrExtractedDataDto.prototype, "provider", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Processing time in milliseconds'
    }),
    _ts_metadata("design:type", Number)
], OcrExtractedDataDto.prototype, "processingTimeMs", void 0);
let OcrResponseDto = class OcrResponseDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Whether extraction was successful'
    }),
    _ts_metadata("design:type", Boolean)
], OcrResponseDto.prototype, "success", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        type: OcrExtractedDataDto,
        nullable: true,
        description: 'Extracted invoice data'
    }),
    _ts_metadata("design:type", Object)
], OcrResponseDto.prototype, "data", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Error message if extraction failed',
        nullable: true
    }),
    _ts_metadata("design:type", String)
], OcrResponseDto.prototype, "error", void 0);
let OcrStatusResponseDto = class OcrStatusResponseDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Whether Google Vision API is enabled'
    }),
    _ts_metadata("design:type", Boolean)
], OcrStatusResponseDto.prototype, "googleVisionEnabled", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Whether PaddleOCR is enabled'
    }),
    _ts_metadata("design:type", Boolean)
], OcrStatusResponseDto.prototype, "paddleOcrEnabled", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'PaddleOCR service URL',
        nullable: true
    }),
    _ts_metadata("design:type", String)
], OcrStatusResponseDto.prototype, "paddleOcrUrl", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Whether AI-based extraction is available'
    }),
    _ts_metadata("design:type", Boolean)
], OcrStatusResponseDto.prototype, "aiExtractionEnabled", void 0);

//# sourceMappingURL=ocr.dto.js.map