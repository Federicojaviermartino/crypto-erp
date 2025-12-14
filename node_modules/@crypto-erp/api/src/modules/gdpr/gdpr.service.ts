import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@crypto-erp/database';
import { AuditService } from '../audit/audit.service';
import { AuditAction, UserRole } from '@prisma/client';

export interface GDPRExportData {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    createdAt: Date;
  };
  companies: Array<{
    id: string;
    name: string;
    role: UserRole;
  }>;
  data: {
    invoices: any[];
    contacts: any[];
    cryptoTransactions: any[];
    wallets: any[];
    auditLogs: any[];
  };
  exportedAt: Date;
  format: string;
}

@Injectable()
export class GDPRService {
  private readonly logger = new Logger(GDPRService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /**
   * Export all user data for GDPR compliance
   */
  async exportUserData(userId: string): Promise<GDPRExportData> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        companyUsers: {
          include: {
            company: true,
          },
        },
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Get company IDs where user is a member
    const companyIds = user.companyUsers.map((cu) => cu.companyId);

    // Collect all user data across related entities
    const [
      invoices,
      contacts,
      cryptoTransactions,
      wallets,
      auditLogs,
    ] = await Promise.all([
      // Invoices from user's companies
      this.prisma.invoice.findMany({
        where: { companyId: { in: companyIds } },
      }),
      // Contacts from user's companies
      this.prisma.contact.findMany({
        where: { companyId: { in: companyIds } },
      }),
      // Crypto transactions from user's companies
      this.prisma.cryptoTransaction.findMany({
        where: {
          wallet: {
            companyId: { in: companyIds },
          },
        },
      }),
      // Wallets from user's companies
      this.prisma.wallet.findMany({
        where: { companyId: { in: companyIds } },
      }),
      // User's audit logs
      this.audit.exportForGDPR(userId),
    ]);

    const exportData: GDPRExportData = {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
      },
      companies: user.companyUsers.map((cu) => ({
        id: cu.company.id,
        name: cu.company.name,
        role: cu.role,
      })),
      data: {
        invoices,
        contacts,
        cryptoTransactions,
        wallets,
        auditLogs,
      },
      exportedAt: new Date(),
      format: 'JSON',
    };

    // Log the export action
    await this.audit.log({
      userId,
      action: AuditAction.EXPORT,
      entity: 'User',
      entityId: userId,
      metadata: {
        gdprExport: true,
        exportSize: JSON.stringify(exportData).length,
      },
    });

    this.logger.log(`GDPR data export completed for user ${userId}`);

    return exportData;
  }

  /**
   * Delete user data (anonymization for data integrity)
   */
  async deleteUserData(userId: string, confirmation: string): Promise<void> {
    if (confirmation !== 'DELETE MY DATA') {
      throw new BadRequestException('Invalid confirmation text');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        companyUsers: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check if user is OWNER of any company
    const ownedCompanies = user.companyUsers.filter(
      (cu) => cu.role === UserRole.OWNER,
    );

    if (ownedCompanies.length > 0) {
      throw new BadRequestException(
        'Cannot delete account while you own companies. Please transfer ownership first or delete the companies.',
      );
    }

    // Log the deletion before anonymizing
    await this.audit.log({
      userId,
      action: AuditAction.DELETE,
      entity: 'User',
      entityId: userId,
      metadata: {
        gdprDeletion: true,
        companiesRemoved: user.companyUsers.length,
      },
    });

    // Anonymize user data instead of hard delete (for referential integrity)
    await this.prisma.$transaction([
      // Anonymize user
      this.prisma.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${userId}@anonymized.local`,
          firstName: 'Deleted',
          lastName: 'User',
          passwordHash: 'DELETED',
          avatarUrl: null,
          isActive: false,
          twoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorBackupCodes: null,
        },
      }),
      // Remove user from all companies
      this.prisma.companyUser.deleteMany({
        where: { userId },
      }),
      // Cancel pending invitations sent by this user
      this.prisma.companyInvitation.updateMany({
        where: {
          inviterId: userId,
          status: 'PENDING',
        },
        data: {
          status: 'CANCELLED',
        },
      }),
    ]);

    this.logger.log(`GDPR account deletion completed for user ${userId}`);
  }

  /**
   * Check if user can be deleted
   */
  async canDeleteUser(userId: string): Promise<{
    canDelete: boolean;
    reasons: string[];
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        companyUsers: {
          include: {
            company: true,
          },
        },
      },
    });

    if (!user) {
      return { canDelete: false, reasons: ['User not found'] };
    }

    const reasons: string[] = [];

    // Check for owned companies
    const ownedCompanies = user.companyUsers.filter(
      (cu) => cu.role === UserRole.OWNER,
    );

    if (ownedCompanies.length > 0) {
      reasons.push(
        `You are the owner of ${ownedCompanies.length} company/companies: ${ownedCompanies.map((cu) => cu.company.name).join(', ')}`,
      );
    }

    return {
      canDelete: reasons.length === 0,
      reasons,
    };
  }
}
