"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "TwoFactorController", {
    enumerable: true,
    get: function() {
        return TwoFactorController;
    }
});
const _common = require("@nestjs/common");
const _twofactorservice = require("./services/two-factor.service");
const _jwtauthguard = require("./guards/jwt-auth.guard");
const _getuserdecorator = require("./decorators/get-user.decorator");
const _enable2fadto = require("./dto/enable-2fa.dto");
const _verify2fadto = require("./dto/verify-2fa.dto");
const _disable2fadto = require("./dto/disable-2fa.dto");
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
let TwoFactorController = class TwoFactorController {
    /**
   * Generate 2FA secret and QR code
   * Step 1: User requests to enable 2FA
   */ async generate(userId) {
        const { secret, qrCode, backupCodes } = await this.twoFactorService.generateSecret(userId);
        return {
            secret,
            qrCode,
            backupCodes,
            message: 'Scan the QR code with your authenticator app and verify with a token to enable 2FA'
        };
    }
    /**
   * Enable 2FA after user verifies the token
   * Step 2: User scans QR and provides first token
   */ async enable(userId, dto) {
        await this.twoFactorService.enable2FA(userId, dto.secret, dto.token, dto.backupCodes);
        return {
            message: '2FA enabled successfully',
            backupCodes: dto.backupCodes
        };
    }
    /**
   * Disable 2FA (requires password confirmation)
   */ async disable(userId, dto) {
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
        await this.twoFactorService.disable2FA(userId);
        return {
            message: '2FA disabled successfully'
        };
    }
    /**
   * Verify a 2FA token (for testing)
   */ async verify(userId, dto) {
        const isValid = await this.twoFactorService.verifyUserToken(userId, dto.token);
        if (!isValid) {
            throw new _common.UnauthorizedException('Invalid 2FA token');
        }
        return {
            message: 'Token verified successfully'
        };
    }
    /**
   * Get 2FA status for current user
   */ async getStatus(userId) {
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            },
            select: {
                twoFactorEnabled: true
            }
        });
        const remainingBackupCodes = user?.twoFactorEnabled ? await this.twoFactorService.getRemainingBackupCodes(userId) : 0;
        return {
            enabled: user?.twoFactorEnabled || false,
            remainingBackupCodes
        };
    }
    /**
   * Regenerate backup codes
   */ async regenerateBackupCodes(userId) {
        const backupCodes = await this.twoFactorService.regenerateBackupCodes(userId);
        return {
            message: 'Backup codes regenerated successfully',
            backupCodes
        };
    }
    constructor(twoFactorService, prisma){
        this.twoFactorService = twoFactorService;
        this.prisma = prisma;
    }
};
_ts_decorate([
    (0, _common.Get)('generate'),
    _ts_param(0, (0, _getuserdecorator.GetUser)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], TwoFactorController.prototype, "generate", null);
_ts_decorate([
    (0, _common.Post)('enable'),
    _ts_param(0, (0, _getuserdecorator.GetUser)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _enable2fadto.Enable2FADto === "undefined" ? Object : _enable2fadto.Enable2FADto
    ]),
    _ts_metadata("design:returntype", Promise)
], TwoFactorController.prototype, "enable", null);
_ts_decorate([
    (0, _common.Delete)('disable'),
    _ts_param(0, (0, _getuserdecorator.GetUser)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _disable2fadto.Disable2FADto === "undefined" ? Object : _disable2fadto.Disable2FADto
    ]),
    _ts_metadata("design:returntype", Promise)
], TwoFactorController.prototype, "disable", null);
_ts_decorate([
    (0, _common.Post)('verify'),
    _ts_param(0, (0, _getuserdecorator.GetUser)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _verify2fadto.Verify2FADto === "undefined" ? Object : _verify2fadto.Verify2FADto
    ]),
    _ts_metadata("design:returntype", Promise)
], TwoFactorController.prototype, "verify", null);
_ts_decorate([
    (0, _common.Get)('status'),
    _ts_param(0, (0, _getuserdecorator.GetUser)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], TwoFactorController.prototype, "getStatus", null);
_ts_decorate([
    (0, _common.Post)('backup-codes/regenerate'),
    _ts_param(0, (0, _getuserdecorator.GetUser)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], TwoFactorController.prototype, "regenerateBackupCodes", null);
TwoFactorController = _ts_decorate([
    (0, _common.Controller)('auth/2fa'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _twofactorservice.TwoFactorService === "undefined" ? Object : _twofactorservice.TwoFactorService,
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService
    ])
], TwoFactorController);

//# sourceMappingURL=two-factor.controller.js.map