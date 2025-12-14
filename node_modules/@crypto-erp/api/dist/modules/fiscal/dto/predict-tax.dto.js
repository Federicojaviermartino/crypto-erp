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
    get ConsumedLotDto () {
        return ConsumedLotDto;
    },
    get PredictTaxImpactDto () {
        return PredictTaxImpactDto;
    },
    get ProspectiveTransactionType () {
        return ProspectiveTransactionType;
    },
    get TaxPredictionResponseDto () {
        return TaxPredictionResponseDto;
    }
});
const _classvalidator = require("class-validator");
const _classtransformer = require("class-transformer");
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
var ProspectiveTransactionType = /*#__PURE__*/ function(ProspectiveTransactionType) {
    ProspectiveTransactionType["SELL"] = "SELL";
    ProspectiveTransactionType["BUY"] = "BUY";
    return ProspectiveTransactionType;
}({});
let PredictTaxImpactDto = class PredictTaxImpactDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Type of prospective transaction',
        enum: ProspectiveTransactionType,
        example: 'SELL'
    }),
    (0, _classvalidator.IsEnum)(ProspectiveTransactionType),
    _ts_metadata("design:type", String)
], PredictTaxImpactDto.prototype, "transactionType", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Crypto asset symbol',
        example: 'BTC'
    }),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], PredictTaxImpactDto.prototype, "asset", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Amount of crypto asset',
        example: 0.5
    }),
    (0, _classvalidator.IsNumber)(),
    (0, _classvalidator.Min)(0),
    (0, _classtransformer.Type)(()=>Number),
    _ts_metadata("design:type", Number)
], PredictTaxImpactDto.prototype, "amount", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Price in EUR per unit',
        example: 45000
    }),
    (0, _classvalidator.IsNumber)(),
    (0, _classvalidator.Min)(0),
    (0, _classtransformer.Type)(()=>Number),
    _ts_metadata("design:type", Number)
], PredictTaxImpactDto.prototype, "priceEur", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Date of prospective sale/purchase (defaults to current date)',
        example: '2025-01-15'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsDateString)(),
    _ts_metadata("design:type", String)
], PredictTaxImpactDto.prototype, "dateOfSale", void 0);
let ConsumedLotDto = class ConsumedLotDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Acquisition date of the lot'
    }),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], ConsumedLotDto.prototype, "acquisitionDate", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Quantity consumed from this lot'
    }),
    _ts_metadata("design:type", Number)
], ConsumedLotDto.prototype, "quantity", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Cost basis per unit in EUR'
    }),
    _ts_metadata("design:type", Number)
], ConsumedLotDto.prototype, "costBasisPerUnit", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Total cost basis in EUR'
    }),
    _ts_metadata("design:type", Number)
], ConsumedLotDto.prototype, "totalCostBasis", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Capital gain/loss from this lot in EUR'
    }),
    _ts_metadata("design:type", Number)
], ConsumedLotDto.prototype, "gainLoss", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Holding period in days'
    }),
    _ts_metadata("design:type", Number)
], ConsumedLotDto.prototype, "holdingPeriodDays", void 0);
let TaxPredictionResponseDto = class TaxPredictionResponseDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Total capital gain/loss in EUR',
        example: 5234.5
    }),
    _ts_metadata("design:type", Number)
], TaxPredictionResponseDto.prototype, "capitalGain", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Estimated tax owed in EUR',
        example: 1099.25
    }),
    _ts_metadata("design:type", Number)
], TaxPredictionResponseDto.prototype, "taxOwed", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Effective IRPF tax rate applied (%)',
        example: 21
    }),
    _ts_metadata("design:type", Number)
], TaxPredictionResponseDto.prototype, "effectiveTaxRate", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Lots consumed by FIFO method',
        type: [
            ConsumedLotDto
        ]
    }),
    _ts_metadata("design:type", Array)
], TaxPredictionResponseDto.prototype, "lotsConsumed", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'AI-generated recommendation',
        example: 'Consider holding for more than 1 year to benefit from potential future tax advantages'
    }),
    _ts_metadata("design:type", String)
], TaxPredictionResponseDto.prototype, "recommendation", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Total proceeds from sale in EUR',
        example: 22500
    }),
    _ts_metadata("design:type", Number)
], TaxPredictionResponseDto.prototype, "totalProceeds", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Total acquisition cost in EUR',
        example: 17265.5
    }),
    _ts_metadata("design:type", Number)
], TaxPredictionResponseDto.prototype, "totalAcquisitionCost", void 0);

//# sourceMappingURL=predict-tax.dto.js.map