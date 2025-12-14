"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "QueryContactsDto", {
    enumerable: true,
    get: function() {
        return QueryContactsDto;
    }
});
const _classvalidator = require("class-validator");
const _swagger = require("@nestjs/swagger");
const _classtransformer = require("class-transformer");
const _createcontactdto = require("./create-contact.dto.js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let QueryContactsDto = class QueryContactsDto {
};
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)(),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], QueryContactsDto.prototype, "search", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        enum: _createcontactdto.ContactType
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsEnum)(_createcontactdto.ContactType),
    _ts_metadata("design:type", typeof _createcontactdto.ContactType === "undefined" ? Object : _createcontactdto.ContactType)
], QueryContactsDto.prototype, "type", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)(),
    (0, _classvalidator.IsOptional)(),
    (0, _classtransformer.Transform)(({ value })=>value === 'true' || value === true),
    (0, _classvalidator.IsBoolean)(),
    _ts_metadata("design:type", Boolean)
], QueryContactsDto.prototype, "isActive", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        default: 0
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classtransformer.Transform)(({ value })=>parseInt(value, 10)),
    _ts_metadata("design:type", Number)
], QueryContactsDto.prototype, "skip", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        default: 50
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classtransformer.Transform)(({ value })=>parseInt(value, 10)),
    _ts_metadata("design:type", Number)
], QueryContactsDto.prototype, "take", void 0);

//# sourceMappingURL=query-contacts.dto.js.map