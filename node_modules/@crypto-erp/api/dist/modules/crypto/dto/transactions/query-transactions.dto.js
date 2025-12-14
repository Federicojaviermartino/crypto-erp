"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "QueryCryptoTransactionsDto", {
    enumerable: true,
    get: function() {
        return QueryCryptoTransactionsDto;
    }
});
const _classvalidator = require("class-validator");
const _swagger = require("@nestjs/swagger");
const _classtransformer = require("class-transformer");
const _createtransactiondto = require("./create-transaction.dto.js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let QueryCryptoTransactionsDto = class QueryCryptoTransactionsDto {
};
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        enum: _createtransactiondto.CryptoTransactionType
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsEnum)(_createtransactiondto.CryptoTransactionType),
    _ts_metadata("design:type", typeof _createtransactiondto.CryptoTransactionType === "undefined" ? Object : _createtransactiondto.CryptoTransactionType)
], QueryCryptoTransactionsDto.prototype, "type", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)(),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsUUID)(),
    _ts_metadata("design:type", String)
], QueryCryptoTransactionsDto.prototype, "assetId", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)(),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], QueryCryptoTransactionsDto.prototype, "exchange", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)(),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsDateString)(),
    _ts_metadata("design:type", String)
], QueryCryptoTransactionsDto.prototype, "startDate", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)(),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsDateString)(),
    _ts_metadata("design:type", String)
], QueryCryptoTransactionsDto.prototype, "endDate", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        default: 0
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classtransformer.Transform)(({ value })=>parseInt(value, 10)),
    _ts_metadata("design:type", Number)
], QueryCryptoTransactionsDto.prototype, "skip", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        default: 50
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classtransformer.Transform)(({ value })=>parseInt(value, 10)),
    _ts_metadata("design:type", Number)
], QueryCryptoTransactionsDto.prototype, "take", void 0);

//# sourceMappingURL=query-transactions.dto.js.map