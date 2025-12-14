"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CryptoService", {
    enumerable: true,
    get: function() {
        return CryptoService;
    }
});
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
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
let CryptoService = class CryptoService {
    /**
   * Encrypt a string value
   */ async encrypt(plaintext) {
        try {
            const iv = _crypto.randomBytes(this.ivLength);
            const cipher = _crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
            const encrypted = Buffer.concat([
                cipher.update(plaintext, 'utf8'),
                cipher.final()
            ]);
            const tag = cipher.getAuthTag();
            // Format: iv:tag:encrypted (all base64)
            return [
                iv.toString('base64'),
                tag.toString('base64'),
                encrypted.toString('base64')
            ].join(':');
        } catch (error) {
            throw new Error(`Encryption failed: ${error.message}`);
        }
    }
    /**
   * Decrypt an encrypted string
   */ async decrypt(ciphertext) {
        try {
            const [ivB64, tagB64, encryptedB64] = ciphertext.split(':');
            const iv = Buffer.from(ivB64, 'base64');
            const tag = Buffer.from(tagB64, 'base64');
            const encrypted = Buffer.from(encryptedB64, 'base64');
            const decipher = _crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
            decipher.setAuthTag(tag);
            const decrypted = Buffer.concat([
                decipher.update(encrypted),
                decipher.final()
            ]);
            return decrypted.toString('utf8');
        } catch (error) {
            throw new Error(`Decryption failed: ${error.message}`);
        }
    }
    /**
   * Generate a random token
   */ generateRandomToken(length = 32) {
        return _crypto.randomBytes(length).toString('hex');
    }
    /**
   * Hash a password or sensitive data (one-way)
   */ hash(data) {
        return _crypto.createHash('sha256').update(data).digest('hex');
    }
    constructor(configService){
        this.configService = configService;
        this.algorithm = 'aes-256-gcm';
        this.keyLength = 32; // 256 bits
        this.ivLength = 16; // 128 bits
        this.saltLength = 64;
        this.tagLength = 16;
        const key = this.configService.get('ENCRYPTION_KEY');
        if (!key) {
            // Generate a random key for development (NOT for production!)
            console.warn('ENCRYPTION_KEY not set! Generating random key. DO NOT use in production!');
            this.encryptionKey = _crypto.randomBytes(this.keyLength);
        } else {
            // Derive key from the config string
            this.encryptionKey = _crypto.scryptSync(key, 'salt', this.keyLength);
        }
    }
};
CryptoService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService
    ])
], CryptoService);

//# sourceMappingURL=crypto.service.js.map