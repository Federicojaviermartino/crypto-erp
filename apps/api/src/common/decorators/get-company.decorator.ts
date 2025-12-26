import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithCompany } from './current-company.decorator.js';

/**
 * Decorator to extract current company ID from request.
 * Simplified version of CurrentCompany for controllers that just need the company ID.
 * Must be used after TenantGuard or with X-Company-Id header middleware.
 *
 * @example
 * ```typescript
 * @Get('invoices')
 * @UseGuards(JwtAuthGuard, TenantGuard)
 * getInvoices(@GetCompany() companyId: string) {
 *   return this.invoicesService.findAll(companyId);
 * }
 * ```
 */
export const GetCompany = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest<RequestWithCompany>();

    // First try to get from companyContext (set by TenantGuard)
    if (request.companyContext?.company?.id) {
      return request.companyContext.company.id;
    }

    // Fallback to X-Company-Id header
    const companyId = request.headers['x-company-id'];
    if (typeof companyId === 'string') {
      return companyId;
    }

    return null;
  },
);
