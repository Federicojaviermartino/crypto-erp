import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@crypto-erp/database';
import { UpdateWhiteLabelDto } from './dto/update-white-label.dto.js';

/**
 * White-Label Service
 *
 * Manages branding customization for companies:
 * - Theme colors and CSS
 * - Logo and favicon
 * - Custom domain
 * - Email branding
 * - Feature flags
 */
@Injectable()
export class WhiteLabelService {
  private readonly logger = new Logger(WhiteLabelService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get white-label configuration for a company
   */
  async getWhiteLabelConfig(companyId: string) {
    let config = await this.prisma.whiteLabelConfig.findUnique({
      where: { companyId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
      },
    });

    // Create default config if not exists
    if (!config) {
      config = await this.prisma.whiteLabelConfig.create({
        data: {
          companyId,
          enabledFeatures: ['invoicing', 'crypto', 'analytics', 'integrations'],
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              logo: true,
            },
          },
        },
      });
      this.logger.log(`Created default white-label config for company ${companyId}`);
    }

    return config;
  }

  /**
   * Get white-label configuration by custom domain
   * Used for multi-tenant routing
   */
  async getWhiteLabelByDomain(domain: string) {
    const config = await this.prisma.whiteLabelConfig.findUnique({
      where: { customDomain: domain },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
      },
    });

    if (!config) {
      throw new NotFoundException(`No white-label configuration found for domain: ${domain}`);
    }

    if (!config.domainVerified) {
      throw new BadRequestException(`Domain ${domain} is not verified yet`);
    }

    return config;
  }

  /**
   * Update white-label configuration
   */
  async updateWhiteLabelConfig(companyId: string, dto: UpdateWhiteLabelDto) {
    // Validate custom domain uniqueness
    if (dto.customDomain) {
      const existing = await this.prisma.whiteLabelConfig.findFirst({
        where: {
          customDomain: dto.customDomain,
          companyId: { not: companyId },
        },
      });

      if (existing) {
        throw new BadRequestException(`Custom domain ${dto.customDomain} is already in use`);
      }
    }

    // Validate hex colors
    if (dto.primaryColor && !this.isValidHexColor(dto.primaryColor)) {
      throw new BadRequestException('Invalid primaryColor format. Use #RRGGBB');
    }
    if (dto.secondaryColor && !this.isValidHexColor(dto.secondaryColor)) {
      throw new BadRequestException('Invalid secondaryColor format. Use #RRGGBB');
    }
    if (dto.accentColor && !this.isValidHexColor(dto.accentColor)) {
      throw new BadRequestException('Invalid accentColor format. Use #RRGGBB');
    }

    // Upsert configuration
    const config = await this.prisma.whiteLabelConfig.upsert({
      where: { companyId },
      create: {
        companyId,
        ...dto,
      },
      update: dto,
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(`Updated white-label config for company ${companyId}`);
    return config;
  }

  /**
   * Verify custom domain ownership
   * In production, this would check DNS records or challenge tokens
   */
  async verifyCustomDomain(companyId: string): Promise<boolean> {
    const config = await this.prisma.whiteLabelConfig.findUnique({
      where: { companyId },
    });

    if (!config?.customDomain) {
      throw new BadRequestException('No custom domain configured');
    }

    // TODO: Implement actual DNS verification
    // For now, simulate verification
    const verified = true; // In production: check DNS TXT record or CNAME

    if (verified) {
      await this.prisma.whiteLabelConfig.update({
        where: { companyId },
        data: { domainVerified: true },
      });

      this.logger.log(`Verified custom domain ${config.customDomain} for company ${companyId}`);
    }

    return verified;
  }

  /**
   * Get theme CSS variables for a company
   */
  async getThemeCss(companyId: string): Promise<string> {
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
   */
  async isFeatureEnabled(companyId: string, feature: string): Promise<boolean> {
    const config = await this.getWhiteLabelConfig(companyId);
    return config.enabledFeatures.includes(feature);
  }

  /**
   * Get email branding for a company
   */
  async getEmailBranding(companyId: string) {
    const config = await this.getWhiteLabelConfig(companyId);

    return {
      fromName: config.emailFromName || config.company.name,
      replyTo: config.emailReplyTo,
      logoUrl: config.logoUrl || config.company.logo,
      footerText: config.emailFooterText,
      brandName: config.brandName || config.company.name,
    };
  }

  /**
   * Delete white-label configuration (reset to defaults)
   */
  async deleteWhiteLabelConfig(companyId: string) {
    await this.prisma.whiteLabelConfig.delete({
      where: { companyId },
    });

    this.logger.log(`Deleted white-label config for company ${companyId}`);
    return { success: true, message: 'White-label configuration reset to defaults' };
  }

  /**
   * Helper: Validate hex color format
   */
  private isValidHexColor(color: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  }
}
