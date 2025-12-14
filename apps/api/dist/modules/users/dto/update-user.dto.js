"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UpdateUserDto", {
    enumerable: true,
    get: function() {
        return UpdateUserDto;
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
let UpdateUserDto = class UpdateUserDto {
};
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'John'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(100),
    _ts_metadata("design:type", String)
], UpdateUserDto.prototype, "firstName", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'Doe'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(100),
    _ts_metadata("design:type", String)
], UpdateUserDto.prototype, "lastName", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'https://example.com/avatar.jpg'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsUrl)(),
    (0, _classvalidator.MaxLength)(500),
    _ts_metadata("design:type", String)
], UpdateUserDto.prototype, "avatarUrl", void 0);

//# sourceMappingURL=update-user.dto.js.map