import { SetMetadata } from '@nestjs/common';

export const AUDITABLE_KEY = 'audit:entity';

/**
 * Decorator to mark a route handler for automatic audit logging
 * @param entity - The entity name (e.g., 'Invoice', 'CryptoTransaction')
 */
export const Auditable = (entity: string) => SetMetadata(AUDITABLE_KEY, entity);
