import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@crypto-erp/database';
import { InvitationStatus, UserRole } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Create a new team invitation
   */
  async createInvitation(
    companyId: string,
    inviterId: string,
    dto: CreateInvitationDto,
  ) {
    // Check if user already exists in the company
    const existingMember = await this.prisma.companyUser.findFirst({
      where: {
        companyId,
        user: {
          email: dto.email,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('User is already a member of this company');
    }

    // Check for existing pending invitation
    const existingInvitation = await this.prisma.companyInvitation.findUnique({
      where: {
        email_companyId: {
          email: dto.email,
          companyId,
        },
      },
    });

    if (existingInvitation && existingInvitation.status === InvitationStatus.PENDING) {
      throw new ConflictException('An invitation has already been sent to this email');
    }

    // Create invitation with 7 days expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await this.prisma.companyInvitation.create({
      data: {
        email: dto.email,
        role: dto.role,
        companyId,
        inviterId,
        expiresAt,
      },
      include: {
        company: true,
        inviter: true,
      },
    });

    // Send invitation email
    try {
      await this.notifications.sendTeamInvitation(invitation as any);
    } catch (error) {
      this.logger.error(`Failed to send invitation email to ${dto.email}:`, error);
      // Don't fail the invitation creation if email fails
    }

    this.logger.log(
      `Invitation created for ${dto.email} to company ${companyId} by user ${inviterId}`,
    );

    return invitation;
  }

  /**
   * Accept an invitation
   */
  async acceptInvitation(token: string, userId: string) {
    const invitation = await this.prisma.companyInvitation.findUnique({
      where: { token },
      include: { company: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('This invitation has already been processed');
    }

    if (invitation.expiresAt < new Date()) {
      // Mark as expired
      await this.prisma.companyInvitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new BadRequestException('This invitation has expired');
    }

    // Check if user is already a member
    const existingMember = await this.prisma.companyUser.findUnique({
      where: {
        userId_companyId: {
          userId,
          companyId: invitation.companyId,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('You are already a member of this company');
    }

    // Add user to company and mark invitation as accepted
    await this.prisma.$transaction([
      this.prisma.companyUser.create({
        data: {
          userId,
          companyId: invitation.companyId,
          role: invitation.role,
          isDefault: false,
        },
      }),
      this.prisma.companyInvitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
          acceptedBy: userId,
        },
      }),
    ]);

    this.logger.log(
      `Invitation ${invitation.id} accepted by user ${userId} for company ${invitation.companyId}`,
    );

    return {
      message: 'Invitation accepted successfully',
      company: invitation.company,
    };
  }

  /**
   * Cancel an invitation
   */
  async cancelInvitation(invitationId: string, userId: string, companyId: string) {
    const invitation = await this.prisma.companyInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.companyId !== companyId) {
      throw new ForbiddenException('You do not have access to this invitation');
    }

    // Check if user is the inviter or has admin rights
    const isInviter = invitation.inviterId === userId;
    const userRole = await this.getUserRole(userId, companyId);
    const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.OWNER;

    if (!isInviter && !isAdmin) {
      throw new ForbiddenException('You do not have permission to cancel this invitation');
    }

    await this.prisma.companyInvitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.CANCELLED },
    });

    this.logger.log(`Invitation ${invitationId} cancelled by user ${userId}`);

    return { message: 'Invitation cancelled successfully' };
  }

  /**
   * List invitations for a company
   */
  async findByCompany(companyId: string, status?: InvitationStatus) {
    const where: any = { companyId };
    if (status) {
      where.status = status;
    }

    return this.prisma.companyInvitation.findMany({
      where,
      include: {
        inviter: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get invitation by token
   */
  async findByToken(token: string) {
    const invitation = await this.prisma.companyInvitation.findUnique({
      where: { token },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            legalName: true,
          },
        },
        inviter: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // Don't return expired invitations
    if (invitation.status === InvitationStatus.EXPIRED || invitation.expiresAt < new Date()) {
      throw new BadRequestException('This invitation has expired');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('This invitation has already been processed');
    }

    return invitation;
  }

  /**
   * Get user role in company
   */
  private async getUserRole(userId: string, companyId: string): Promise<UserRole | null> {
    const companyUser = await this.prisma.companyUser.findUnique({
      where: {
        userId_companyId: {
          userId,
          companyId,
        },
      },
    });

    return companyUser?.role || null;
  }

  /**
   * Clean up expired invitations (can be run as a cron job)
   */
  async cleanupExpiredInvitations() {
    const result = await this.prisma.companyInvitation.updateMany({
      where: {
        status: InvitationStatus.PENDING,
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        status: InvitationStatus.EXPIRED,
      },
    });

    this.logger.log(`Marked ${result.count} invitations as expired`);
    return result;
  }
}
