"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CreateCompanyDto", {
    enumerable: true,
    get: function() {
        return CreateCompanyDto;
    }
});
const _classvalidator = require("class-validator");
const _swagger = require("@nestjs/swagger");
const _client = require("@prisma/client");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let CreateCompanyDto = class CreateCompanyDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'My Company S.L.'
    }),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(255),
    _ts_metadata("design:type", String)
], CreateCompanyDto.prototype, "name", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'My Company Sociedad Limitada'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(255),
    _ts_metadata("design:type", String)
], CreateCompanyDto.prototype, "legalName", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'B12345678'
    }),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(20),
    _ts_metadata("design:type", String)
], CreateCompanyDto.prototype, "taxId", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        enum: _client.TaxIdType,
        default: _client.TaxIdType.CIF
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsEnum)(_client.TaxIdType),
    _ts_metadata("design:type", typeof _client.TaxIdType === "undefined" ? Object : _client.TaxIdType)
], CreateCompanyDto.prototype, "taxIdType", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'Calle Principal 123'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(500),
    _ts_metadata("design:type", String)
], CreateCompanyDto.prototype, "address", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'Madrid'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(100),
    _ts_metadata("design:type", String)
], CreateCompanyDto.prototype, "city", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'Madrid'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(100),
    _ts_metadata("design:type", String)
], CreateCompanyDto.prototype, "province", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: '28001'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(10),
    _ts_metadata("design:type", String)
], CreateCompanyDto.prototype, "postalCode", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'ES',
        default: 'ES'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(2),
    _ts_metadata("design:type", String)
], CreateCompanyDto.prototype, "country", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: '+34912345678'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(20),
    _ts_metadata("design:type", String)
], CreateCompanyDto.prototype, "phone", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'info@company.com'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsEmail)(),
    (0, _classvalidator.MaxLength)(255),
    _ts_metadata("design:type", String)
], CreateCompanyDto.prototype, "email", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'https://company.com'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsUrl)(),
    (0, _classvalidator.MaxLength)(255),
    _ts_metadata("design:type", String)
], CreateCompanyDto.prototype, "website", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 1,
        description: 'Fiscal year start month'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsInt)(),
    (0, _classvalidator.Min)(1),
    (0, _classvalidator.Max)(12),
    _ts_metadata("design:type", Number)
], CreateCompanyDto.prototype, "fiscalYearStart", void 0);

//# sourceMappingURL=create-company.dto.js.map