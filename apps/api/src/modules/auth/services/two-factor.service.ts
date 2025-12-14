import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@crypto-erp/database';
import { CryptoService } from './crypto.service';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

@Injectable()
export class TwoFactorService {
  constructor(
    private prisma: PrismaService,
    private cryptoService: CryptoService,
  ) {}

  /**
   * Generate 2FA secret and QR code for user
   */
  async generateSecret(userId: string): Promise<{ secret: string; qrCode: string; backupCodes: string[] }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA is already enabled for this user');
    }

    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `Crypto-ERP (${user.email})`,
      issuer: 'Crypto-ERP',
      length: 32,
    });

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    // Generate backup codes (10 codes)
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase(),
    );

    return {
      secret: secret.base32,
      qrCode,
      backupCodes,
    };
  }

  /**
   * Enable 2FA for user after verifying the first token
   */
  async enable2FA(
    userId: string,
    secret: string,
    token: string,
    backupCodes: string[],
  ): Promise<void> {
    // Verify the token first
    const isValid = this.verifyToken(secret, token);

    if (!isValid) {
      throw new BadRequestException('Invalid 2FA token. Please check your authenticator app.');
    }

    // Encrypt secret and backup codes before storing
    const encryptedSecret = await this.cryptoService.encrypt(secret);
    const encryptedBackupCodes = await this.cryptoService.encrypt(
      JSON.stringify(backupCodes),
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: encryptedSecret,
        twoFactorBackupCodes: encryptedBackupCodes,
      },
    });
  }

  /**
   * Disable 2FA for user (requires password verification in controller)
   */
  async disable2FA(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
      },
    });
  }

  /**
   * Verify a TOTP token
   */
  verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps before/after for clock drift (60 seconds)
    });
  }

  /**
   * Verify user's 2FA token (TOTP or backup code)
   */
  async verifyUserToken(userId: string, token: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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
      const backupCodes = JSON.parse(
        await this.cryptoService.decrypt(user.twoFactorBackupCodes),
      );

      if (backupCodes.includes(token)) {
        // Remove the used backup code
        const updatedCodes = backupCodes.filter((code: string) => code !== token);

        await this.prisma.user.update({
          where: { id: userId },
          data: {
            twoFactorBackupCodes: await this.cryptoService.encrypt(
              JSON.stringify(updatedCodes),
            ),
          },
        });

        return true;
      }
    }

    return false;
  }

  /**
   * Get remaining backup codes count
   */
  async getRemainingBackupCodes(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorBackupCodes) {
      return 0;
    }

    const backupCodes = JSON.parse(
      await this.cryptoService.decrypt(user.twoFactorBackupCodes),
    );

    return backupCodes.length;
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorEnabled) {
      throw new BadRequestException('2FA is not enabled for this user');
    }

    // Generate new backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase(),
    );

    const encryptedBackupCodes = await this.cryptoService.encrypt(
      JSON.stringify(backupCodes),
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorBackupCodes: encryptedBackupCodes,
      },
    });

    return backupCodes;
  }
}
