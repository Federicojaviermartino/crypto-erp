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
    get BatchCategorizeDto () {
        return BatchCategorizeDto;
    },
    get BatchCategorizeResponseDto () {
        return BatchCategorizeResponseDto;
    },
    get BatchJobStatusResponseDto () {
        return BatchJobStatusResponseDto;
    }
});
const _classvalidator = require("class-validator");
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
let BatchCategorizeDto = class BatchCategorizeDto {
};
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Array of specific transaction IDs to categorize',
        type: [
            String
        ],
        example: [
            'tx-123',
            'tx-456',
            'tx-789'
        ]
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsArray)(),
    (0, _classvalidator.IsString)({
        each: true
    }),
    _ts_metadata("design:type", Array)
], BatchCategorizeDto.prototype, "transactionIds", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Wallet ID to categorize all uncategorized transactions',
        example: 'wallet-123'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], BatchCategorizeDto.prototype, "walletId", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Start date for date range filter (ISO 8601)',
        example: '2024-01-01'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsDateString)(),
    _ts_metadata("design:type", String)
], BatchCategorizeDto.prototype, "startDate", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'End date for date range filter (ISO 8601)',
        example: '2024-12-31'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsDateString)(),
    _ts_metadata("design:type", String)
], BatchCategorizeDto.prototype, "endDate", void 0);
let BatchCategorizeResponseDto = class BatchCategorizeResponseDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'BullMQ job ID for tracking progress',
        example: 'batch-cat-1234567890'
    }),
    _ts_metadata("design:type", String)
], BatchCategorizeResponseDto.prototype, "jobId", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Number of transactions queued for categorization',
        example: 42
    }),
    _ts_metadata("design:type", Number)
], BatchCategorizeResponseDto.prototype, "transactionCount", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Estimated time to completion in seconds',
        example: 120
    }),
    _ts_metadata("design:type", Number)
], BatchCategorizeResponseDto.prototype, "estimatedTime", void 0);
let BatchJobStatusResponseDto = class BatchJobStatusResponseDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Job ID',
        example: 'batch-cat-1234567890'
    }),
    _ts_metadata("design:type", String)
], BatchJobStatusResponseDto.prototype, "jobId", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Current job state',
        enum: [
            'waiting',
            'active',
            'completed',
            'failed',
            'delayed'
        ],
        example: 'active'
    }),
    _ts_metadata("design:type", String)
], BatchJobStatusResponseDto.prototype, "state", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Progress percentage (0-100)',
        example: 67
    }),
    _ts_metadata("design:type", Number)
], BatchJobStatusResponseDto.prototype, "progress", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Result data (available when completed)',
        type: 'object',
        example: {
            success: true,
            processedCount: 42,
            successCount: 40,
            failedIds: [
                'tx-123',
                'tx-456'
            ]
        }
    }),
    _ts_metadata("design:type", Object)
], BatchJobStatusResponseDto.prototype, "result", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Error message (if failed)',
        example: 'No AI provider configured'
    }),
    _ts_metadata("design:type", String)
], BatchJobStatusResponseDto.prototype, "error", void 0);

//# sourceMappingURL=batch-categorize.dto.js.map