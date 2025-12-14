"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "TwoFactorService", {
    enumerable: true,
    get: function() {
        return TwoFactorService;
    }
});
const _common = require("@nestjs/common");
const _database = require("../../../../../../libs/database/src");
const _cryptoservice = require("./crypto.service");
const _speakeasy = /*#__PURE__*/ _interop_require_wildcard(require("speakeasy"));
const _qrcode = /*#__PURE__*/ _interop_require_wildcard(require("qrcode"));
const _crypto = /*#__PURE__*/ _interop_require_wildcard(require("crypto"));
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
let TwoFactorService = class TwoFactorService {
    /**
   * Generate 2FA secret and QR code for user
   */ async generateSecret(userId) {
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            }
        });
        if (!user) {
            throw new _common.BadRequestException('User not found');
        }
        if (user.twoFactorEnabled) {
            throw new _common.BadRequestException('2FA is already enabled for this user');
        }
        // Generate TOTP secret
        const secret = _speakeasy.generateSecret({
            name: `Crypto-ERP (${user.email})`,
            issuer: 'Crypto-ERP',
            length: 32
        });
        // Generate QR code
        const qrCode = await _qrcode.toDataURL(secret.otpauth_url);
        // Generate backup codes (10 codes)
        const backupCodes = Array.from({
            length: 10
        }, ()=>_crypto.randomBytes(4).toString('hex').toUpperCase());
        return {
            secret: secret.base32,
            qrCode,
            backupCodes
        };
    }
    /**
   * Enable 2FA for user after verifying the first token
   */ async enable2FA(userId, secret, token, backupCodes) {
        // Verify the token first
        const isValid = this.verifyToken(secret, token);
        if (!isValid) {
            throw new _common.BadRequestException('Invalid 2FA token. Please check your authenticator app.');
        }
        // Encrypt secret and backup codes before storing
        const encryptedSecret = await this.cryptoService.encrypt(secret);
        const encryptedBackupCodes = await this.cryptoService.encrypt(JSON.stringify(backupCodes));
        await this.prisma.user.update({
            where: {
                id: userId
            },
            data: {
                twoFactorEnabled: true,
                twoFactorSecret: encryptedSecret,
                twoFactorBackupCodes: encryptedBackupCodes
            }
        });
    }
    /**
   * Disable 2FA for user (requires password verification in controller)
   */ async disable2FA(userId) {
        await this.prisma.user.update({
            where: {
                id: userId
            },
            data: {
                twoFactorEnabled: false,
                twoFactorSecret: null,
                twoFactorBackupCodes: null
            }
        });
    }
    /**
   * Verify a TOTP token
   */ verifyToken(secret, token) {
        return _speakeasy.totp.verify({
            secret,
            encoding: 'base32',
            token,
            window: 2
        });
    }
    /**
   * Verify user's 2FA token (TOTP or backup code)
   */ async verifyUserToken(userId, token) {
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            }
        });
        if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
            return true; // 2FA not enabled, allow through
        }
        // Decrypt the secret
        const secret = await this.cryptoService.decrypt(user.twoFactorSecret);
        // Try TOTP token first
        if (this.verifyToken(secret, token)) {
            return true;
        }
        // Try backup codes
        if (user.twoFactorBackupCodes) {
            const backupCodes = JSON.parse(await this.cryptoService.decrypt(user.twoFactorBackupCodes));
            if (backupCodes.includes(token)) {
                // Remove the used backup code
                const updatedCodes = backupCodes.filter((code)=>code !== token);
                await this.prisma.user.update({
                    where: {
                        id: userId
                    },
                    data: {
                        twoFactorBackupCodes: await this.cryptoService.encrypt(JSON.stringify(updatedCodes))
                    }
                });
                return true;
            }
        }
        return false;
    }
    /**
   * Get remaining backup codes count
   */ async getRemainingBackupCodes(userId) {
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            }
        });
        if (!user || !user.twoFactorBackupCodes) {
            return 0;
        }
        const backupCodes = JSON.parse(await this.cryptoService.decrypt(user.twoFactorBackupCodes));
        return backupCodes.length;
    }
    /**
   * Regenerate backup codes
   */ async regenerateBackupCodes(userId) {
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            }
        });
        if (!user || !user.twoFactorEnabled) {
            throw new _common.BadRequestException('2FA is not enabled for this user');
        }
        // Generate new backup codes
        const backupCodes = Array.from({
            length: 10
        }, ()=>_crypto.randomBytes(4).toString('hex').toUpperCase());
        const encryptedBackupCodes = await this.cryptoService.encrypt(JSON.stringify(backupCodes));
        await this.prisma.user.update({
            where: {
                id: userId
            },
            data: {
                twoFactorBackupCodes: encryptedBackupCodes
            }
        });
        return backupCodes;
    }
    constructor(prisma, cryptoService){
        this.prisma = prisma;
        this.cryptoService = cryptoService;
    }
};
TwoFactorService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService,
        typeof _cryptoservice.CryptoService === "undefined" ? Object : _cryptoservice.CryptoService
    ])
], TwoFactorService);

//# sourceMappingURL=two-factor.service.js.map