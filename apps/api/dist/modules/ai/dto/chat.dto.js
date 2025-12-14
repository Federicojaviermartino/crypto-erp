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
    get AnalyzeTransactionDto () {
        return AnalyzeTransactionDto;
    },
    get ChatRequestDto () {
        return ChatRequestDto;
    },
    get ExplainCryptoTaxDto () {
        return ExplainCryptoTaxDto;
    },
    get GenerateReportDto () {
        return GenerateReportDto;
    }
});
const _swagger = require("@nestjs/swagger");
const _classvalidator = require("class-validator");
const _classtransformer = require("class-transformer");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let ChatMessageDto = class ChatMessageDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        enum: [
            'user',
            'assistant'
        ],
        description: 'Message role'
    }),
    (0, _classvalidator.IsIn)([
        'user',
        'assistant'
    ]),
    _ts_metadata("design:type", String)
], ChatMessageDto.prototype, "role", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Message content'
    }),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], ChatMessageDto.prototype, "content", void 0);
let AiContextDto = class AiContextDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        required: false,
        description: 'Company name'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], AiContextDto.prototype, "companyName", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        required: false,
        description: 'Current fiscal year'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], AiContextDto.prototype, "fiscalYear", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        required: false,
        description: 'Recent transactions summary'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], AiContextDto.prototype, "recentTransactions", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        required: false,
        description: 'Account balances summary'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], AiContextDto.prototype, "accountBalances", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        required: false,
        enum: [
            'es',
            'en'
        ],
        description: 'Response language (Spanish or English)',
        default: 'es'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsIn)([
        'es',
        'en'
    ]),
    _ts_metadata("design:type", String)
], AiContextDto.prototype, "language", void 0);
let ChatRequestDto = class ChatRequestDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        type: [
            ChatMessageDto
        ],
        description: 'Conversation messages'
    }),
    (0, _classvalidator.IsArray)(),
    (0, _classvalidator.ValidateNested)({
        each: true
    }),
    (0, _classtransformer.Type)(()=>ChatMessageDto),
    _ts_metadata("design:type", Array)
], ChatRequestDto.prototype, "messages", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        required: false,
        type: AiContextDto,
        description: 'Additional context'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.ValidateNested)(),
    (0, _classtransformer.Type)(()=>AiContextDto),
    _ts_metadata("design:type", typeof AiContextDto === "undefined" ? Object : AiContextDto)
], ChatRequestDto.prototype, "context", void 0);
let AnalyzeTransactionDto = class AnalyzeTransactionDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Transaction description to analyze'
    }),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], AnalyzeTransactionDto.prototype, "description", void 0);
let GenerateReportDto = class GenerateReportDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        enum: [
            'summary',
            'recommendations',
            'tax-planning'
        ],
        description: 'Type of report to generate'
    }),
    (0, _classvalidator.IsIn)([
        'summary',
        'recommendations',
        'tax-planning'
    ]),
    _ts_metadata("design:type", String)
], GenerateReportDto.prototype, "reportType", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Data for the report'
    }),
    _ts_metadata("design:type", typeof Record === "undefined" ? Object : Record)
], GenerateReportDto.prototype, "data", void 0);
let ExplainCryptoTaxDto = class ExplainCryptoTaxDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Array of crypto transactions',
        type: 'array',
        items: {
            type: 'object',
            properties: {
                type: {
                    type: 'string'
                },
                amount: {
                    type: 'number'
                },
                gainLoss: {
                    type: 'number'
                }
            }
        }
    }),
    (0, _classvalidator.IsArray)(),
    _ts_metadata("design:type", typeof Array === "undefined" ? Object : Array)
], ExplainCryptoTaxDto.prototype, "transactions", void 0);

//# sourceMappingURL=chat.dto.js.map