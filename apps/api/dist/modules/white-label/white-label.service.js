"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "WhiteLabelService", {
    enumerable: true,
    get: function() {
        return WhiteLabelService;
    }
});
const _common = require("@nestjs/common");
const _database = require("../../../../../libs/database/src");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let WhiteLabelService = class WhiteLabelService {
    /**
   * Get white-label configuration for a company
   */ async getWhiteLabelConfig(companyId) {
        let config = await this.prisma.whiteLabelConfig.findUnique({
            where: {
                companyId
            },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                        logo: true
                    }
                }
            }
        });
        // Create default config if not exists
        if (!config) {
            config = await this.prisma.whiteLabelConfig.create({
                data: {
                    companyId,
                    enabledFeatures: [
                        'invoicing',
                        'crypto',
                        'analytics',
                        'integrations'
                    ]
                },
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true,
                            logo: true
                        }
                    }
                }
            });
            this.logger.log(`Created default white-label config for company ${companyId}`);
        }
        return config;
    }
    /**
   * Get white-label configuration by custom domain
   * Used for multi-tenant routing
   */ async getWhiteLabelByDomain(domain) {
        const config = await this.prisma.whiteLabelConfig.findUnique({
            where: {
                customDomain: domain
            },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                        logo: true
                    }
                }
            }
        });
        if (!config) {
            throw new _common.NotFoundException(`No white-label configuration found for domain: ${domain}`);
        }
        if (!config.domainVerified) {
            throw new _common.BadRequestException(`Domain ${domain} is not verified yet`);
        }
        return config;
    }
    /**
   * Update white-label configuration
   */ async updateWhiteLabelConfig(companyId, dto) {
        // Validate custom domain uniqueness
        if (dto.customDomain) {
            const existing = await this.prisma.whiteLabelConfig.findFirst({
                where: {
                    customDomain: dto.customDomain,
                    companyId: {
                        not: companyId
                    }
                }
            });
            if (existing) {
                throw new _common.BadRequestException(`Custom domain ${dto.customDomain} is already in use`);
            }
        }
        // Validate hex colors
        if (dto.primaryColor && !this.isValidHexColor(dto.primaryColor)) {
            throw new _common.BadRequestException('Invalid primaryColor format. Use #RRGGBB');
        }
        if (dto.secondaryColor && !this.isValidHexColor(dto.secondaryColor)) {
            throw new _common.BadRequestException('Invalid secondaryColor format. Use #RRGGBB');
        }
        if (dto.accentColor && !this.isValidHexColor(dto.accentColor)) {
            throw new _common.BadRequestException('Invalid accentColor format. Use #RRGGBB');
        }
        // Upsert configuration
        const config = await this.prisma.whiteLabelConfig.upsert({
            where: {
                companyId
            },
            create: {
                companyId,
                ...dto
            },
            update: dto,
            include: {
                company: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        this.logger.log(`Updated white-label config for company ${companyId}`);
        return config;
    }
    /**
   * Verify custom domain ownership
   * In production, this would check DNS records or challenge tokens
   */ async verifyCustomDomain(companyId) {
        const config = await this.prisma.whiteLabelConfig.findUnique({
            where: {
                companyId
            }
        });
        if (!config?.customDomain) {
            throw new _common.BadRequestException('No custom domain configured');
        }
        // TODO: Implement actual DNS verification
        // For now, simulate verification
        const verified = true; // In production: check DNS TXT record or CNAME
        if (verified) {
            await this.prisma.whiteLabelConfig.update({
                where: {
                    companyId
                },
                data: {
                    domainVerified: true
                }
            });
            this.logger.log(`Verified custom domain ${config.customDomain} for company ${companyId}`);
        }
        return verified;
    }
    /**
   * Get theme CSS variables for a company
   */ async getThemeCss(companyId) {
        const config = await this.getWhiteLabelConfig(companyId);
        const cssVariables = `
:root {
  ${config.primaryColor ? `--primary-color: ${config.primaryColor};` : ''}
  ${config.secondaryColor ? `--secondary-color: ${config.secondaryColor};` : ''}
  ${config.accentColor ? `--accent-color: ${config.accentColor};` : ''}
  ${config.backgroundColor ? `--background-color: ${config.backgroundColor};` : ''}
  ${config.textColor ? `--text-color: ${config.textColor};` : ''}
}
${config.customCss || ''}
`.trim();
        return cssVariables;
    }
    /**
   * Check if feature is enabled for company
   */ async isFeatureEnabled(companyId, feature) {
        const config = await this.getWhiteLabelConfig(companyId);
        return config.enabledFeatures.includes(feature);
    }
    /**
   * Get email branding for a company
   */ async getEmailBranding(companyId) {
        const config = await this.getWhiteLabelConfig(companyId);
        return {
            fromName: config.emailFromName || config.company.name,
            replyTo: config.emailReplyTo,
            logoUrl: config.logoUrl || config.company.logo,
            footerText: config.emailFooterText,
            brandName: config.brandName || config.company.name
        };
    }
    /**
   * Delete white-label configuration (reset to defaults)
   */ async deleteWhiteLabelConfig(companyId) {
        await this.prisma.whiteLabelConfig.delete({
            where: {
                companyId
            }
        });
        this.logger.log(`Deleted white-label config for company ${companyId}`);
        return {
            success: true,
            message: 'White-label configuration reset to defaults'
        };
    }
    /**
   * Helper: Validate hex color format
   */ isValidHexColor(color) {
        return /^#[0-9A-Fa-f]{6}$/.test(color);
    }
    constructor(prisma){
        this.prisma = prisma;
        this.logger = new _common.Logger(WhiteLabelService.name);
    }
};
WhiteLabelService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService
    ])
], WhiteLabelService);

//# sourceMappingURL=white-label.service.js.map