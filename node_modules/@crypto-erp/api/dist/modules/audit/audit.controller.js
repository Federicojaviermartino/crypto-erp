"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AuditController", {
    enumerable: true,
    get: function() {
        return AuditController;
    }
});
const _common = require("@nestjs/common");
const _auditservice = require("./audit.service");
const _jwtauthguard = require("../auth/guards/jwt-auth.guard");
const _rolesguard = require("../auth/guards/roles.guard");
const _rolesdecorator = require("../auth/decorators/roles.decorator");
const _getuserdecorator = require("../auth/decorators/get-user.decorator");
const _getcompanydecorator = require("../auth/decorators/get-company.decorator");
const _client = require("@prisma/client");
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
let AuditController = class AuditController {
    /**
   * Get audit logs for a specific entity
   * Only ADMIN, OWNER, and ACCOUNTANT can view audit logs
   */ async getEntityAuditLogs(entity, entityId) {
        return this.auditService.findByEntity(entity, entityId);
    }
    /**
   * Get audit logs for current company
   */ async getCompanyAuditLogs(companyId, limit, offset, entity, action) {
        return this.auditService.findByCompany(companyId, {
            limit: limit ? parseInt(limit, 10) : 100,
            offset: offset ? parseInt(offset, 10) : 0,
            entity,
            action
        });
    }
    /**
   * Get audit logs for current user
   */ async getMyActivity(userId, limit) {
        return this.auditService.findByUser(userId, limit ? parseInt(limit, 10) : 100);
    }
    constructor(auditService){
        this.auditService = auditService;
    }
};
_ts_decorate([
    (0, _common.Get)('entity/:entity/:entityId'),
    (0, _common.UseGuards)(_rolesguard.RolesGuard),
    (0, _rolesdecorator.Roles)(_client.UserRole.ADMIN, _client.UserRole.OWNER, _client.UserRole.ACCOUNTANT),
    _ts_param(0, (0, _common.Param)('entity')),
    _ts_param(1, (0, _common.Param)('entityId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], AuditController.prototype, "getEntityAuditLogs", null);
_ts_decorate([
    (0, _common.Get)('company'),
    (0, _common.UseGuards)(_rolesguard.RolesGuard),
    (0, _rolesdecorator.Roles)(_client.UserRole.ADMIN, _client.UserRole.OWNER, _client.UserRole.ACCOUNTANT),
    _ts_param(0, (0, _getcompanydecorator.GetCompany)()),
    _ts_param(1, (0, _common.Query)('limit')),
    _ts_param(2, (0, _common.Query)('offset')),
    _ts_param(3, (0, _common.Query)('entity')),
    _ts_param(4, (0, _common.Query)('action')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String,
        String,
        String,
        typeof _client.AuditAction === "undefined" ? Object : _client.AuditAction
    ]),
    _ts_metadata("design:returntype", Promise)
], AuditController.prototype, "getCompanyAuditLogs", null);
_ts_decorate([
    (0, _common.Get)('my-activity'),
    _ts_param(0, (0, _getuserdecorator.GetUser)('id')),
    _ts_param(1, (0, _common.Query)('limit')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], AuditController.prototype, "getMyActivity", null);
AuditController = _ts_decorate([
    (0, _common.Controller)('audit'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _auditservice.AuditService === "undefined" ? Object : _auditservice.AuditService
    ])
], AuditController);

//# sourceMappingURL=audit.controller.js.map