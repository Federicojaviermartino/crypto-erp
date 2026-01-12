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
 * By default returns the company ID (string).
 * Use 'company' to get the full Company object.
 * Use 'role' to get the user's role in this company.
 * Use 'context' to get the full CompanyContext.
 *
 * @example
 * ```typescript
 * // Get company ID (default)
 * @Get('accounts')
 * @UseGuards(JwtAuthGuard, TenantGuard)
 * getAccounts(@CurrentCompany() companyId: string) {
 *   return this.accountsService.findAll(companyId);
 * }
 *
 * // Get full company object
 * @Get('accounts')
 * @UseGuards(JwtAuthGuard, TenantGuard)
 * getAccounts(@CurrentCompany('company') company: Company) {
 *   return this.accountsService.findAll(company.id);
 * }
 *
 * // Get full context (company + role)
 * @Get('accounts')
 * @UseGuards(JwtAuthGuard, TenantGuard)
 * getAccounts(@CurrentCompany('context') ctx: CompanyContext) {
 *   return this.accountsService.findAll(ctx.company.id);
 * }
 * ```
 */
export const CurrentCompany = createParamDecorator(
  (
    data: 'company' | 'role' | 'companyId' | 'context' | undefined,
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
      case 'context':
        return companyContext;
      case 'companyId':
      default:
        // Default to returning just the company ID
        return companyContext.company.id;
    }
  },
);