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
    get ContactType () {
        return ContactType;
    },
    get CreateContactDto () {
        return CreateContactDto;
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
var ContactType = /*#__PURE__*/ function(ContactType) {
    ContactType["CUSTOMER"] = "CUSTOMER";
    ContactType["SUPPLIER"] = "SUPPLIER";
    ContactType["BOTH"] = "BOTH";
    return ContactType;
}({});
let CreateContactDto = class CreateContactDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'Acme Corporation S.L.'
    }),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(200),
    _ts_metadata("design:type", String)
], CreateContactDto.prototype, "name", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'B12345678'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(20),
    _ts_metadata("design:type", String)
], CreateContactDto.prototype, "taxId", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        enum: ContactType,
        default: "CUSTOMER"
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsEnum)(ContactType),
    _ts_metadata("design:type", String)
], CreateContactDto.prototype, "type", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'contact@acme.com'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsEmail)(),
    _ts_metadata("design:type", String)
], CreateContactDto.prototype, "email", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: '+34 912 345 678'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(30),
    _ts_metadata("design:type", String)
], CreateContactDto.prototype, "phone", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'Calle Mayor 123'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(200),
    _ts_metadata("design:type", String)
], CreateContactDto.prototype, "address", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'Madrid'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(100),
    _ts_metadata("design:type", String)
], CreateContactDto.prototype, "city", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'Madrid'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(100),
    _ts_metadata("design:type", String)
], CreateContactDto.prototype, "state", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: '28001'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(20),
    _ts_metadata("design:type", String)
], CreateContactDto.prototype, "postalCode", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'ES',
        description: 'ISO 3166-1 alpha-2 country code'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(2),
    _ts_metadata("design:type", String)
], CreateContactDto.prototype, "country", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)(),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateContactDto.prototype, "notes", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        default: true
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsBoolean)(),
    _ts_metadata("design:type", Boolean)
], CreateContactDto.prototype, "isActive", void 0);

//# sourceMappingURL=create-contact.dto.js.map