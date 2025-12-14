"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "QueryAccountsDto", {
    enumerable: true,
    get: function() {
        return QueryAccountsDto;
    }
});
const _classvalidator = require("class-validator");
const _classtransformer = require("class-transformer");
const _swagger = require("@nestjs/swagger");
const _client = require("@prisma/client");
const _paginationdto = require("../../../../common/dto/pagination.dto.js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let QueryAccountsDto = class QueryAccountsDto extends _paginationdto.PaginationDto {
};
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        enum: _client.AccountType
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsEnum)(_client.AccountType),
    _ts_metadata("design:type", typeof _client.AccountType === "undefined" ? Object : _client.AccountType)
], QueryAccountsDto.prototype, "type", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)(),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], QueryAccountsDto.prototype, "search", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)(),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], QueryAccountsDto.prototype, "parentCode", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)(),
    (0, _classvalidator.IsOptional)(),
    (0, _classtransformer.Transform)(({ value })=>value === 'true'),
    (0, _classvalidator.IsBoolean)(),
    _ts_metadata("design:type", Boolean)
], QueryAccountsDto.prototype, "isCrypto", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        default: true
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classtransformer.Transform)(({ value })=>value === 'true'),
    (0, _classvalidator.IsBoolean)(),
    _ts_metadata("design:type", Boolean)
], QueryAccountsDto.prototype, "isActive", void 0);

//# sourceMappingURL=query-accounts.dto.js.map