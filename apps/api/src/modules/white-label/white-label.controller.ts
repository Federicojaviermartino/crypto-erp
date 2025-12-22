import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Headers,
  BadRequestException,
  UseGuards,
  Post,
  Param,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { WhiteLabelService } from './white-label.service.js';
import { UpdateWhiteLabelDto } from './dto/update-white-label.dto.js';

/**
 * White-Label Controller
 *
 * Endpoints:
 * GET /white-label - Get current company's white-label config
 * GET /white-label/theme.css - Get theme CSS for current company
 * PUT /white-label - Update white-label configuration
 * POST /white-label/verify-domain - Verify custom domain
 * DELETE /white-label - Reset to defaults
 */
@Controller('white-label')
@UseGuards(JwtAuthGuard)
export class WhiteLabelController {
  constructor(private readonly whiteLabelService: WhiteLabelService) {}

  private getCompanyId(headers: Record<string, string>): string {
    const companyId = headers['x-company-id'];
    if (!companyId) {
      throw new BadRequestException('X-Company-Id header is required');
    }
    return companyId;
  }

  /**
   * Get white-label configuration for current company
   * GET /white-label
   */
  @Get()
  async getWhiteLabelConfig(@Headers() headers: Record<string, string>) {
    const companyId = this.getCompanyId(headers);
    return this.whiteLabelService.getWhiteLabelConfig(companyId);
  }

  /**
   * Get theme CSS for current company
   * GET /white-label/theme.css
   *
   * Returns CSS with custom color variables
   */
  @Get('theme.css')
  async getThemeCss(@Headers() headers: Record<string, string>) {
    const companyId = this.getCompanyId(headers);
    const css = await this.whiteLabelService.getThemeCss(companyId);

    return {
      css,
      contentType: 'text/css',
    };
  }

  /**
   * Get email branding configuration
   * GET /white-label/email-branding
   */
  @Get('email-branding')
  async getEmailBranding(@Headers() headers: Record<string, string>) {
    const companyId = this.getCompanyId(headers);
    return this.whiteLabelService.getEmailBranding(companyId);
  }

  /**
   * Check if feature is enabled
   * GET /white-label/features/:feature
   */
  @Get('features/:feature')
  async isFeatureEnabled(
    @Headers() headers: Record<string, string>,
    @Param('feature') feature: string,
  ) {
    const companyId = this.getCompanyId(headers);
    const enabled = await this.whiteLabelService.isFeatureEnabled(companyId, feature);

    return {
      feature,
      enabled,
    };
  }

  /**
   * Update white-label configuration
   * PUT /white-label
   *
   * Example:
   * {
   *   "brandName": "My Brand",
   *   "primaryColor": "#FF0000",
   *   "logoUrl": "https://cdn.example.com/logo.png",
   *   "customDomain": "app.mybrand.com",
   *   "enabledFeatures": ["invoicing", "crypto"]
   * }
   */
  @Put()
  async updateWhiteLabelConfig(
    @Headers() headers: Record<string, string>,
    @Body() dto: UpdateWhiteLabelDto,
  ) {
    const companyId = this.getCompanyId(headers);
    return this.whiteLabelService.updateWhiteLabelConfig(companyId, dto);
  }

  /**
   * Verify custom domain ownership
   * POST /white-label/verify-domain
   *
   * Checks DNS records to verify domain ownership
   */
  @Post('verify-domain')
  async verifyCustomDomain(@Headers() headers: Record<string, string>) {
    const companyId = this.getCompanyId(headers);
    const verified = await this.whiteLabelService.verifyCustomDomain(companyId);

    return {
      verified,
      message: verified ? 'Domain verified successfully' : 'Domain verification failed',
    };
  }

  /**
   * Reset white-label configuration to defaults
   * DELETE /white-label
   */
  @Delete()
  async deleteWhiteLabelConfig(@Headers() headers: Record<string, string>) {
    const companyId = this.getCompanyId(headers);
    return this.whiteLabelService.deleteWhiteLabelConfig(companyId);
  }
}
