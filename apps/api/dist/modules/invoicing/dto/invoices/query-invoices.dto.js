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
    get InvoiceDirection () {
        return InvoiceDirection;
    },
    get InvoiceStatus () {
        return InvoiceStatus;
    },
    get QueryInvoicesDto () {
        return QueryInvoicesDto;
    }
});
const _classvalidator = require("class-validator");
const _swagger = require("@nestjs/swagger");
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
var InvoiceStatus = /*#__PURE__*/ function(InvoiceStatus) {
    InvoiceStatus["DRAFT"] = "DRAFT";
    InvoiceStatus["ISSUED"] = "ISSUED";
    InvoiceStatus["SENT"] = "SENT";
    InvoiceStatus["PAID"] = "PAID";
    InvoiceStatus["CANCELLED"] = "CANCELLED";
    return InvoiceStatus;
}({});
var InvoiceDirection = /*#__PURE__*/ function(InvoiceDirection) {
    InvoiceDirection["ISSUED"] = "ISSUED";
    InvoiceDirection["RECEIVED"] = "RECEIVED";
    return InvoiceDirection;
}({});
let QueryInvoicesDto = class QueryInvoicesDto {
};
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)(),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], QueryInvoicesDto.prototype, "search", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        enum: InvoiceStatus
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsEnum)(InvoiceStatus),
    _ts_metadata("design:type", String)
], QueryInvoicesDto.prototype, "status", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        enum: InvoiceDirection
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsEnum)(InvoiceDirection),
    _ts_metadata("design:type", String)
], QueryInvoicesDto.prototype, "direction", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)(),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsUUID)(),
    _ts_metadata("design:type", String)
], QueryInvoicesDto.prototype, "contactId", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)(),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsUUID)(),
    _ts_metadata("design:type", String)
], QueryInvoicesDto.prototype, "seriesId", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)(),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsDateString)(),
    _ts_metadata("design:type", String)
], QueryInvoicesDto.prototype, "startDate", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)(),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsDateString)(),
    _ts_metadata("design:type", String)
], QueryInvoicesDto.prototype, "endDate", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Filter by Verifactu registration status'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classtransformer.Transform)(({ value })=>value === 'true' || value === true),
    (0, _classvalidator.IsBoolean)(),
    _ts_metadata("design:type", Boolean)
], QueryInvoicesDto.prototype, "verifactuRegistered", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        default: 0
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classtransformer.Transform)(({ value })=>parseInt(value, 10)),
    _ts_metadata("design:type", Number)
], QueryInvoicesDto.prototype, "skip", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        default: 50
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classtransformer.Transform)(({ value })=>parseInt(value, 10)),
    _ts_metadata("design:type", Number)
], QueryInvoicesDto.prototype, "take", void 0);

//# sourceMappingURL=query-invoices.dto.js.map