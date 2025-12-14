"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "InvitationsController", {
    enumerable: true,
    get: function() {
        return InvitationsController;
    }
});
const _common = require("@nestjs/common");
const _invitationsservice = require("./invitations.service");
const _createinvitationdto = require("./dto/create-invitation.dto");
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
let InvitationsController = class InvitationsController {
    /**
   * Create a new invitation
   * Only ADMIN and OWNER can invite users
   */ async create(userId, companyId, dto) {
        return this.invitationsService.createInvitation(companyId, userId, dto);
    }
    /**
   * Accept an invitation by token
   */ async accept(token, userId) {
        return this.invitationsService.acceptInvitation(token, userId);
    }
    /**
   * Cancel an invitation
   * Only ADMIN, OWNER, or the inviter can cancel
   */ async cancel(id, userId, companyId) {
        return this.invitationsService.cancelInvitation(id, userId, companyId);
    }
    /**
   * List all invitations for current company
   */ async list(companyId, status) {
        return this.invitationsService.findByCompany(companyId, status);
    }
    /**
   * Get invitation details by token (public endpoint for accepting)
   */ async getByToken(token) {
        return this.invitationsService.findByToken(token);
    }
    constructor(invitationsService){
        this.invitationsService = invitationsService;
    }
};
_ts_decorate([
    (0, _common.Post)(),
    (0, _common.UseGuards)(_rolesguard.RolesGuard),
    (0, _rolesdecorator.Roles)(_client.UserRole.ADMIN, _client.UserRole.OWNER),
    _ts_param(0, (0, _getuserdecorator.GetUser)('id')),
    _ts_param(1, (0, _getcompanydecorator.GetCompany)()),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String,
        typeof _createinvitationdto.CreateInvitationDto === "undefined" ? Object : _createinvitationdto.CreateInvitationDto
    ]),
    _ts_metadata("design:returntype", Promise)
], InvitationsController.prototype, "create", null);
_ts_decorate([
    (0, _common.Post)(':token/accept'),
    _ts_param(0, (0, _common.Param)('token')),
    _ts_param(1, (0, _getuserdecorator.GetUser)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], InvitationsController.prototype, "accept", null);
_ts_decorate([
    (0, _common.Delete)(':id'),
    (0, _common.UseGuards)(_rolesguard.RolesGuard),
    (0, _rolesdecorator.Roles)(_client.UserRole.ADMIN, _client.UserRole.OWNER),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _getuserdecorator.GetUser)('id')),
    _ts_param(2, (0, _getcompanydecorator.GetCompany)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], InvitationsController.prototype, "cancel", null);
_ts_decorate([
    (0, _common.Get)(),
    (0, _common.UseGuards)(_rolesguard.RolesGuard),
    (0, _rolesdecorator.Roles)(_client.UserRole.ADMIN, _client.UserRole.OWNER, _client.UserRole.ACCOUNTANT),
    _ts_param(0, (0, _getcompanydecorator.GetCompany)()),
    _ts_param(1, (0, _common.Query)('status')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _client.InvitationStatus === "undefined" ? Object : _client.InvitationStatus
    ]),
    _ts_metadata("design:returntype", Promise)
], InvitationsController.prototype, "list", null);
_ts_decorate([
    (0, _common.Get)('token/:token'),
    _ts_param(0, (0, _common.Param)('token')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], InvitationsController.prototype, "getByToken", null);
InvitationsController = _ts_decorate([
    (0, _common.Controller)('invitations'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _invitationsservice.InvitationsService === "undefined" ? Object : _invitationsservice.InvitationsService
    ])
], InvitationsController);

//# sourceMappingURL=invitations.controller.js.map