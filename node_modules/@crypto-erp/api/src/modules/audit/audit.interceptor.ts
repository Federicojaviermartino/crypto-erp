import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { AuditAction } from '@prisma/client';
import { AUDITABLE_KEY } from './decorators/auditable.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private reflector: Reflector,
    private audit: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const entity = this.reflector.get<string>(AUDITABLE_KEY, context.getHandler());

    if (!entity) {
      // No @Auditable decorator, skip audit logging
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const { user, body, method, ip, headers } = request;

    // If no user (unauthenticated request), skip
    if (!user) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: async (result) => {
          try {
            const action = this.getActionFromMethod(method);
            const entityId = this.extractEntityId(result, body, request);

            if (action && entityId) {
              await this.audit.log({
                userId: user.id,
                companyId: request.companyId || user.defaultCompanyId,
                action,
                entity,
                entityId,
                changes: this.getChanges(method, body, result),
                metadata: {
                  ip,
                  userAgent: headers['user-agent'],
                  method,
                  path: request.url,
                },
              });
            }
          } catch (error) {
            this.logger.error('Failed to create audit log:', error);
            // Don't throw - audit should not break the main flow
          }
        },
        error: (error) => {
          // Could log failed operations here if needed
          this.logger.warn(`Operation failed, not logging audit: ${error.message}`);
        },
      }),
    );
  }

  /**
   * Map HTTP method to audit action
   */
  private getActionFromMethod(method: string): AuditAction | null {
    const mapping: Record<string, AuditAction> = {
      POST: AuditAction.CREATE,
      PATCH: AuditAction.UPDATE,
      PUT: AuditAction.UPDATE,
      DELETE: AuditAction.DELETE,
      GET: AuditAction.VIEW,
    };

    return mapping[method] || null;
  }

  /**
   * Extract entity ID from response or request
   */
  private extractEntityId(result: any, body: any, request: any): string | null {
    // Try to get ID from response
    if (result?.id) {
      return result.id;
    }

    // Try to get ID from request body
    if (body?.id) {
      return body.id;
    }

    // Try to get ID from URL params
    if (request.params?.id) {
      return request.params.id;
    }

    return null;
  }

  /**
   * Get changes for UPDATE operations
   */
  private getChanges(method: string, body: any, result: any): any | null {
    if (method === 'PATCH' || method === 'PUT') {
      return {
        updated: body,
        // Could include before/after comparison here if available
      };
    }

    if (method === 'DELETE') {
      return {
        deleted: true,
      };
    }

    return null;
  }
}
