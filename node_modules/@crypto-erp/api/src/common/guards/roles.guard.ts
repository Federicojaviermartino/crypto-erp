import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import type { RequestWithCompany } from '../decorators/current-company.decorator.js';

/**
 * Role hierarchy - higher index = more permissions
 */
const ROLE_HIERARCHY: UserRole[] = [
  UserRole.VIEWER,
  UserRole.USER,
  UserRole.ACCOUNTANT,
  UserRole.ADMIN,
  UserRole.OWNER,
];

/**
 * Roles guard with hierarchy support.
 * Must be used after TenantGuard.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithCompany>();
    const companyContext = request.companyContext;

    if (!companyContext) {
      return false;
    }

    const userRoleIndex = ROLE_HIERARCHY.indexOf(companyContext.role);

    // Check if user has any of the required roles or higher
    return requiredRoles.some((requiredRole) => {
      const requiredRoleIndex = ROLE_HIERARCHY.indexOf(requiredRole);
      return userRoleIndex >= requiredRoleIndex;
    });
  }
}