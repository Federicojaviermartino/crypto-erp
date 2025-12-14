"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "GDPRController", {
    enumerable: true,
    get: function() {
        return GDPRController;
    }
});
const _common = require("@nestjs/common");
const _gdprservice = require("./gdpr.service");
const _jwtauthguard = require("../auth/guards/jwt-auth.guard");
const _getuserdecorator = require("../auth/decorators/get-user.decorator");
const _deleteaccountdto = require("./dto/delete-account.dto");
const _database = require("../../../../../libs/database/src");
const _bcrypt = /*#__PURE__*/ _interop_require_wildcard(require("bcrypt"));
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {
        __proto__: null
    };
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
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
let GDPRController = class GDPRController {
    /**
   * Export all user data (GDPR Right to Data Portability)
   */ async exportMyData(userId) {
        const data = await this.gdprService.exportUserData(userId);
        return data;
    }
    /**
   * Check if user can delete their account
   */ async canDeleteAccount(userId) {
        return this.gdprService.canDeleteUser(userId);
    }
    /**
   * Delete user account (GDPR Right to be Forgotten)
   * Requires password confirmation
   */ async deleteMyAccount(userId, dto) {
        // Verify password first
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            }
        });
        if (!user) {
            throw new _common.UnauthorizedException('User not found');
        }
        const isValidPassword = await _bcrypt.compare(dto.password, user.passwordHash);
        if (!isValidPassword) {
            throw new _common.UnauthorizedException('Invalid password');
        }
        // Check if user can be deleted
        const { canDelete, reasons } = await this.gdprService.canDeleteUser(userId);
        if (!canDelete) {
            throw new _common.UnauthorizedException({
                message: 'Cannot delete account',
                reasons
            });
        }
        // Delete the account
        await this.gdprService.deleteUserData(userId, dto.confirmation);
        return {
            message: 'Your account has been successfully deleted. All personal data has been anonymized.'
        };
    }
    constructor(gdprService, prisma){
        this.gdprService = gdprService;
        this.prisma = prisma;
    }
};
_ts_decorate([
    (0, _common.Get)('export'),
    (0, _common.Header)('Content-Type', 'application/json'),
    (0, _common.Header)('Content-Disposition', 'attachment; filename="my-data-export.json"'),
    _ts_param(0, (0, _getuserdecorator.GetUser)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], GDPRController.prototype, "exportMyData", null);
_ts_decorate([
    (0, _common.Get)('can-delete'),
    _ts_param(0, (0, _getuserdecorator.GetUser)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], GDPRController.prototype, "canDeleteAccount", null);
_ts_decorate([
    (0, _common.Delete)('delete-account'),
    _ts_param(0, (0, _getuserdecorator.GetUser)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _deleteaccountdto.DeleteAccountDto === "undefined" ? Object : _deleteaccountdto.DeleteAccountDto
    ]),
    _ts_metadata("design:returntype", Promise)
], GDPRController.prototype, "deleteMyAccount", null);
GDPRController = _ts_decorate([
    (0, _common.Controller)('gdpr'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _gdprservice.GDPRService === "undefined" ? Object : _gdprservice.GDPRService,
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService
    ])
], GDPRController);

//# sourceMappingURL=gdpr.controller.js.map