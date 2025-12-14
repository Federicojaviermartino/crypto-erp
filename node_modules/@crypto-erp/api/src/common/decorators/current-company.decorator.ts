import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import type { Company, UserRole } from '@prisma/client';

/**
 * Company context attached to request by TenantGuard
 */
export interface CompanyContext {
  company: Company;
  role: UserRole;
}

/**
 * Extended request with company context
 */
export interface RequestWithCompany extends Request {
  companyContext: CompanyContext;
}

/**
 * Decorator to extract current company from request.
 * Must be used after TenantGuard.
 *
 * @example
 * ```typescript
 * @Get('accounts')
 * @UseGuards(JwtAuthGuard, TenantGuard)
 * getAccounts(@CurrentCompany() ctx: CompanyContext) {
 *   return this.accountsService.findAll(ctx.company.id);
 * }
 *
 * // Get only company ID
 * @Get('accounts')
 * @UseGuards(JwtAuthGuard, TenantGuard)
 * getAccounts(@CurrentCompany('companyId') companyId: string) {
 *   return this.accountsService.findAll(companyId);
 * }
 * ```
 */
export const CurrentCompany = createParamDecorator(
  (
    data: 'company' | 'role' | 'companyId' | undefined,
    ctx: ExecutionContext,
  ) => {
    const request = ctx.switchToHttp().getRequest<RequestWithCompany>();
    const companyContext = request.companyContext;

    if (!companyContext) {
      return null;
    }

    switch (data) {
      case 'company':
        return companyContext.company;
      case 'role':
        return companyContext.role;
      case 'companyId':
        return companyContext.company.id;
      default:
        return companyContext;
    }
  },
);