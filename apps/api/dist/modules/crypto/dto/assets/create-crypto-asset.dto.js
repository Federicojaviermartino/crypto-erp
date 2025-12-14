"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CreateCryptoAssetDto", {
    enumerable: true,
    get: function() {
        return CreateCryptoAssetDto;
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
let CreateCryptoAssetDto = class CreateCryptoAssetDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'BTC',
        description: 'Ticker symbol'
    }),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(20),
    _ts_metadata("design:type", String)
], CreateCryptoAssetDto.prototype, "symbol", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'Bitcoin',
        description: 'Full name of the asset'
    }),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(100),
    _ts_metadata("design:type", String)
], CreateCryptoAssetDto.prototype, "name", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 8,
        description: 'Decimal places for the asset',
        default: 8
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsInt)(),
    (0, _classvalidator.Min)(0),
    (0, _classvalidator.Max)(18),
    _ts_metadata("design:type", Number)
], CreateCryptoAssetDto.prototype, "decimals", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'bitcoin',
        description: 'CoinGecko ID for price fetching'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(100),
    _ts_metadata("design:type", String)
], CreateCryptoAssetDto.prototype, "coingeckoId", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        default: true
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsBoolean)(),
    _ts_metadata("design:type", Boolean)
], CreateCryptoAssetDto.prototype, "isActive", void 0);

//# sourceMappingURL=create-crypto-asset.dto.js.map