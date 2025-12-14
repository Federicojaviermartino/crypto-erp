"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "WebhooksController", {
    enumerable: true,
    get: function() {
        return WebhooksController;
    }
});
const _common = require("@nestjs/common");
const _swagger = require("@nestjs/swagger");
const _webhooksservice = require("./webhooks.service");
const _createwebhooksubscriptiondto = require("./dto/create-webhook-subscription.dto");
const _updatewebhooksubscriptiondto = require("./dto/update-webhook-subscription.dto");
const _jwtauthguard = require("../auth/guards/jwt-auth.guard");
const _getcompanydecorator = require("../auth/decorators/get-company.decorator");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
function _ts_param(paramIndex, decorator) {
    return function(target, key) {
        decorator(target, key, paramIndex);
    };
}
let WebhooksController = class WebhooksController {
    create(companyId, dto) {
        return this.webhooksService.createSubscription(companyId, dto);
    }
    findAll(companyId) {
        return this.webhooksService.findAllByCompany(companyId);
    }
    findOne(id, companyId) {
        return this.webhooksService.findOne(id, companyId);
    }
    update(id, companyId, dto) {
        return this.webhooksService.updateSubscription(id, companyId, dto);
    }
    remove(id, companyId) {
        return this.webhooksService.deleteSubscription(id, companyId);
    }
    test(id, companyId) {
        return this.webhooksService.testWebhook(id, companyId);
    }
    getDeliveries(id, companyId, limit) {
        return this.webhooksService.getDeliveryHistory(id, companyId, limit);
    }
    constructor(webhooksService){
        this.webhooksService = webhooksService;
    }
};
_ts_decorate([
    (0, _common.Post)(),
    (0, _swagger.ApiOperation)({
        summary: 'Create webhook subscription'
    }),
    _ts_param(0, (0, _getcompanydecorator.GetCompany)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _createwebhooksubscriptiondto.CreateWebhookSubscriptionDto === "undefined" ? Object : _createwebhooksubscriptiondto.CreateWebhookSubscriptionDto
    ]),
    _ts_metadata("design:returntype", void 0)
], WebhooksController.prototype, "create", null);
_ts_decorate([
    (0, _common.Get)(),
    (0, _swagger.ApiOperation)({
        summary: 'List all webhook subscriptions'
    }),
    _ts_param(0, (0, _getcompanydecorator.GetCompany)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], WebhooksController.prototype, "findAll", null);
_ts_decorate([
    (0, _common.Get)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Get webhook subscription by ID'
    }),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _getcompanydecorator.GetCompany)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], WebhooksController.prototype, "findOne", null);
_ts_decorate([
    (0, _common.Patch)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Update webhook subscription'
    }),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _getcompanydecorator.GetCompany)()),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String,
        typeof _updatewebhooksubscriptiondto.UpdateWebhookSubscriptionDto === "undefined" ? Object : _updatewebhooksubscriptiondto.UpdateWebhookSubscriptionDto
    ]),
    _ts_metadata("design:returntype", void 0)
], WebhooksController.prototype, "update", null);
_ts_decorate([
    (0, _common.Delete)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Delete webhook subscription'
    }),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _getcompanydecorator.GetCompany)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], WebhooksController.prototype, "remove", null);
_ts_decorate([
    (0, _common.Post)(':id/test'),
    (0, _swagger.ApiOperation)({
        summary: 'Send test webhook'
    }),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _getcompanydecorator.GetCompany)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], WebhooksController.prototype, "test", null);
_ts_decorate([
    (0, _common.Get)(':id/deliveries'),
    (0, _swagger.ApiOperation)({
        summary: 'Get webhook delivery history'
    }),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _getcompanydecorator.GetCompany)()),
    _ts_param(2, (0, _common.Query)('limit')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String,
        Number
    ]),
    _ts_metadata("design:returntype", void 0)
], WebhooksController.prototype, "getDeliveries", null);
WebhooksController = _ts_decorate([
    (0, _swagger.ApiTags)('webhooks'),
    (0, _swagger.ApiBearerAuth)(),
    (0, _common.Controller)('webhooks/subscriptions'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _webhooksservice.WebhooksService === "undefined" ? Object : _webhooksservice.WebhooksService
    ])
], WebhooksController);

//# sourceMappingURL=webhooks.controller.js.map