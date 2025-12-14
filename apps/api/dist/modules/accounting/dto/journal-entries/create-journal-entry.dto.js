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
    get CreateJournalEntryDto () {
        return CreateJournalEntryDto;
    },
    get JournalLineDto () {
        return JournalLineDto;
    }
});
const _classvalidator = require("class-validator");
const _classtransformer = require("class-transformer");
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
let JournalLineDto = class JournalLineDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: '572'
    }),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(20),
    _ts_metadata("design:type", String)
], JournalLineDto.prototype, "accountCode", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)(),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(255),
    _ts_metadata("design:type", String)
], JournalLineDto.prototype, "description", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 1000.0
    }),
    (0, _classvalidator.IsNumber)(),
    (0, _classvalidator.Min)(0),
    _ts_metadata("design:type", Number)
], JournalLineDto.prototype, "debit", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 0
    }),
    (0, _classvalidator.IsNumber)(),
    (0, _classvalidator.Min)(0),
    _ts_metadata("design:type", Number)
], JournalLineDto.prototype, "credit", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Crypto amount (for crypto accounts)'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsNumber)(),
    _ts_metadata("design:type", Number)
], JournalLineDto.prototype, "cryptoAmount", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'BTC'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(20),
    _ts_metadata("design:type", String)
], JournalLineDto.prototype, "cryptoAsset", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'EUR price at transaction time'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsNumber)(),
    _ts_metadata("design:type", Number)
], JournalLineDto.prototype, "cryptoPrice", void 0);
let CreateJournalEntryDto = class CreateJournalEntryDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: '2024-01-15'
    }),
    (0, _classvalidator.IsDateString)(),
    _ts_metadata("design:type", String)
], CreateJournalEntryDto.prototype, "date", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'Bank deposit'
    }),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(500),
    _ts_metadata("design:type", String)
], CreateJournalEntryDto.prototype, "description", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'INV-001'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(100),
    _ts_metadata("design:type", String)
], CreateJournalEntryDto.prototype, "reference", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        type: [
            JournalLineDto
        ],
        minItems: 2
    }),
    (0, _classvalidator.IsArray)(),
    (0, _classvalidator.ValidateNested)({
        each: true
    }),
    (0, _classvalidator.ArrayMinSize)(2),
    (0, _classtransformer.Type)(()=>JournalLineDto),
    _ts_metadata("design:type", Array)
], CreateJournalEntryDto.prototype, "lines", void 0);

//# sourceMappingURL=create-journal-entry.dto.js.map