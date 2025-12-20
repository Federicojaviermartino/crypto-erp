"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "OAuthService", {
    enumerable: true,
    get: function() {
        return OAuthService;
    }
});
const _common = require("@nestjs/common");
const _database = require("../../../../../libs/database/src");
const _bcrypt = /*#__PURE__*/ _interop_require_wildcard(require("bcrypt"));
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
let OAuthService = class OAuthService {
    /**
   * Create a new OAuth application
   */ async createApp(companyId, userId, dto) {
        // Generate client credentials
        const clientId = this.generateClientId();
        const clientSecret = this.generateClientSecret();
        const hashedSecret = await _bcrypt.hash(clientSecret, 10);
        const app = await this.prisma.oAuthApp.create({
            data: {
                companyId,
                createdById: userId,
                name: dto.name,
                description: dto.description,
                logoUrl: dto.logoUrl,
                website: dto.website,
                clientId,
                clientSecret: hashedSecret,
                redirectUris: dto.redirectUris,
                scopes: dto.scopes,
                rateLimit: dto.rateLimit || 1000,
                dailyQuota: dto.dailyQuota || 10000
            }
        });
        return {
            id: app.id,
            name: app.name,
            clientId: app.clientId,
            clientSecret: clientSecret,
            redirectUris: app.redirectUris,
            scopes: app.scopes,
            rateLimit: app.rateLimit,
            dailyQuota: app.dailyQuota,
            createdAt: app.createdAt
        };
    }
    /**
   * Get OAuth app by client ID
   */ async getAppByClientId(clientId) {
        const app = await this.prisma.oAuthApp.findUnique({
            where: {
                clientId
            }
        });
        if (!app) {
            throw new _common.NotFoundException('OAuth app not found');
        }
        if (!app.isActive) {
            throw new _common.BadRequestException('OAuth app is inactive');
        }
        return app;
    }
    /**
   * List OAuth apps for a company
   */ async listApps(companyId) {
        return this.prisma.oAuthApp.findMany({
            where: {
                companyId
            },
            select: {
                id: true,
                name: true,
                description: true,
                logoUrl: true,
                website: true,
                clientId: true,
                redirectUris: true,
                scopes: true,
                rateLimit: true,
                dailyQuota: true,
                isActive: true,
                isPublic: true,
                createdAt: true,
                updatedAt: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    }
    /**
   * Generate authorization code
   * Step 1 of OAuth 2.0 Authorization Code Flow
   */ async generateAuthorizationCode(clientId, userId, companyId, redirectUri, scopes) {
        const app = await this.getAppByClientId(clientId);
        // Validate redirect URI
        if (!app.redirectUris.includes(redirectUri)) {
            throw new _common.BadRequestException('Invalid redirect URI');
        }
        // Validate scopes
        const invalidScopes = scopes.filter((scope)=>!app.scopes.includes(scope));
        if (invalidScopes.length > 0) {
            throw new _common.BadRequestException(`Invalid scopes: ${invalidScopes.join(', ')}`);
        }
        // Generate authorization code
        const code = this.generateRandomToken(32);
        const hashedCode = await _bcrypt.hash(code, 10);
        const expiresAt = new Date(Date.now() + this.AUTH_CODE_EXPIRY * 1000);
        // Store authorization code in token table
        await this.prisma.oAuthToken.create({
            data: {
                appId: app.id,
                userId,
                companyId,
                authorizationCode: hashedCode,
                codeExpiresAt: expiresAt,
                scopes,
                accessToken: '',
                expiresAt: new Date()
            }
        });
        return {
            code,
            expiresIn: this.AUTH_CODE_EXPIRY
        };
    }
    /**
   * Exchange authorization code for access token
   * Step 2 of OAuth 2.0 Authorization Code Flow
   */ async exchangeCodeForToken(code, clientId, clientSecret, redirectUri) {
        const app = await this.getAppByClientId(clientId);
        // Verify client secret
        const secretValid = await _bcrypt.compare(clientSecret, app.clientSecret);
        if (!secretValid) {
            throw new _common.UnauthorizedException('Invalid client credentials');
        }
        // Find authorization code
        const tokenRecords = await this.prisma.oAuthToken.findMany({
            where: {
                appId: app.id,
                isRevoked: false
            }
        });
        let tokenRecord = null;
        for (const record of tokenRecords){
            if (record.authorizationCode) {
                const codeValid = await _bcrypt.compare(code, record.authorizationCode);
                if (codeValid) {
                    tokenRecord = record;
                    break;
                }
            }
        }
        if (!tokenRecord) {
            throw new _common.UnauthorizedException('Invalid authorization code');
        }
        // Check if code is expired
        if (tokenRecord.codeExpiresAt && tokenRecord.codeExpiresAt < new Date()) {
            throw new _common.UnauthorizedException('Authorization code expired');
        }
        // Generate access and refresh tokens
        const accessToken = this.generateRandomToken(64);
        const refreshToken = this.generateRandomToken(64);
        const hashedAccessToken = await _bcrypt.hash(accessToken, 10);
        const hashedRefreshToken = await _bcrypt.hash(refreshToken, 10);
        const accessTokenExpiresAt = new Date(Date.now() + this.ACCESS_TOKEN_EXPIRY * 1000);
        const refreshTokenExpiresAt = new Date(Date.now() + this.REFRESH_TOKEN_EXPIRY * 1000);
        // Update token record with access and refresh tokens
        await this.prisma.oAuthToken.update({
            where: {
                id: tokenRecord.id
            },
            data: {
                accessToken: hashedAccessToken,
                refreshToken: hashedRefreshToken,
                expiresAt: accessTokenExpiresAt,
                refreshExpiresAt: refreshTokenExpiresAt,
                authorizationCode: null,
                codeExpiresAt: null
            }
        });
        return {
            accessToken,
            refreshToken,
            tokenType: 'Bearer',
            expiresIn: this.ACCESS_TOKEN_EXPIRY,
            scope: tokenRecord.scopes.join(' ')
        };
    }
    /**
   * Refresh access token using refresh token
   */ async refreshAccessToken(refreshToken, clientId, clientSecret) {
        const app = await this.getAppByClientId(clientId);
        // Verify client secret
        const secretValid = await _bcrypt.compare(clientSecret, app.clientSecret);
        if (!secretValid) {
            throw new _common.UnauthorizedException('Invalid client credentials');
        }
        // Find refresh token
        const tokenRecords = await this.prisma.oAuthToken.findMany({
            where: {
                appId: app.id,
                isRevoked: false
            }
        });
        let tokenRecord = null;
        for (const record of tokenRecords){
            if (record.refreshToken) {
                const tokenValid = await _bcrypt.compare(refreshToken, record.refreshToken);
                if (tokenValid) {
                    tokenRecord = record;
                    break;
                }
            }
        }
        if (!tokenRecord) {
            throw new _common.UnauthorizedException('Invalid refresh token');
        }
        // Check if refresh token is expired
        if (tokenRecord.refreshExpiresAt && tokenRecord.refreshExpiresAt < new Date()) {
            throw new _common.UnauthorizedException('Refresh token expired');
        }
        // Generate new access token
        const newAccessToken = this.generateRandomToken(64);
        const hashedAccessToken = await _bcrypt.hash(newAccessToken, 10);
        const accessTokenExpiresAt = new Date(Date.now() + this.ACCESS_TOKEN_EXPIRY * 1000);
        // Update token record
        await this.prisma.oAuthToken.update({
            where: {
                id: tokenRecord.id
            },
            data: {
                accessToken: hashedAccessToken,
                expiresAt: accessTokenExpiresAt,
                lastUsedAt: new Date()
            }
        });
        return {
            accessToken: newAccessToken,
            tokenType: 'Bearer',
            expiresIn: this.ACCESS_TOKEN_EXPIRY,
            scope: tokenRecord.scopes.join(' ')
        };
    }
    /**
   * Verify access token and return token data
   */ async verifyAccessToken(accessToken) {
        const tokenRecords = await this.prisma.oAuthToken.findMany({
            where: {
                isRevoked: false
            },
            include: {
                app: true,
                user: true,
                company: true
            }
        });
        let tokenRecord = null;
        for (const record of tokenRecords){
            const tokenValid = await _bcrypt.compare(accessToken, record.accessToken);
            if (tokenValid) {
                tokenRecord = record;
                break;
            }
        }
        if (!tokenRecord) {
            throw new _common.UnauthorizedException('Invalid access token');
        }
        // Check if token is expired
        if (tokenRecord.expiresAt < new Date()) {
            throw new _common.UnauthorizedException('Access token expired');
        }
        // Check if app is still active
        if (!tokenRecord.app.isActive) {
            throw new _common.UnauthorizedException('OAuth app is inactive');
        }
        // Update last used timestamp
        await this.prisma.oAuthToken.update({
            where: {
                id: tokenRecord.id
            },
            data: {
                lastUsedAt: new Date()
            }
        });
        return {
            userId: tokenRecord.userId,
            companyId: tokenRecord.companyId,
            scopes: tokenRecord.scopes,
            app: {
                id: tokenRecord.app.id,
                name: tokenRecord.app.name,
                clientId: tokenRecord.app.clientId
            }
        };
    }
    /**
   * Revoke token (access or refresh)
   */ async revokeToken(token) {
        const tokenRecords = await this.prisma.oAuthToken.findMany({
            where: {
                isRevoked: false
            }
        });
        for (const record of tokenRecords){
            const accessTokenMatch = await _bcrypt.compare(token, record.accessToken);
            const refreshTokenMatch = record.refreshToken && await _bcrypt.compare(token, record.refreshToken);
            if (accessTokenMatch || refreshTokenMatch) {
                await this.prisma.oAuthToken.update({
                    where: {
                        id: record.id
                    },
                    data: {
                        isRevoked: true
                    }
                });
                return {
                    success: true
                };
            }
        }
        return {
            success: false
        };
    }
    /**
   * Delete OAuth app
   */ async deleteApp(appId, companyId) {
        const app = await this.prisma.oAuthApp.findFirst({
            where: {
                id: appId,
                companyId
            }
        });
        if (!app) {
            throw new _common.NotFoundException('OAuth app not found');
        }
        await this.prisma.oAuthApp.delete({
            where: {
                id: appId
            }
        });
        return {
            success: true
        };
    }
    // ============================================================================
    // Helper Methods
    // ============================================================================
    generateClientId() {
        return `${_crypto.randomBytes(8).toString('hex')}_${Date.now().toString(36)}`;
    }
    generateClientSecret() {
        return _crypto.randomBytes(32).toString('base64url');
    }
    generateRandomToken(length) {
        return _crypto.randomBytes(length).toString('base64url');
    }
    constructor(prisma){
        this.prisma = prisma;
        // Token expiration times
        this.ACCESS_TOKEN_EXPIRY = 3600; // 1 hour in seconds
        this.REFRESH_TOKEN_EXPIRY = 2592000; // 30 days in seconds
        this.AUTH_CODE_EXPIRY = 600; // 10 minutes in seconds
    }
};
OAuthService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService
    ])
], OAuthService);

//# sourceMappingURL=oauth.service.js.map