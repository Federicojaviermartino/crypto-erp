"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "BaseIntegrationService", {
    enumerable: true,
    get: function() {
        return BaseIntegrationService;
    }
});
const _common = require("@nestjs/common");
const _database = require("../../../../../../libs/database/src");
const _cryptoservice = require("../../auth/services/crypto.service.js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let BaseIntegrationService = class BaseIntegrationService {
    /**
   * Create or update integration
   */ async saveIntegration(data) {
        // Encrypt tokens
        const encryptedAccessToken = this.cryptoService.encrypt(data.accessToken);
        const encryptedRefreshToken = data.refreshToken ? this.cryptoService.encrypt(data.refreshToken) : null;
        // Calculate expiration
        const expiresAt = data.expiresIn ? new Date(Date.now() + data.expiresIn * 1000) : null;
        // Upsert integration
        return this.prisma.integration.upsert({
            where: {
                companyId_provider: {
                    companyId: data.companyId,
                    provider: data.provider
                }
            },
            create: {
                companyId: data.companyId,
                provider: data.provider,
                name: data.name,
                accessToken: encryptedAccessToken,
                refreshToken: encryptedRefreshToken,
                expiresAt,
                metadata: data.metadata || {}
            },
            update: {
                name: data.name,
                accessToken: encryptedAccessToken,
                refreshToken: encryptedRefreshToken,
                expiresAt,
                metadata: data.metadata || {},
                isActive: true
            }
        });
    }
    /**
   * Get integration for company and provider
   */ async getIntegration(companyId, provider) {
        return this.prisma.integration.findUnique({
            where: {
                companyId_provider: {
                    companyId,
                    provider
                }
            }
        });
    }
    /**
   * Get decrypted access token
   */ getDecryptedAccessToken(integration) {
        if (!integration.accessToken) {
            return null;
        }
        try {
            return this.cryptoService.decrypt(integration.accessToken);
        } catch (error) {
            console.error('Failed to decrypt access token:', error);
            return null;
        }
    }
    /**
   * Get decrypted refresh token
   */ getDecryptedRefreshToken(integration) {
        if (!integration.refreshToken) {
            return null;
        }
        try {
            return this.cryptoService.decrypt(integration.refreshToken);
        } catch (error) {
            console.error('Failed to decrypt refresh token:', error);
            return null;
        }
    }
    /**
   * Update sync status
   */ async updateSyncStatus(integrationId, status, error) {
        return this.prisma.integration.update({
            where: {
                id: integrationId
            },
            data: {
                lastSyncAt: new Date(),
                lastSyncStatus: status,
                lastSyncError: error || null
            }
        });
    }
    /**
   * List all integrations for company
   */ async listIntegrations(companyId) {
        return this.prisma.integration.findMany({
            where: {
                companyId
            },
            select: {
                id: true,
                provider: true,
                name: true,
                syncEnabled: true,
                syncFrequency: true,
                lastSyncAt: true,
                lastSyncStatus: true,
                isActive: true,
                createdAt: true,
                expiresAt: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    }
    /**
   * Disconnect integration
   */ async disconnectIntegration(integrationId, companyId) {
        const integration = await this.prisma.integration.findFirst({
            where: {
                id: integrationId,
                companyId
            }
        });
        if (!integration) {
            throw new Error('Integration not found');
        }
        return this.prisma.integration.update({
            where: {
                id: integrationId
            },
            data: {
                isActive: false,
                syncEnabled: false
            }
        });
    }
    /**
   * Delete integration
   */ async deleteIntegration(integrationId, companyId) {
        const integration = await this.prisma.integration.findFirst({
            where: {
                id: integrationId,
                companyId
            }
        });
        if (!integration) {
            throw new Error('Integration not found');
        }
        return this.prisma.integration.delete({
            where: {
                id: integrationId
            }
        });
    }
    constructor(prisma, cryptoService){
        this.prisma = prisma;
        this.cryptoService = cryptoService;
    }
};
BaseIntegrationService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService,
        typeof _cryptoservice.CryptoService === "undefined" ? Object : _cryptoservice.CryptoService
    ])
], BaseIntegrationService);

//# sourceMappingURL=base-integration.service.js.map