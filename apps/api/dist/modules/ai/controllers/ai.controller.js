"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AiController", {
    enumerable: true,
    get: function() {
        return AiController;
    }
});
const _common = require("@nestjs/common");
const _swagger = require("@nestjs/swagger");
const _platformexpress = require("@nestjs/platform-express");
const _index = require("../../../common/guards");
const _aiservice = require("../services/ai.service.js");
const _ocrservice = require("../services/ocr.service.js");
const _index1 = require("../dto");
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
let AiController = class AiController {
    async chat(dto) {
        const response = await this.aiService.chat(dto.messages, dto.context);
        return {
            response
        };
    }
    async analyzeTransaction(dto) {
        return this.aiService.analyzeTransaction(dto.description);
    }
    async generateReport(dto) {
        const report = await this.aiService.generateReport(dto.reportType, dto.data);
        return {
            report
        };
    }
    async explainCryptoTax(dto) {
        const explanation = await this.aiService.explainCryptoTax(dto.transactions);
        return {
            explanation
        };
    }
    // ============================================================================
    // OCR Endpoints
    // ============================================================================
    async extractInvoice(file) {
        if (!file) {
            throw new _common.BadRequestException('No file provided');
        }
        const result = await this.ocrService.extractInvoiceData(file.buffer, file.mimetype);
        return {
            success: result.success,
            data: result.data ? {
                ...result.data
            } : null,
            error: result.error
        };
    }
    getOcrStatus() {
        return this.ocrService.getStatus();
    }
    constructor(aiService, ocrService){
        this.aiService = aiService;
        this.ocrService = ocrService;
    }
};
_ts_decorate([
    (0, _common.Post)('chat'),
    (0, _swagger.ApiOperation)({
        summary: 'Chat with AI assistant'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'AI response'
    }),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _index1.ChatRequestDto === "undefined" ? Object : _index1.ChatRequestDto
    ]),
    _ts_metadata("design:returntype", Promise)
], AiController.prototype, "chat", null);
_ts_decorate([
    (0, _common.Post)('analyze-transaction'),
    (0, _swagger.ApiOperation)({
        summary: 'Analyze a transaction and suggest accounts'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Analysis result'
    }),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _index1.AnalyzeTransactionDto === "undefined" ? Object : _index1.AnalyzeTransactionDto
    ]),
    _ts_metadata("design:returntype", Promise)
], AiController.prototype, "analyzeTransaction", null);
_ts_decorate([
    (0, _common.Post)('generate-report'),
    (0, _swagger.ApiOperation)({
        summary: 'Generate an AI-powered report'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Generated report'
    }),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _index1.GenerateReportDto === "undefined" ? Object : _index1.GenerateReportDto
    ]),
    _ts_metadata("design:returntype", Promise)
], AiController.prototype, "generateReport", null);
_ts_decorate([
    (0, _common.Post)('explain-crypto-tax'),
    (0, _swagger.ApiOperation)({
        summary: 'Explain crypto tax implications'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Tax explanation'
    }),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _index1.ExplainCryptoTaxDto === "undefined" ? Object : _index1.ExplainCryptoTaxDto
    ]),
    _ts_metadata("design:returntype", Promise)
], AiController.prototype, "explainCryptoTax", null);
_ts_decorate([
    (0, _common.Post)('ocr/extract-invoice'),
    (0, _swagger.ApiOperation)({
        summary: 'Extract invoice data from image/PDF using OCR',
        description: 'Upload an invoice image (JPEG, PNG) or PDF to extract structured data using OCR and AI.'
    }),
    (0, _swagger.ApiConsumes)('multipart/form-data'),
    (0, _swagger.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Invoice image (JPEG, PNG) or PDF file'
                }
            },
            required: [
                'file'
            ]
        }
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Extracted invoice data',
        type: _index1.OcrResponseDto
    }),
    (0, _swagger.ApiResponse)({
        status: 400,
        description: 'Invalid file type or no file provided'
    }),
    (0, _common.UseInterceptors)((0, _platformexpress.FileInterceptor)('file', {
        limits: {
            fileSize: 10 * 1024 * 1024
        },
        fileFilter: (req, file, callback)=>{
            const allowedMimes = [
                'image/jpeg',
                'image/png',
                'image/webp',
                'application/pdf'
            ];
            if (allowedMimes.includes(file.mimetype)) {
                callback(null, true);
            } else {
                callback(new _common.BadRequestException(`Invalid file type. Allowed: ${allowedMimes.join(', ')}`), false);
            }
        }
    })),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    _ts_param(0, (0, _common.UploadedFile)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Express === "undefined" || typeof Express.Multer === "undefined" || typeof Express.Multer.File === "undefined" ? Object : Express.Multer.File
    ]),
    _ts_metadata("design:returntype", Promise)
], AiController.prototype, "extractInvoice", null);
_ts_decorate([
    (0, _common.Get)('ocr/status'),
    (0, _swagger.ApiOperation)({
        summary: 'Get OCR service status',
        description: 'Check which OCR providers are available and enabled.'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'OCR service status',
        type: _index1.OcrStatusResponseDto
    }),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", typeof _index1.OcrStatusResponseDto === "undefined" ? Object : _index1.OcrStatusResponseDto)
], AiController.prototype, "getOcrStatus", null);
AiController = _ts_decorate([
    (0, _swagger.ApiTags)('AI Assistant'),
    (0, _swagger.ApiBearerAuth)(),
    (0, _common.UseGuards)(_index.JwtAuthGuard),
    (0, _common.Controller)('ai'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _aiservice.AiService === "undefined" ? Object : _aiservice.AiService,
        typeof _ocrservice.OcrService === "undefined" ? Object : _ocrservice.OcrService
    ])
], AiController);

//# sourceMappingURL=ai.controller.js.map