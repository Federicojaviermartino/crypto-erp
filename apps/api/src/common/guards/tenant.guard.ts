import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@crypto-erp/database';
import type { RequestWithUser } from '../decorators/current-user.decorator.js';
import type { RequestWithCompany } from '../decorators/current-company.decorator.js';
import { ALLOW_NO_COMPANY_KEY } from '../decorators/allow-no-company.decorator.js';

/**
 * Multi-tenancy guard.
  * Validates user access to the requested company.
   * If @AllowNoCompany() decorator is present and no company ID is provided,
    * the request will be allowed to proceed without company context.
     */
@Injectable()
  export class TenantGuard implements CanActivate {
    constructor(
          private prisma: PrismaService,
          private reflector: Reflector,
        ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
          const request = context
            .switchToHttp()
            .getRequest<RequestWithUser & RequestWithCompany>();

          const user = request.user;
          if (!user) {
                  throw new ForbiddenException('User not authenticated');
          }

          const companyId = this.extractCompanyId(request);

          // Check if @AllowNoCompany() decorator is present
          const allowNoCompany = this.reflector.getAllAndOverride<boolean>(
                  ALLOW_NO_COMPANY_KEY,
                  [context.getHandler(), context.getClass()],
                );

          if (!companyId) {
                  // If no company ID and @AllowNoCompany is present, allow the request
                  if (allowNoCompany) {
                            request.companyContext = null;
                            return true;
                  }
                  throw new BadRequestException(
                            'Company ID required. Use X-Company-Id header.',
                          );
          }

          const uuidRegex =
                  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(companyId)) {
                  throw new BadRequestException('Invalid company ID format');
          }

          const companyUser = await this.prisma.companyUser.findUnique({
                  where: {
                            userId_companyId: { userId: user.sub, companyId },
                  },
                  include: { company: true },
          });

          if (!companyUser) {
                  throw new ForbiddenException('Access denied to this company');
          }

          if (companyUser.company.deletedAt) {
                  throw new ForbiddenException('Company has been deleted');
          }

          request.companyContext = {
                  company: companyUser.company,
                  role: companyUser.role,
          };

          return true;
    }

    private extractCompanyId(request: RequestWithUser): string | null {
          const header = request.headers['x-company-id'];
          if (typeof header === 'string') return header;

          const params = request.params as Record<string, string>;
          if (params['companyId']) return params['companyId'];

          const query = request.query as Record<string, unknown>;
          if (typeof query['companyId'] === 'string') return query['companyId'];

          return null;
    }
}
