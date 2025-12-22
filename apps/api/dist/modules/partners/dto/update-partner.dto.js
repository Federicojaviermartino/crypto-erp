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
    get PartnerStatus () {
        return PartnerStatus;
    },
    get UpdatePartnerDto () {
        return UpdatePartnerDto;
    }
});
const _mappedtypes = require("@nestjs/mapped-types");
const _createpartnerdto = require("./create-partner.dto.js");
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
var PartnerStatus = /*#__PURE__*/ function(PartnerStatus) {
    PartnerStatus["PENDING"] = "PENDING";
    PartnerStatus["ACTIVE"] = "ACTIVE";
    PartnerStatus["SUSPENDED"] = "SUSPENDED";
    PartnerStatus["TERMINATED"] = "TERMINATED";
    return PartnerStatus;
}({});
let UpdatePartnerDto = class UpdatePartnerDto extends (0, _mappedtypes.PartialType)(_createpartnerdto.CreatePartnerDto) {
};
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsEnum)(PartnerStatus),
    _ts_metadata("design:type", String)
], UpdatePartnerDto.prototype, "status", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsBoolean)(),
    _ts_metadata("design:type", Boolean)
], UpdatePartnerDto.prototype, "isActive", void 0);

//# sourceMappingURL=update-partner.dto.js.map