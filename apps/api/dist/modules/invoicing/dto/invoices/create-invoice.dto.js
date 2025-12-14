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
    get CreateInvoiceDto () {
        return CreateInvoiceDto;
    },
    get InvoiceLineDto () {
        return InvoiceLineDto;
    },
    get InvoiceType () {
        return InvoiceType;
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
var InvoiceType = /*#__PURE__*/ function(InvoiceType) {
    InvoiceType["STANDARD"] = "STANDARD";
    InvoiceType["RECTIFICATIVE"] = "RECTIFICATIVE";
    InvoiceType["SIMPLIFIED"] = "SIMPLIFIED";
    return InvoiceType;
}({});
let InvoiceLineDto = class InvoiceLineDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'Consulting services'
    }),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(500),
    _ts_metadata("design:type", String)
], InvoiceLineDto.prototype, "description", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 2,
        minimum: 0
    }),
    (0, _classvalidator.IsNumber)(),
    (0, _classvalidator.Min)(0),
    _ts_metadata("design:type", Number)
], InvoiceLineDto.prototype, "quantity", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 100.0,
        minimum: 0
    }),
    (0, _classvalidator.IsNumber)(),
    (0, _classvalidator.Min)(0),
    _ts_metadata("design:type", Number)
], InvoiceLineDto.prototype, "unitPrice", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 21,
        description: 'VAT rate percentage'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsNumber)(),
    (0, _classvalidator.Min)(0),
    (0, _classvalidator.Max)(100),
    _ts_metadata("design:type", Number)
], InvoiceLineDto.prototype, "vatRate", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 0,
        description: 'Discount percentage'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsNumber)(),
    (0, _classvalidator.Min)(0),
    (0, _classvalidator.Max)(100),
    _ts_metadata("design:type", Number)
], InvoiceLineDto.prototype, "discountPercent", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Optional account code for accounting integration'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], InvoiceLineDto.prototype, "accountCode", void 0);
let CreateInvoiceDto = class CreateInvoiceDto {
};
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Contact (customer/supplier) ID'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsUUID)(),
    _ts_metadata("design:type", String)
], CreateInvoiceDto.prototype, "contactId", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Counterparty name (when no contact is selected)'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(200),
    _ts_metadata("design:type", String)
], CreateInvoiceDto.prototype, "counterpartyName", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Counterparty tax ID (NIF/CIF)'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(20),
    _ts_metadata("design:type", String)
], CreateInvoiceDto.prototype, "counterpartyTaxId", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Counterparty address'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(500),
    _ts_metadata("design:type", String)
], CreateInvoiceDto.prototype, "counterpartyAddress", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Counterparty city'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(100),
    _ts_metadata("design:type", String)
], CreateInvoiceDto.prototype, "counterpartyCity", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Counterparty country (ISO code)',
        example: 'ES'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(2),
    _ts_metadata("design:type", String)
], CreateInvoiceDto.prototype, "counterpartyCountry", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        enum: InvoiceType,
        default: "STANDARD"
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsEnum)(InvoiceType),
    _ts_metadata("design:type", String)
], CreateInvoiceDto.prototype, "type", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Invoice series ID. If not provided, default series will be used'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsUUID)(),
    _ts_metadata("design:type", String)
], CreateInvoiceDto.prototype, "seriesId", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: '2024-01-15',
        description: 'Invoice date'
    }),
    (0, _classvalidator.IsDateString)(),
    _ts_metadata("design:type", String)
], CreateInvoiceDto.prototype, "date", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: '2024-02-15',
        description: 'Due date for payment'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsDateString)(),
    _ts_metadata("design:type", String)
], CreateInvoiceDto.prototype, "dueDate", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Notes/description for the invoice'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateInvoiceDto.prototype, "notes", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Original invoice number (for rectificative invoices)'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateInvoiceDto.prototype, "originalInvoiceNumber", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Original invoice ID (for rectificative invoices)'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsUUID)(),
    _ts_metadata("design:type", String)
], CreateInvoiceDto.prototype, "originalInvoiceId", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        type: [
            InvoiceLineDto
        ],
        description: 'Invoice lines'
    }),
    (0, _classvalidator.IsArray)(),
    (0, _classvalidator.ValidateNested)({
        each: true
    }),
    (0, _classtransformer.Type)(()=>InvoiceLineDto),
    _ts_metadata("design:type", Array)
], CreateInvoiceDto.prototype, "lines", void 0);

//# sourceMappingURL=create-invoice.dto.js.map