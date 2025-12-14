"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AuditService", {
    enumerable: true,
    get: function() {
        return AuditService;
    }
});
const _common = require("@nestjs/common");
const _database = require("../../../../../libs/database/src");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let AuditService = class AuditService {
    /**
   * Create an audit log entry
   */ async log(params) {
        try {
            await this.prisma.auditLog.create({
                data: {
                    userId: params.userId,
                    companyId: params.companyId,
                    action: params.action,
                    entity: params.entity,
                    entityId: params.entityId,
                    changes: params.changes || null,
                    metadata: params.metadata || null
                }
            });
            this.logger.log(`Audit log created: ${params.action} on ${params.entity}:${params.entityId} by user ${params.userId}`);
        } catch (error) {
            this.logger.error('Failed to create audit log:', error);
        // Don't throw - audit logging should not break the main flow
        }
    }
    /**
   * Find audit logs by entity
   */ async findByEntity(entity, entityId) {
        return this.prisma.auditLog.findMany({
            where: {
                entity,
                entityId
            },
            include: {
                user: {
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
   * Find audit logs by user
   */ async findByUser(userId, limit = 100) {
        return this.prisma.auditLog.findMany({
            where: {
                userId
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: limit
        });
    }
    /**
   * Find audit logs by company
   */ async findByCompany(companyId, options) {
        const where = {
            companyId
        };
        if (options?.entity) {
            where.entity = options.entity;
        }
        if (options?.action) {
            where.action = options.action;
        }
        return this.prisma.auditLog.findMany({
            where,
            include: {
                user: {
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
            },
            take: options?.limit || 100,
            skip: options?.offset || 0
        });
    }
    /**
   * Export all audit logs for a user (for GDPR)
   */ async exportForGDPR(userId) {
        return this.prisma.auditLog.findMany({
            where: {
                userId
            },
            orderBy: {
                createdAt: 'asc'
            }
        });
    }
    /**
   * Clean up old audit logs (optional - for retention policies)
   */ async cleanupOldLogs(olderThanDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
        const result = await this.prisma.auditLog.deleteMany({
            where: {
                createdAt: {
                    lt: cutoffDate
                }
            }
        });
        this.logger.log(`Deleted ${result.count} audit logs older than ${olderThanDays} days`);
        return result.count;
    }
    constructor(prisma){
        this.prisma = prisma;
        this.logger = new _common.Logger(AuditService.name);
    }
};
AuditService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService
    ])
], AuditService);

//# sourceMappingURL=audit.service.js.map