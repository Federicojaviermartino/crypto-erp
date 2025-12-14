import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Decorator to set required roles for a route.
 * Used with RolesGuard.
 *
 * Role hierarchy: OWNER > ADMIN > ACCOUNTANT > USER > VIEWER
 *
 * @example
 * ```typescript
 * @Post('journal-entries')
 * @Roles(UserRole.ACCOUNTANT)  // Requires ACCOUNTANT or higher
 * createEntry() {}
 *
 * @Delete('company')
 * @Roles(UserRole.OWNER)  // Only OWNER can delete
 * deleteCompany() {}
 * ```
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);