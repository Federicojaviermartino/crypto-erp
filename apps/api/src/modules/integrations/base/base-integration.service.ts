import { Injectable } from '@nestjs/common';
import { PrismaService } from '@crypto-erp/database';
import { CryptoService } from '../../auth/services/crypto.service.js';

/**
 * Base Integration Service
 * Provides common functionality for all integrations
 */
@Injectable()
export class BaseIntegrationService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly cryptoService: CryptoService,
  ) {}

  /**
   * Create or update integration
   */
  async saveIntegration(data: {
    companyId: string;
    provider: string;
    name: string;
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    metadata?: Record<string, any>;
  }) {
    // Encrypt tokens
    const encryptedAccessToken = await this.cryptoService.encrypt(data.accessToken);
    const encryptedRefreshToken = data.refreshToken
      ? await this.cryptoService.encrypt(data.refreshToken)
      : null;

    // Calculate expiration
    const expiresAt = data.expiresIn
      ? new Date(Date.now() + data.expiresIn * 1000)
      : null;

    // Upsert integration
    return this.prisma.integration.upsert({
      where: {
        companyId_provider: {
          companyId: data.companyId,
          provider: data.provider,
        },
      },
      create: {
        companyId: data.companyId,
        provider: data.provider,
        name: data.name,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        metadata: data.metadata || {},
      },
      update: {
        name: data.name,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        metadata: data.metadata || {},
        isActive: true,
      },
    });
  }

  /**
   * Get integration for company and provider
   */
  async getIntegration(companyId: string, provider: string) {
    return this.prisma.integration.findUnique({
      where: {
        companyId_provider: {
          companyId,
          provider,
        },
      },
    });
  }

  /**
   * Get decrypted access token
   */
  async getDecryptedAccessToken(integration: { accessToken: string | null }): Promise<string | null> {
    if (!integration.accessToken) {
      return null;
    }

    try {
      return await this.cryptoService.decrypt(integration.accessToken);
    } catch (error) {
      console.error('Failed to decrypt access token:', error);
      return null;
    }
  }

  /**
   * Get decrypted refresh token
   */
  async getDecryptedRefreshToken(integration: { refreshToken: string | null }): Promise<string | null> {
    if (!integration.refreshToken) {
      return null;
    }

    try {
      return await this.cryptoService.decrypt(integration.refreshToken);
    } catch (error) {
      console.error('Failed to decrypt refresh token:', error);
      return null;
    }
  }

  /**
   * Find integration by ID and company (public method for controllers)
   */
  async findIntegrationById(integrationId: string, companyId: string) {
    return this.prisma.integration.findFirst({
      where: {
        id: integrationId,
        companyId,
      },
    });
  }

  /**
   * Get integration by ID only (for internal service use)
   */
  async getIntegrationById(integrationId: string) {
    return this.prisma.integration.findUnique({
      where: { id: integrationId },
    });
  }

  /**
   * Update sync status
   */
  async updateSyncStatus(
    integrationId: string,
    status: 'success' | 'error' | 'partial',
    error?: string,
  ) {
    return this.prisma.integration.update({
      where: { id: integrationId },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: status,
        lastSyncError: error || null,
      },
    });
  }

  /**
   * List all integrations for company
   */
  async listIntegrations(companyId: string) {
    return this.prisma.integration.findMany({
      where: { companyId },
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
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Disconnect integration
   */
  async disconnectIntegration(integrationId: string, companyId: string) {
    const integration = await this.prisma.integration.findFirst({
      where: {
        id: integrationId,
        companyId,
      },
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    return this.prisma.integration.update({
      where: { id: integrationId },
      data: {
        isActive: false,
        syncEnabled: false,
      },
    });
  }

  /**
   * Delete integration
   */
  async deleteIntegration(integrationId: string, companyId: string) {
    const integration = await this.prisma.integration.findFirst({
      where: {
        id: integrationId,
        companyId,
      },
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    return this.prisma.integration.delete({
      where: { id: integrationId },
    });
  }
}
