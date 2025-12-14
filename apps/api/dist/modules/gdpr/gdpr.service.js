"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "GDPRService", {
    enumerable: true,
    get: function() {
        return GDPRService;
    }
});
const _common = require("@nestjs/common");
const _database = require("../../../../../libs/database/src");
const _auditservice = require("../audit/audit.service");
const _client = require("@prisma/client");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let GDPRService = class GDPRService {
    /**
   * Export all user data for GDPR compliance
   */ async exportUserData(userId) {
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            },
            include: {
                companyUsers: {
                    include: {
                        company: true
                    }
                }
            }
        });
        if (!user) {
            throw new _common.BadRequestException('User not found');
        }
        // Get company IDs where user is a member
        const companyIds = user.companyUsers.map((cu)=>cu.companyId);
        // Collect all user data across related entities
        const [invoices, contacts, cryptoTransactions, wallets, auditLogs] = await Promise.all([
            // Invoices from user's companies
            this.prisma.invoice.findMany({
                where: {
                    companyId: {
                        in: companyIds
                    }
                }
            }),
            // Contacts from user's companies
            this.prisma.contact.findMany({
                where: {
                    companyId: {
                        in: companyIds
                    }
                }
            }),
            // Crypto transactions from user's companies
            this.prisma.cryptoTransaction.findMany({
                where: {
                    wallet: {
                        companyId: {
                            in: companyIds
                        }
                    }
                }
            }),
            // Wallets from user's companies
            this.prisma.wallet.findMany({
                where: {
                    companyId: {
                        in: companyIds
                    }
                }
            }),
            // User's audit logs
            this.audit.exportForGDPR(userId)
        ]);
        const exportData = {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                createdAt: user.createdAt
            },
            companies: user.companyUsers.map((cu)=>({
                    id: cu.company.id,
                    name: cu.company.name,
                    role: cu.role
                })),
            data: {
                invoices,
                contacts,
                cryptoTransactions,
                wallets,
                auditLogs
            },
            exportedAt: new Date(),
            format: 'JSON'
        };
        // Log the export action
        await this.audit.log({
            userId,
            action: _client.AuditAction.EXPORT,
            entity: 'User',
            entityId: userId,
            metadata: {
                gdprExport: true,
                exportSize: JSON.stringify(exportData).length
            }
        });
        this.logger.log(`GDPR data export completed for user ${userId}`);
        return exportData;
    }
    /**
   * Delete user data (anonymization for data integrity)
   */ async deleteUserData(userId, confirmation) {
        if (confirmation !== 'DELETE MY DATA') {
            throw new _common.BadRequestException('Invalid confirmation text');
        }
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            },
            include: {
                companyUsers: true
            }
        });
        if (!user) {
            throw new _common.BadRequestException('User not found');
        }
        // Check if user is OWNER of any company
        const ownedCompanies = user.companyUsers.filter((cu)=>cu.role === _client.UserRole.OWNER);
        if (ownedCompanies.length > 0) {
            throw new _common.BadRequestException('Cannot delete account while you own companies. Please transfer ownership first or delete the companies.');
        }
        // Log the deletion before anonymizing
        await this.audit.log({
            userId,
            action: _client.AuditAction.DELETE,
            entity: 'User',
            entityId: userId,
            metadata: {
                gdprDeletion: true,
                companiesRemoved: user.companyUsers.length
            }
        });
        // Anonymize user data instead of hard delete (for referential integrity)
        await this.prisma.$transaction([
            // Anonymize user
            this.prisma.user.update({
                where: {
                    id: userId
                },
                data: {
                    email: `deleted-${userId}@anonymized.local`,
                    firstName: 'Deleted',
                    lastName: 'User',
                    passwordHash: 'DELETED',
                    avatarUrl: null,
                    isActive: false,
                    twoFactorEnabled: false,
                    twoFactorSecret: null,
                    twoFactorBackupCodes: null
                }
            }),
            // Remove user from all companies
            this.prisma.companyUser.deleteMany({
                where: {
                    userId
                }
            }),
            // Cancel pending invitations sent by this user
            this.prisma.companyInvitation.updateMany({
                where: {
                    inviterId: userId,
                    status: 'PENDING'
                },
                data: {
                    status: 'CANCELLED'
                }
            })
        ]);
        this.logger.log(`GDPR account deletion completed for user ${userId}`);
    }
    /**
   * Check if user can be deleted
   */ async canDeleteUser(userId) {
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            },
            include: {
                companyUsers: {
                    include: {
                        company: true
                    }
                }
            }
        });
        if (!user) {
            return {
                canDelete: false,
                reasons: [
                    'User not found'
                ]
            };
        }
        const reasons = [];
        // Check for owned companies
        const ownedCompanies = user.companyUsers.filter((cu)=>cu.role === _client.UserRole.OWNER);
        if (ownedCompanies.length > 0) {
            reasons.push(`You are the owner of ${ownedCompanies.length} company/companies: ${ownedCompanies.map((cu)=>cu.company.name).join(', ')}`);
        }
        return {
            canDelete: reasons.length === 0,
            reasons
        };
    }
    constructor(prisma, audit){
        this.prisma = prisma;
        this.audit = audit;
        this.logger = new _common.Logger(GDPRService.name);
    }
};
GDPRService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService,
        typeof _auditservice.AuditService === "undefined" ? Object : _auditservice.AuditService
    ])
], GDPRService);

//# sourceMappingURL=gdpr.service.js.map