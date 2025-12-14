import { Controller, Get, Post, Delete, Body, UseGuards, UnauthorizedException } from '@nestjs/common';
import { TwoFactorService } from './services/two-factor.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
import { Enable2FADto } from './dto/enable-2fa.dto';
import { Verify2FADto } from './dto/verify-2fa.dto';
import { Disable2FADto } from './dto/disable-2fa.dto';
import { PrismaService } from '@crypto-erp/database';
import * as bcrypt from 'bcrypt';

@Controller('auth/2fa')
@UseGuards(JwtAuthGuard)
export class TwoFactorController {
  constructor(
    private readonly twoFactorService: TwoFactorService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Generate 2FA secret and QR code
   * Step 1: User requests to enable 2FA
   */
  @Get('generate')
  async generate(@GetUser('id') userId: string) {
    const { secret, qrCode, backupCodes } = await this.twoFactorService.generateSecret(userId);

    return {
      secret,
      qrCode,
      backupCodes,
      message: 'Scan the QR code with your authenticator app and verify with a token to enable 2FA',
    };
  }

  /**
   * Enable 2FA after user verifies the token
   * Step 2: User scans QR and provides first token
   */
  @Post('enable')
  async enable(@GetUser('id') userId: string, @Body() dto: Enable2FADto) {
    await this.twoFactorService.enable2FA(userId, dto.secret, dto.token, dto.backupCodes);

    return {
      message: '2FA enabled successfully',
      backupCodes: dto.backupCodes,
    };
  }

  /**
   * Disable 2FA (requires password confirmation)
   */
  @Delete('disable')
  async disable(@GetUser('id') userId: string, @Body() dto: Disable2FADto) {
    // Verify password first
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isValidPassword = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid password');
    }

    await this.twoFactorService.disable2FA(userId);

    return {
      message: '2FA disabled successfully',
    };
  }

  /**
   * Verify a 2FA token (for testing)
   */
  @Post('verify')
  async verify(@GetUser('id') userId: string, @Body() dto: Verify2FADto) {
    const isValid = await this.twoFactorService.verifyUserToken(userId, dto.token);

    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA token');
    }

    return {
      message: 'Token verified successfully',
    };
  }

  /**
   * Get 2FA status for current user
   */
  @Get('status')
  async getStatus(@GetUser('id') userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
      },
    });

    const remainingBackupCodes = user?.twoFactorEnabled
      ? await this.twoFactorService.getRemainingBackupCodes(userId)
      : 0;

    return {
      enabled: user?.twoFactorEnabled || false,
      remainingBackupCodes,
    };
  }

  /**
   * Regenerate backup codes
   */
  @Post('backup-codes/regenerate')
  async regenerateBackupCodes(@GetUser('id') userId: string) {
    const backupCodes = await this.twoFactorService.regenerateBackupCodes(userId);

    return {
      message: 'Backup codes regenerated successfully',
      backupCodes,
    };
  }
}
