"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AccountsController", {
    enumerable: true,
    get: function() {
        return AccountsController;
    }
});
const _common = require("@nestjs/common");
const _swagger = require("@nestjs/swagger");
const _index = require("../../../common/guards");
const _index1 = require("../../../common/decorators");
const _index2 = require("../services");
const _index3 = require("../dto");
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
let AccountsController = class AccountsController {
    async findAll(companyId, query) {
        return this.accountsService.findAll(companyId, query);
    }
    async getTree(companyId) {
        return this.accountsService.findTree(companyId);
    }
    async findById(companyId, id) {
        return this.accountsService.findById(companyId, id);
    }
    async findByCode(companyId, code) {
        const account = await this.accountsService.findByCode(companyId, code);
        if (!account) {
            return {
                error: 'Account not found',
                code
            };
        }
        return account;
    }
    async getBalance(companyId, id, startDate, endDate) {
        return this.accountsService.getBalance(companyId, id, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
    }
    async create(companyId, dto) {
        return this.accountsService.create(companyId, dto);
    }
    async update(companyId, id, dto) {
        return this.accountsService.update(companyId, id, dto);
    }
    async deactivate(companyId, id) {
        return this.accountsService.deactivate(companyId, id);
    }
    async activate(companyId, id) {
        return this.accountsService.activate(companyId, id);
    }
    constructor(accountsService){
        this.accountsService = accountsService;
    }
};
_ts_decorate([
    (0, _common.Get)(),
    (0, _swagger.ApiOperation)({
        summary: 'List all accounts'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Returns list of accounts'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Query)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _index3.QueryAccountsDto === "undefined" ? Object : _index3.QueryAccountsDto
    ]),
    _ts_metadata("design:returntype", Promise)
], AccountsController.prototype, "findAll", null);
_ts_decorate([
    (0, _common.Get)('tree'),
    (0, _swagger.ApiOperation)({
        summary: 'Get accounts as hierarchical tree'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Returns account tree structure'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], AccountsController.prototype, "getTree", null);
_ts_decorate([
    (0, _common.Get)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Get account by ID'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Account ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Returns account details'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Account not found'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], AccountsController.prototype, "findById", null);
_ts_decorate([
    (0, _common.Get)('code/:code'),
    (0, _swagger.ApiOperation)({
        summary: 'Get account by code'
    }),
    (0, _swagger.ApiParam)({
        name: 'code',
        description: 'Account code (e.g., 100, 400)'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Returns account details'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Account not found'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('code')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], AccountsController.prototype, "findByCode", null);
_ts_decorate([
    (0, _common.Get)(':id/balance'),
    (0, _swagger.ApiOperation)({
        summary: 'Get account balance'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Account ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Returns account balance'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Query)('startDate')),
    _ts_param(3, (0, _common.Query)('endDate')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], AccountsController.prototype, "getBalance", null);
_ts_decorate([
    (0, _common.Post)(),
    (0, _swagger.ApiOperation)({
        summary: 'Create a new account'
    }),
    (0, _swagger.ApiResponse)({
        status: 201,
        description: 'Account created successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 409,
        description: 'Account code already exists'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _index3.CreateAccountDto === "undefined" ? Object : _index3.CreateAccountDto
    ]),
    _ts_metadata("design:returntype", Promise)
], AccountsController.prototype, "create", null);
_ts_decorate([
    (0, _common.Put)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Update an account'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Account ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Account updated successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Account not found'
    }),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String,
        typeof Partial === "undefined" ? Object : Partial
    ]),
    _ts_metadata("design:returntype", Promise)
], AccountsController.prototype, "update", null);
_ts_decorate([
    (0, _common.Patch)(':id/deactivate'),
    (0, _swagger.ApiOperation)({
        summary: 'Deactivate an account'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Account ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Account deactivated'
    }),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], AccountsController.prototype, "deactivate", null);
_ts_decorate([
    (0, _common.Patch)(':id/activate'),
    (0, _swagger.ApiOperation)({
        summary: 'Activate an account'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'Account ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Account activated'
    }),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    _ts_param(0, (0, _index1.CurrentCompany)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], AccountsController.prototype, "activate", null);
AccountsController = _ts_decorate([
    (0, _swagger.ApiTags)('Accounts'),
    (0, _swagger.ApiBearerAuth)(),
    (0, _common.UseGuards)(_index.JwtAuthGuard, _index.TenantGuard),
    (0, _common.Controller)('accounts'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _index2.AccountsService === "undefined" ? Object : _index2.AccountsService
    ])
], AccountsController);

//# sourceMappingURL=accounts.controller.js.map