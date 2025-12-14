"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CreateAccountDto", {
    enumerable: true,
    get: function() {
        return CreateAccountDto;
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
let CreateAccountDto = class CreateAccountDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: '572001'
    }),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(20),
    _ts_metadata("design:type", String)
], CreateAccountDto.prototype, "code", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'Bank Santander EUR'
    }),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(255),
    _ts_metadata("design:type", String)
], CreateAccountDto.prototype, "name", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        enum: _client.AccountType
    }),
    (0, _classvalidator.IsEnum)(_client.AccountType),
    _ts_metadata("design:type", typeof _client.AccountType === "undefined" ? Object : _client.AccountType)
], CreateAccountDto.prototype, "type", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: '572'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(20),
    _ts_metadata("design:type", String)
], CreateAccountDto.prototype, "parentCode", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)(),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateAccountDto.prototype, "description", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        default: false
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsBoolean)(),
    _ts_metadata("design:type", Boolean)
], CreateAccountDto.prototype, "isCrypto", void 0);

//# sourceMappingURL=create-account.dto.js.map