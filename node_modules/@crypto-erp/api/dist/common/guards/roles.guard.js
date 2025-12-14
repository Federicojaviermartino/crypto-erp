"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "RolesGuard", {
    enumerable: true,
    get: function() {
        return RolesGuard;
    }
});
const _common = require("@nestjs/common");
const _core = require("@nestjs/core");
const _client = require("@prisma/client");
const _rolesdecorator = require("../decorators/roles.decorator.js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
/**
 * Role hierarchy - higher index = more permissions
 */ const ROLE_HIERARCHY = [
    _client.UserRole.VIEWER,
    _client.UserRole.USER,
    _client.UserRole.ACCOUNTANT,
    _client.UserRole.ADMIN,
    _client.UserRole.OWNER
];
let RolesGuard = class RolesGuard {
    canActivate(context) {
        const requiredRoles = this.reflector.getAllAndOverride(_rolesdecorator.ROLES_KEY, [
            context.getHandler(),
            context.getClass()
        ]);
        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const companyContext = request.companyContext;
        if (!companyContext) {
            return false;
        }
        const userRoleIndex = ROLE_HIERARCHY.indexOf(companyContext.role);
        // Check if user has any of the required roles or higher
        return requiredRoles.some((requiredRole)=>{
            const requiredRoleIndex = ROLE_HIERARCHY.indexOf(requiredRole);
            return userRoleIndex >= requiredRoleIndex;
        });
    }
    constructor(reflector){
        this.reflector = reflector;
    }
};
RolesGuard = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _core.Reflector === "undefined" ? Object : _core.Reflector
    ])
], RolesGuard);

//# sourceMappingURL=roles.guard.js.map