"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CreateWebhookSubscriptionDto", {
    enumerable: true,
    get: function() {
        return CreateWebhookSubscriptionDto;
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
let CreateWebhookSubscriptionDto = class CreateWebhookSubscriptionDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Webhook endpoint URL',
        example: 'https://example.com/webhooks/crypto-erp'
    }),
    (0, _classvalidator.IsUrl)(),
    _ts_metadata("design:type", String)
], CreateWebhookSubscriptionDto.prototype, "url", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'List of events to subscribe to',
        example: [
            'invoice.created',
            'invoice.sent',
            'crypto_transaction.created'
        ],
        isArray: true
    }),
    (0, _classvalidator.IsArray)(),
    (0, _classvalidator.IsString)({
        each: true
    }),
    _ts_metadata("design:type", Array)
], CreateWebhookSubscriptionDto.prototype, "events", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Optional description for this webhook',
        required: false
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateWebhookSubscriptionDto.prototype, "description", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Number of retry attempts on failure',
        example: 3,
        required: false,
        minimum: 0,
        maximum: 10
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsInt)(),
    (0, _classvalidator.Min)(0),
    (0, _classvalidator.Max)(10),
    _ts_metadata("design:type", Number)
], CreateWebhookSubscriptionDto.prototype, "retryCount", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Request timeout in milliseconds',
        example: 30000,
        required: false,
        minimum: 5000,
        maximum: 60000
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsInt)(),
    (0, _classvalidator.Min)(5000),
    (0, _classvalidator.Max)(60000),
    _ts_metadata("design:type", Number)
], CreateWebhookSubscriptionDto.prototype, "timeout", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Custom metadata (JSON object)',
        required: false
    }),
    (0, _classvalidator.IsOptional)(),
    _ts_metadata("design:type", typeof Record === "undefined" ? Object : Record)
], CreateWebhookSubscriptionDto.prototype, "metadata", void 0);

//# sourceMappingURL=create-webhook-subscription.dto.js.map