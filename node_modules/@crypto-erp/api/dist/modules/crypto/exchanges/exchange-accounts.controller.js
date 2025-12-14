"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ExchangeAccountsController", {
    enumerable: true,
    get: function() {
        return ExchangeAccountsController;
    }
});
const _common = require("@nestjs/common");
const _exchangeaccountsservice = require("./exchange-accounts.service.js");
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
let ExchangeAccountsController = class ExchangeAccountsController {
    getCompanyId(headers) {
        const companyId = headers['x-company-id'];
        if (!companyId) {
            throw new _common.BadRequestException('X-Company-Id header is required');
        }
        return companyId;
    }
    getSupportedExchanges() {
        return this.exchangeAccountsService.getSupportedExchanges();
    }
    findAll(headers) {
        const companyId = this.getCompanyId(headers);
        return this.exchangeAccountsService.findAll(companyId);
    }
    findOne(headers, id) {
        const companyId = this.getCompanyId(headers);
        return this.exchangeAccountsService.findOne(companyId, id);
    }
    create(headers, body) {
        const companyId = this.getCompanyId(headers);
        return this.exchangeAccountsService.create(companyId, body);
    }
    update(headers, id, body) {
        const companyId = this.getCompanyId(headers);
        return this.exchangeAccountsService.update(companyId, id, body);
    }
    delete(headers, id) {
        const companyId = this.getCompanyId(headers);
        return this.exchangeAccountsService.delete(companyId, id);
    }
    async testConnection(headers, id) {
        const companyId = this.getCompanyId(headers);
        const success = await this.exchangeAccountsService.testConnection(companyId, id);
        return {
            success
        };
    }
    getBalances(headers, id) {
        const companyId = this.getCompanyId(headers);
        return this.exchangeAccountsService.getBalances(companyId, id);
    }
    syncTrades(headers, id, body) {
        const companyId = this.getCompanyId(headers);
        return this.exchangeAccountsService.syncTrades(companyId, id, {
            startTime: body.startTime ? new Date(body.startTime) : undefined,
            endTime: body.endTime ? new Date(body.endTime) : undefined
        });
    }
    syncDepositsWithdrawals(headers, id, body) {
        const companyId = this.getCompanyId(headers);
        return this.exchangeAccountsService.syncDepositsWithdrawals(companyId, id, {
            startTime: body.startTime ? new Date(body.startTime) : undefined,
            endTime: body.endTime ? new Date(body.endTime) : undefined
        });
    }
    async syncAll(headers, id, body) {
        const companyId = this.getCompanyId(headers);
        const options = {
            startTime: body.startTime ? new Date(body.startTime) : undefined,
            endTime: body.endTime ? new Date(body.endTime) : undefined
        };
        const [trades, depositsWithdrawals] = await Promise.all([
            this.exchangeAccountsService.syncTrades(companyId, id, options),
            this.exchangeAccountsService.syncDepositsWithdrawals(companyId, id, options)
        ]);
        return {
            trades: trades.imported,
            deposits: depositsWithdrawals.deposits,
            withdrawals: depositsWithdrawals.withdrawals
        };
    }
    constructor(exchangeAccountsService){
        this.exchangeAccountsService = exchangeAccountsService;
    }
};
_ts_decorate([
    (0, _common.Get)('supported'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", void 0)
], ExchangeAccountsController.prototype, "getSupportedExchanges", null);
_ts_decorate([
    (0, _common.Get)('accounts'),
    _ts_param(0, (0, _common.Headers)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record
    ]),
    _ts_metadata("design:returntype", void 0)
], ExchangeAccountsController.prototype, "findAll", null);
_ts_decorate([
    (0, _common.Get)('accounts/:id'),
    _ts_param(0, (0, _common.Headers)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], ExchangeAccountsController.prototype, "findOne", null);
_ts_decorate([
    (0, _common.Post)('accounts'),
    _ts_param(0, (0, _common.Headers)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], ExchangeAccountsController.prototype, "create", null);
_ts_decorate([
    (0, _common.Put)('accounts/:id'),
    _ts_param(0, (0, _common.Headers)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record,
        String,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], ExchangeAccountsController.prototype, "update", null);
_ts_decorate([
    (0, _common.Delete)('accounts/:id'),
    _ts_param(0, (0, _common.Headers)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], ExchangeAccountsController.prototype, "delete", null);
_ts_decorate([
    (0, _common.Post)('accounts/:id/test'),
    _ts_param(0, (0, _common.Headers)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], ExchangeAccountsController.prototype, "testConnection", null);
_ts_decorate([
    (0, _common.Get)('accounts/:id/balances'),
    _ts_param(0, (0, _common.Headers)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], ExchangeAccountsController.prototype, "getBalances", null);
_ts_decorate([
    (0, _common.Post)('accounts/:id/sync/trades'),
    _ts_param(0, (0, _common.Headers)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record,
        String,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], ExchangeAccountsController.prototype, "syncTrades", null);
_ts_decorate([
    (0, _common.Post)('accounts/:id/sync/deposits-withdrawals'),
    _ts_param(0, (0, _common.Headers)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record,
        String,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], ExchangeAccountsController.prototype, "syncDepositsWithdrawals", null);
_ts_decorate([
    (0, _common.Post)('accounts/:id/sync/all'),
    _ts_param(0, (0, _common.Headers)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Record === "undefined" ? Object : Record,
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], ExchangeAccountsController.prototype, "syncAll", null);
ExchangeAccountsController = _ts_decorate([
    (0, _common.Controller)('crypto/exchanges'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _exchangeaccountsservice.ExchangeAccountsService === "undefined" ? Object : _exchangeaccountsservice.ExchangeAccountsService
    ])
], ExchangeAccountsController);

//# sourceMappingURL=exchange-accounts.controller.js.map