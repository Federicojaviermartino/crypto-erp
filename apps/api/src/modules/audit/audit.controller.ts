import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { GetCompany } from '../auth/decorators/get-company.decorator';
import { UserRole, AuditAction } from '@prisma/client';

@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Get audit logs for a specific entity
   * Only ADMIN, OWNER, and ACCOUNTANT can view audit logs
   */
  @Get('entity/:entity/:entityId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.ACCOUNTANT)
  async getEntityAuditLogs(
    @Param('entity') entity: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditService.findByEntity(entity, entityId);
  }

  /**
   * Get audit logs for current company
   */
  @Get('company')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.ACCOUNTANT)
  async getCompanyAuditLogs(
    @GetCompany() companyId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('entity') entity?: string,
    @Query('action') action?: AuditAction,
  ) {
    return this.auditService.findByCompany(companyId, {
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0,
      entity,
      action,
    });
  }

  /**
   * Get audit logs for current user
   */
  @Get('my-activity')
  async getMyActivity(@GetUser('id') userId: string, @Query('limit') limit?: string) {
    return this.auditService.findByUser(userId, limit ? parseInt(limit, 10) : 100);
  }
}
