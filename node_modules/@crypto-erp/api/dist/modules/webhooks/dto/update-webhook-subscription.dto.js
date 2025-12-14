"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UpdateWebhookSubscriptionDto", {
    enumerable: true,
    get: function() {
        return UpdateWebhookSubscriptionDto;
    }
});
const _swagger = require("@nestjs/swagger");
const _createwebhooksubscriptiondto = require("./create-webhook-subscription.dto");
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
let UpdateWebhookSubscriptionDto = class UpdateWebhookSubscriptionDto extends (0, _swagger.PartialType)(_createwebhooksubscriptiondto.CreateWebhookSubscriptionDto) {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Enable or disable the webhook',
        required: false
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsBoolean)(),
    _ts_metadata("design:type", Boolean)
], UpdateWebhookSubscriptionDto.prototype, "isActive", void 0);

//# sourceMappingURL=update-webhook-subscription.dto.js.map