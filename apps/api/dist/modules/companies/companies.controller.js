"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CompaniesController", {
    enumerable: true,
    get: function() {
        return CompaniesController;
    }
});
const _common = require("@nestjs/common");
const _swagger = require("@nestjs/swagger");
const _companiesservice = require("./companies.service.js");
const _index = require("./dto");
const _jwtauthguard = require("../../common/guards/jwt-auth.guard.js");
const _index1 = require("../../common");
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
let CompaniesController = class CompaniesController {
    async create(user, dto) {
        return this.companiesService.create(user.sub, dto);
    }
    async findAll(user) {
        return this.companiesService.findAllByUser(user.sub);
    }
    async findOne(user, id) {
        return this.companiesService.findById(id, user.sub);
    }
    async update(user, id, dto) {
        return this.companiesService.update(id, user.sub, dto);
    }
    async delete(user, id) {
        return this.companiesService.delete(id, user.sub);
    }
    async setDefault(user, id) {
        return this.companiesService.setDefault(id, user.sub);
    }
    constructor(companiesService){
        this.companiesService = companiesService;
    }
};
_ts_decorate([
    (0, _common.Post)(),
    (0, _swagger.ApiOperation)({
        summary: 'Create a new company with PGC chart of accounts'
    }),
    (0, _swagger.ApiResponse)({
        status: 201,
        description: 'Company created with seed data'
    }),
    _ts_param(0, (0, _index1.CurrentUser)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _index1.JwtPayload === "undefined" ? Object : _index1.JwtPayload,
        typeof _index.CreateCompanyDto === "undefined" ? Object : _index.CreateCompanyDto
    ]),
    _ts_metadata("design:returntype", Promise)
], CompaniesController.prototype, "create", null);
_ts_decorate([
    (0, _common.Get)(),
    (0, _swagger.ApiOperation)({
        summary: 'List all companies for current user'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'List of companies'
    }),
    _ts_param(0, (0, _index1.CurrentUser)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _index1.JwtPayload === "undefined" ? Object : _index1.JwtPayload
    ]),
    _ts_metadata("design:returntype", Promise)
], CompaniesController.prototype, "findAll", null);
_ts_decorate([
    (0, _common.Get)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Get company by ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Company details'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Company not found'
    }),
    _ts_param(0, (0, _index1.CurrentUser)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _index1.JwtPayload === "undefined" ? Object : _index1.JwtPayload,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], CompaniesController.prototype, "findOne", null);
_ts_decorate([
    (0, _common.Patch)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Update company'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Company updated'
    }),
    (0, _swagger.ApiResponse)({
        status: 403,
        description: 'Insufficient permissions'
    }),
    _ts_param(0, (0, _index1.CurrentUser)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _index1.JwtPayload === "undefined" ? Object : _index1.JwtPayload,
        String,
        typeof _index.UpdateCompanyDto === "undefined" ? Object : _index.UpdateCompanyDto
    ]),
    _ts_metadata("design:returntype", Promise)
], CompaniesController.prototype, "update", null);
_ts_decorate([
    (0, _common.Delete)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Soft delete company (OWNER only)'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Company deleted'
    }),
    (0, _swagger.ApiResponse)({
        status: 403,
        description: 'Only OWNER can delete'
    }),
    _ts_param(0, (0, _index1.CurrentUser)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _index1.JwtPayload === "undefined" ? Object : _index1.JwtPayload,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], CompaniesController.prototype, "delete", null);
_ts_decorate([
    (0, _common.Post)(':id/default'),
    (0, _swagger.ApiOperation)({
        summary: 'Set company as default for user'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Default company updated'
    }),
    _ts_param(0, (0, _index1.CurrentUser)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _index1.JwtPayload === "undefined" ? Object : _index1.JwtPayload,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], CompaniesController.prototype, "setDefault", null);
CompaniesController = _ts_decorate([
    (0, _swagger.ApiTags)('companies'),
    (0, _swagger.ApiBearerAuth)('access-token'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    (0, _common.Controller)('companies'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _companiesservice.CompaniesService === "undefined" ? Object : _companiesservice.CompaniesService
    ])
], CompaniesController);

//# sourceMappingURL=companies.controller.js.map