import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@crypto-erp/database';
import { AuditAction, AuditLog } from '@prisma/client';

export interface AuditLogParams {
  userId: string;
  companyId?: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  changes?: any;
  metadata?: any;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create an audit log entry
   */
  async log(params: AuditLogParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: params.userId,
          companyId: params.companyId,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          changes: params.changes || null,
          metadata: params.metadata || null,
        },
      });

      this.logger.log(
        `Audit log created: ${params.action} on ${params.entity}:${params.entityId} by user ${params.userId}`,
      );
    } catch (error) {
      this.logger.error('Failed to create audit log:', error);
      // Don't throw - audit logging should not break the main flow
    }
  }

  /**
   * Find audit logs by entity
   */
  async findByEntity(entity: string, entityId: string): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: {
        entity,
        entityId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Find audit logs by user
   */
  async findByUser(userId: string, limit: number = 100): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Find audit logs by company
   */
  async findByCompany(
    companyId: string,
    options?: {
      limit?: number;
      offset?: number;
      entity?: string;
      action?: AuditAction;
    },
  ): Promise<AuditLog[]> {
    const where: any = { companyId };

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
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: options?.limit || 100,
      skip: options?.offset || 0,
    });
  }

  /**
   * Export all audit logs for a user (for GDPR)
   */
  async exportForGDPR(userId: string): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /**
   * Clean up old audit logs (optional - for retention policies)
   */
  async cleanupOldLogs(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(`Deleted ${result.count} audit logs older than ${olderThanDays} days`);

    return result.count;
  }
}
