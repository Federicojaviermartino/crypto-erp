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
    get CreateWalletDto () {
        return CreateWalletDto;
    },
    get UpdateWalletDto () {
        return UpdateWalletDto;
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
let CreateWalletDto = class CreateWalletDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Blockchain wallet address (format varies by chain)',
        examples: {
            ethereum: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bB0b',
            solana: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
            bitcoin: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'
        }
    }),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.IsNotEmpty)(),
    _ts_metadata("design:type", String)
], CreateWalletDto.prototype, "address", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Blockchain network',
        example: 'ethereum',
        enum: [
            'ethereum',
            'polygon',
            'bsc',
            'arbitrum',
            'optimism',
            'base',
            'avalanche',
            'solana',
            'bitcoin'
        ]
    }),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.IsNotEmpty)(),
    _ts_metadata("design:type", String)
], CreateWalletDto.prototype, "chain", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'User-friendly label for the wallet',
        example: 'Mi Wallet Principal'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(100),
    _ts_metadata("design:type", String)
], CreateWalletDto.prototype, "label", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Wallet type',
        enum: _client.WalletType,
        default: 'EXTERNAL'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsEnum)(_client.WalletType),
    _ts_metadata("design:type", typeof _client.WalletType === "undefined" ? Object : _client.WalletType)
], CreateWalletDto.prototype, "type", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Accounting code to link for automatic journal entries',
        example: '5700001'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(20),
    _ts_metadata("design:type", String)
], CreateWalletDto.prototype, "accountCode", void 0);
let UpdateWalletDto = class UpdateWalletDto {
};
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'User-friendly label for the wallet',
        example: 'Mi Wallet Principal'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(100),
    _ts_metadata("design:type", String)
], UpdateWalletDto.prototype, "label", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Wallet type',
        enum: _client.WalletType
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsEnum)(_client.WalletType),
    _ts_metadata("design:type", typeof _client.WalletType === "undefined" ? Object : _client.WalletType)
], UpdateWalletDto.prototype, "type", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Accounting code to link for automatic journal entries',
        example: '5700001'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(20),
    _ts_metadata("design:type", String)
], UpdateWalletDto.prototype, "accountCode", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Whether the wallet is active'
    }),
    (0, _classvalidator.IsOptional)(),
    _ts_metadata("design:type", Boolean)
], UpdateWalletDto.prototype, "isActive", void 0);

//# sourceMappingURL=create-wallet.dto.js.map