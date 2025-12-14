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
    get CreateCryptoTransactionDto () {
        return CreateCryptoTransactionDto;
    },
    get CryptoTransactionType () {
        return CryptoTransactionType;
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
var CryptoTransactionType = /*#__PURE__*/ function(CryptoTransactionType) {
    CryptoTransactionType["BUY"] = "BUY";
    CryptoTransactionType["SELL"] = "SELL";
    CryptoTransactionType["TRANSFER_IN"] = "TRANSFER_IN";
    CryptoTransactionType["TRANSFER_OUT"] = "TRANSFER_OUT";
    CryptoTransactionType["SWAP"] = "SWAP";
    CryptoTransactionType["STAKING_REWARD"] = "STAKING_REWARD";
    CryptoTransactionType["AIRDROP"] = "AIRDROP";
    CryptoTransactionType["MINING"] = "MINING";
    CryptoTransactionType["FEE"] = "FEE";
    return CryptoTransactionType;
}({});
let CreateCryptoTransactionDto = class CreateCryptoTransactionDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        enum: CryptoTransactionType
    }),
    (0, _classvalidator.IsEnum)(CryptoTransactionType),
    _ts_metadata("design:type", String)
], CreateCryptoTransactionDto.prototype, "type", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Crypto asset ID'
    }),
    (0, _classvalidator.IsUUID)(),
    _ts_metadata("design:type", String)
], CreateCryptoTransactionDto.prototype, "assetId", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 0.5,
        description: 'Amount of crypto'
    }),
    (0, _classvalidator.IsNumber)(),
    (0, _classvalidator.Min)(0),
    _ts_metadata("design:type", Number)
], CreateCryptoTransactionDto.prototype, "amount", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 50000,
        description: 'Price per unit in fiat'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsNumber)(),
    (0, _classvalidator.Min)(0),
    _ts_metadata("design:type", Number)
], CreateCryptoTransactionDto.prototype, "pricePerUnit", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'EUR',
        default: 'EUR'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(3),
    _ts_metadata("design:type", String)
], CreateCryptoTransactionDto.prototype, "fiatCurrency", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 25000,
        description: 'Total fiat value'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsNumber)(),
    (0, _classvalidator.Min)(0),
    _ts_metadata("design:type", Number)
], CreateCryptoTransactionDto.prototype, "fiatValue", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 0.0001,
        description: 'Transaction fee in crypto'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsNumber)(),
    (0, _classvalidator.Min)(0),
    _ts_metadata("design:type", Number)
], CreateCryptoTransactionDto.prototype, "fee", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Fee asset ID (if different from main asset)'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsUUID)(),
    _ts_metadata("design:type", String)
], CreateCryptoTransactionDto.prototype, "feeAssetId", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: '2024-01-15T10:30:00Z'
    }),
    (0, _classvalidator.IsDateString)(),
    _ts_metadata("design:type", String)
], CreateCryptoTransactionDto.prototype, "date", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'Binance',
        description: 'Exchange or wallet name'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(100),
    _ts_metadata("design:type", String)
], CreateCryptoTransactionDto.prototype, "exchange", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: '0x123...abc',
        description: 'Transaction hash'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(200),
    _ts_metadata("design:type", String)
], CreateCryptoTransactionDto.prototype, "txHash", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Wallet address from'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(200),
    _ts_metadata("design:type", String)
], CreateCryptoTransactionDto.prototype, "fromAddress", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Wallet address to'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(200),
    _ts_metadata("design:type", String)
], CreateCryptoTransactionDto.prototype, "toAddress", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)(),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateCryptoTransactionDto.prototype, "notes", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Asset ID received (for SWAP)'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsUUID)(),
    _ts_metadata("design:type", String)
], CreateCryptoTransactionDto.prototype, "swapToAssetId", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Amount received (for SWAP)'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsNumber)(),
    (0, _classvalidator.Min)(0),
    _ts_metadata("design:type", Number)
], CreateCryptoTransactionDto.prototype, "swapToAmount", void 0);

//# sourceMappingURL=create-transaction.dto.js.map