"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CreateSeriesDto", {
    enumerable: true,
    get: function() {
        return CreateSeriesDto;
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
let CreateSeriesDto = class CreateSeriesDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'F',
        description: 'Series prefix (e.g., F for facturas, R for rectificativas)'
    }),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(10),
    _ts_metadata("design:type", String)
], CreateSeriesDto.prototype, "prefix", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'Standard Sales Invoices',
        description: 'Series name/description'
    }),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(100),
    _ts_metadata("design:type", String)
], CreateSeriesDto.prototype, "name", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 1,
        description: 'Next number to use',
        default: 1
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsNumber)(),
    (0, _classvalidator.Min)(1),
    _ts_metadata("design:type", Number)
], CreateSeriesDto.prototype, "nextNumber", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: true,
        description: 'Whether this is the default series for sales invoices'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsBoolean)(),
    _ts_metadata("design:type", Boolean)
], CreateSeriesDto.prototype, "isDefault", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: true,
        description: 'Whether this series is for sales (true) or purchases (false)'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsBoolean)(),
    _ts_metadata("design:type", Boolean)
], CreateSeriesDto.prototype, "isSales", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)(),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsBoolean)(),
    _ts_metadata("design:type", Boolean)
], CreateSeriesDto.prototype, "isActive", void 0);

//# sourceMappingURL=create-series.dto.js.map