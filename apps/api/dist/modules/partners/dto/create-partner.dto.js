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
    get CreatePartnerDto () {
        return CreatePartnerDto;
    },
    get RevenueShareModel () {
        return RevenueShareModel;
    }
});
const _classvalidator = require("class-validator");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
var RevenueShareModel = /*#__PURE__*/ function(RevenueShareModel) {
    RevenueShareModel["PERCENTAGE"] = "PERCENTAGE";
    RevenueShareModel["TIERED"] = "TIERED";
    RevenueShareModel["FLAT_FEE"] = "FLAT_FEE";
    RevenueShareModel["HYBRID"] = "HYBRID";
    return RevenueShareModel;
}({});
let CreatePartnerDto = class CreatePartnerDto {
};
_ts_decorate([
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(255),
    _ts_metadata("design:type", String)
], CreatePartnerDto.prototype, "name", void 0);
_ts_decorate([
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(255),
    _ts_metadata("design:type", String)
], CreatePartnerDto.prototype, "legalName", void 0);
_ts_decorate([
    (0, _classvalidator.IsEmail)(),
    (0, _classvalidator.MaxLength)(255),
    _ts_metadata("design:type", String)
], CreatePartnerDto.prototype, "email", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(20),
    _ts_metadata("design:type", String)
], CreatePartnerDto.prototype, "phone", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(255),
    _ts_metadata("design:type", String)
], CreatePartnerDto.prototype, "website", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(50),
    _ts_metadata("design:type", String)
], CreatePartnerDto.prototype, "taxId", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(500),
    _ts_metadata("design:type", String)
], CreatePartnerDto.prototype, "address", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(100),
    _ts_metadata("design:type", String)
], CreatePartnerDto.prototype, "city", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(2),
    _ts_metadata("design:type", String)
], CreatePartnerDto.prototype, "country", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsNumber)(),
    (0, _classvalidator.Min)(0),
    (0, _classvalidator.Max)(100),
    _ts_metadata("design:type", Number)
], CreatePartnerDto.prototype, "commissionRate", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsEnum)(RevenueShareModel),
    _ts_metadata("design:type", String)
], CreatePartnerDto.prototype, "revenueShareModel", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(100),
    _ts_metadata("design:type", String)
], CreatePartnerDto.prototype, "paymentTerms", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(500),
    _ts_metadata("design:type", String)
], CreatePartnerDto.prototype, "webhookUrl", void 0);

//# sourceMappingURL=create-partner.dto.js.map