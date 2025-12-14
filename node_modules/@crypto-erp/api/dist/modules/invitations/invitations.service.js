"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "InvitationsService", {
    enumerable: true,
    get: function() {
        return InvitationsService;
    }
});
const _common = require("@nestjs/common");
const _database = require("../../../../../libs/database/src");
const _client = require("@prisma/client");
const _notificationsservice = require("../notifications/notifications.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let InvitationsService = class InvitationsService {
    /**
   * Create a new team invitation
   */ async createInvitation(companyId, inviterId, dto) {
        // Check if user already exists in the company
        const existingMember = await this.prisma.companyUser.findFirst({
            where: {
                companyId,
                user: {
                    email: dto.email
                }
            }
        });
        if (existingMember) {
            throw new _common.ConflictException('User is already a member of this company');
        }
        // Check for existing pending invitation
        const existingInvitation = await this.prisma.companyInvitation.findUnique({
            where: {
                email_companyId: {
                    email: dto.email,
                    companyId
                }
            }
        });
        if (existingInvitation && existingInvitation.status === _client.InvitationStatus.PENDING) {
            throw new _common.ConflictException('An invitation has already been sent to this email');
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
                expiresAt
            },
            include: {
                company: true,
                inviter: true
            }
        });
        // Send invitation email
        try {
            await this.notifications.sendTeamInvitation(invitation);
        } catch (error) {
            this.logger.error(`Failed to send invitation email to ${dto.email}:`, error);
        // Don't fail the invitation creation if email fails
        }
        this.logger.log(`Invitation created for ${dto.email} to company ${companyId} by user ${inviterId}`);
        return invitation;
    }
    /**
   * Accept an invitation
   */ async acceptInvitation(token, userId) {
        const invitation = await this.prisma.companyInvitation.findUnique({
            where: {
                token
            },
            include: {
                company: true
            }
        });
        if (!invitation) {
            throw new _common.NotFoundException('Invitation not found');
        }
        if (invitation.status !== _client.InvitationStatus.PENDING) {
            throw new _common.BadRequestException('This invitation has already been processed');
        }
        if (invitation.expiresAt < new Date()) {
            // Mark as expired
            await this.prisma.companyInvitation.update({
                where: {
                    id: invitation.id
                },
                data: {
                    status: _client.InvitationStatus.EXPIRED
                }
            });
            throw new _common.BadRequestException('This invitation has expired');
        }
        // Check if user is already a member
        const existingMember = await this.prisma.companyUser.findUnique({
            where: {
                userId_companyId: {
                    userId,
                    companyId: invitation.companyId
                }
            }
        });
        if (existingMember) {
            throw new _common.ConflictException('You are already a member of this company');
        }
        // Add user to company and mark invitation as accepted
        await this.prisma.$transaction([
            this.prisma.companyUser.create({
                data: {
                    userId,
                    companyId: invitation.companyId,
                    role: invitation.role,
                    isDefault: false
                }
            }),
            this.prisma.companyInvitation.update({
                where: {
                    id: invitation.id
                },
                data: {
                    status: _client.InvitationStatus.ACCEPTED,
                    acceptedAt: new Date(),
                    acceptedBy: userId
                }
            })
        ]);
        this.logger.log(`Invitation ${invitation.id} accepted by user ${userId} for company ${invitation.companyId}`);
        return {
            message: 'Invitation accepted successfully',
            company: invitation.company
        };
    }
    /**
   * Cancel an invitation
   */ async cancelInvitation(invitationId, userId, companyId) {
        const invitation = await this.prisma.companyInvitation.findUnique({
            where: {
                id: invitationId
            }
        });
        if (!invitation) {
            throw new _common.NotFoundException('Invitation not found');
        }
        if (invitation.companyId !== companyId) {
            throw new _common.ForbiddenException('You do not have access to this invitation');
        }
        // Check if user is the inviter or has admin rights
        const isInviter = invitation.inviterId === userId;
        const userRole = await this.getUserRole(userId, companyId);
        const isAdmin = userRole === _client.UserRole.ADMIN || userRole === _client.UserRole.OWNER;
        if (!isInviter && !isAdmin) {
            throw new _common.ForbiddenException('You do not have permission to cancel this invitation');
        }
        await this.prisma.companyInvitation.update({
            where: {
                id: invitationId
            },
            data: {
                status: _client.InvitationStatus.CANCELLED
            }
        });
        this.logger.log(`Invitation ${invitationId} cancelled by user ${userId}`);
        return {
            message: 'Invitation cancelled successfully'
        };
    }
    /**
   * List invitations for a company
   */ async findByCompany(companyId, status) {
        const where = {
            companyId
        };
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
                        lastName: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    }
    /**
   * Get invitation by token
   */ async findByToken(token) {
        const invitation = await this.prisma.companyInvitation.findUnique({
            where: {
                token
            },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                        legalName: true
                    }
                },
                inviter: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });
        if (!invitation) {
            throw new _common.NotFoundException('Invitation not found');
        }
        // Don't return expired invitations
        if (invitation.status === _client.InvitationStatus.EXPIRED || invitation.expiresAt < new Date()) {
            throw new _common.BadRequestException('This invitation has expired');
        }
        if (invitation.status !== _client.InvitationStatus.PENDING) {
            throw new _common.BadRequestException('This invitation has already been processed');
        }
        return invitation;
    }
    /**
   * Get user role in company
   */ async getUserRole(userId, companyId) {
        const companyUser = await this.prisma.companyUser.findUnique({
            where: {
                userId_companyId: {
                    userId,
                    companyId
                }
            }
        });
        return companyUser?.role || null;
    }
    /**
   * Clean up expired invitations (can be run as a cron job)
   */ async cleanupExpiredInvitations() {
        const result = await this.prisma.companyInvitation.updateMany({
            where: {
                status: _client.InvitationStatus.PENDING,
                expiresAt: {
                    lt: new Date()
                }
            },
            data: {
                status: _client.InvitationStatus.EXPIRED
            }
        });
        this.logger.log(`Marked ${result.count} invitations as expired`);
        return result;
    }
    constructor(prisma, notifications){
        this.prisma = prisma;
        this.notifications = notifications;
        this.logger = new _common.Logger(InvitationsService.name);
    }
};
InvitationsService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService,
        typeof _notificationsservice.NotificationsService === "undefined" ? Object : _notificationsservice.NotificationsService
    ])
], InvitationsService);

//# sourceMappingURL=invitations.service.js.map