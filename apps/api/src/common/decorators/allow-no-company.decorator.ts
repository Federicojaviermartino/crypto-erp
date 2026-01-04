import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to allow requests without a company ID.
 * Use this on controllers or methods that should work even when the user has no company.
 * Must be used with TenantGuard which will check for this metadata.
 */
export const ALLOW_NO_COMPANY_KEY = 'allowNoCompany';
export const AllowNoCompany = () => SetMetadata(ALLOW_NO_COMPANY_KEY, true);
