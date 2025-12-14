"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AuthService", {
    enumerable: true,
    get: function() {
        return AuthService;
    }
});
const _common = require("@nestjs/common");
const _jwt = require("@nestjs/jwt");
const _config = require("@nestjs/config");
const _bcrypt = /*#__PURE__*/ _interop_require_wildcard(require("bcrypt"));
const _database = require("../../../../../libs/database/src");
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
let AuthService = class AuthService {
    async register(dto) {
        // Check if user exists
        const existingUser = await this.prisma.user.findUnique({
            where: {
                email: dto.email.toLowerCase()
            }
        });
        if (existingUser) {
            throw new _common.ConflictException('Email already registered');
        }
        // Hash password
        const passwordHash = await _bcrypt.hash(dto.password, 12);
        // Create user
        const user = await this.prisma.user.create({
            data: {
                email: dto.email.toLowerCase(),
                passwordHash,
                firstName: dto.firstName,
                lastName: dto.lastName
            }
        });
        return this.generateTokens(user);
    }
    async login(dto) {
        const user = await this.validateUser(dto.email, dto.password);
        if (!user) {
            throw new _common.UnauthorizedException('Invalid email or password');
        }
        // Get full user to check 2FA status
        const fullUser = await this.prisma.user.findUniqueOrThrow({
            where: {
                id: user.id
            }
        });
        // Check if 2FA is enabled
        if (fullUser.twoFactorEnabled) {
            if (!dto.twoFactorToken) {
                throw new _common.UnauthorizedException({
                    code: 'TWO_FACTOR_REQUIRED',
                    message: '2FA token required'
                });
            }
            // Verify 2FA token (will be injected via TwoFactorService)
            // For now, we'll add the service in the next step
            const { TwoFactorService } = await Promise.resolve().then(()=>/*#__PURE__*/ _interop_require_wildcard(require("./services/two-factor.service.js")));
            const twoFactorService = new TwoFactorService(this.prisma, null);
            const isValid2FA = await twoFactorService.verifyUserToken(fullUser.id, dto.twoFactorToken);
            if (!isValid2FA) {
                throw new _common.UnauthorizedException('Invalid 2FA token');
            }
        }
        // Update last login
        await this.prisma.user.update({
            where: {
                id: user.id
            },
            data: {
                lastLoginAt: new Date()
            }
        });
        return this.generateTokens(fullUser);
    }
    async validateUser(email, password) {
        const user = await this.prisma.user.findUnique({
            where: {
                email: email.toLowerCase()
            }
        });
        if (!user || !user.isActive) {
            return null;
        }
        const isPasswordValid = await _bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return null;
        }
        return {
            id: user.id,
            email: user.email
        };
    }
    async refreshTokens(refreshToken) {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get('jwt.refreshSecret')
            });
            const user = await this.prisma.user.findUnique({
                where: {
                    id: payload.sub
                }
            });
            if (!user || !user.isActive) {
                throw new _common.UnauthorizedException('User not found or inactive');
            }
            return this.generateTokens(user);
        } catch  {
            throw new _common.UnauthorizedException('Invalid refresh token');
        }
    }
    async getMe(userId) {
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                createdAt: true,
                companyUsers: {
                    include: {
                        company: {
                            select: {
                                id: true,
                                name: true,
                                taxId: true
                            }
                        }
                    }
                }
            }
        });
        if (!user) {
            throw new _common.UnauthorizedException('User not found');
        }
        return {
            ...user,
            companies: user.companyUsers.map((cu)=>({
                    ...cu.company,
                    role: cu.role,
                    isDefault: cu.isDefault
                })),
            companyUsers: undefined
        };
    }
    async findOrCreateSSOUser(ssoData) {
        // Try to find existing SSO user
        let user = await this.prisma.user.findUnique({
            where: {
                ssoProvider_ssoId: {
                    ssoProvider: ssoData.ssoProvider,
                    ssoId: ssoData.ssoId
                }
            }
        });
        if (!user) {
            // Check if email already exists (link existing account)
            const existingEmailUser = await this.prisma.user.findUnique({
                where: {
                    email: ssoData.email.toLowerCase()
                }
            });
            if (existingEmailUser) {
                // Link SSO to existing account
                user = await this.prisma.user.update({
                    where: {
                        id: existingEmailUser.id
                    },
                    data: {
                        ssoProvider: ssoData.ssoProvider,
                        ssoId: ssoData.ssoId,
                        ssoMetadata: ssoData.ssoMetadata || {},
                        avatarUrl: ssoData.avatarUrl || existingEmailUser.avatarUrl
                    }
                });
            } else {
                // Create new user (auto-provisioning)
                user = await this.prisma.user.create({
                    data: {
                        email: ssoData.email.toLowerCase(),
                        passwordHash: '',
                        firstName: ssoData.firstName,
                        lastName: ssoData.lastName,
                        avatarUrl: ssoData.avatarUrl,
                        ssoProvider: ssoData.ssoProvider,
                        ssoId: ssoData.ssoId,
                        ssoMetadata: ssoData.ssoMetadata || {},
                        isActive: true
                    }
                });
            }
        } else {
            // Update last login and metadata
            user = await this.prisma.user.update({
                where: {
                    id: user.id
                },
                data: {
                    lastLoginAt: new Date(),
                    ssoMetadata: ssoData.ssoMetadata || user.ssoMetadata
                }
            });
        }
        return user;
    }
    getSamlMetadata() {
        const issuer = this.configService.get('SAML_ISSUER');
        const callbackUrl = this.configService.get('SAML_CALLBACK_URL');
        return `<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${issuer}">
  <SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <AssertionConsumerService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${callbackUrl}"
      index="1"/>
  </SPSSODescriptor>
</EntityDescriptor>`;
    }
    generateTokens(user) {
        const payload = {
            sub: user.id,
            email: user.email
        };
        const accessToken = this.jwtService.sign(payload, {
            secret: this.configService.get('jwt.secret'),
            expiresIn: this.configService.get('jwt.accessExpiresIn') || '15m'
        });
        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get('jwt.refreshSecret'),
            expiresIn: this.configService.get('jwt.refreshExpiresIn') || '7d'
        });
        return {
            accessToken,
            refreshToken,
            expiresIn: 900,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
            }
        };
    }
    constructor(prisma, jwtService, configService){
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
    }
};
AuthService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService,
        typeof _jwt.JwtService === "undefined" ? Object : _jwt.JwtService,
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService
    ])
], AuthService);

//# sourceMappingURL=auth.service.js.map