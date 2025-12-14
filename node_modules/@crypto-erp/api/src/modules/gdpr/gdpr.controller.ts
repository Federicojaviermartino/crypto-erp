import {
  Controller,
  Get,
  Delete,
  Body,
  UseGuards,
  UnauthorizedException,
  Header,
} from '@nestjs/common';
import { GDPRService } from './gdpr.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { PrismaService } from '@crypto-erp/database';
import * as bcrypt from 'bcrypt';

@Controller('gdpr')
@UseGuards(JwtAuthGuard)
export class GDPRController {
  constructor(
    private readonly gdprService: GDPRService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Export all user data (GDPR Right to Data Portability)
   */
  @Get('export')
  @Header('Content-Type', 'application/json')
  @Header('Content-Disposition', 'attachment; filename="my-data-export.json"')
  async exportMyData(@GetUser('id') userId: string) {
    const data = await this.gdprService.exportUserData(userId);

    return data;
  }

  /**
   * Check if user can delete their account
   */
  @Get('can-delete')
  async canDeleteAccount(@GetUser('id') userId: string) {
    return this.gdprService.canDeleteUser(userId);
  }

  /**
   * Delete user account (GDPR Right to be Forgotten)
   * Requires password confirmation
   */
  @Delete('delete-account')
  async deleteMyAccount(
    @GetUser('id') userId: string,
    @Body() dto: DeleteAccountDto,
  ) {
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

    // Check if user can be deleted
    const { canDelete, reasons } = await this.gdprService.canDeleteUser(userId);

    if (!canDelete) {
      throw new UnauthorizedException({
        message: 'Cannot delete account',
        reasons,
      });
    }

    // Delete the account
    await this.gdprService.deleteUserData(userId, dto.confirmation);

    return {
      message: 'Your account has been successfully deleted. All personal data has been anonymized.',
    };
  }
}
