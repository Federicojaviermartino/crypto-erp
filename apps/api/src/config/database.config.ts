/**
 * Database configuration for multi-region deployment.
 * Supports read replicas across different geographic regions.
 */

export interface DatabaseRegionConfig {
  region: string;
  writeUrl: string;
  readUrls: string[];
}

export interface DatabaseConfig {
  primary: {
    region: string;
    url: string;
  };
  replicas: Array<{
    region: string;
    url: string;
  }>;
  connectionPooling: {
    min: number;
    max: number;
    acquireTimeout: number;
    idleTimeout: number;
  };
}

/**
 * Load database configuration from environment variables.
 * Supports multiple read replicas for different regions.
 *
 * Environment variables:
 * - DATABASE_URL: Primary database (write)
 * - DATABASE_READ_REPLICA_EU: EU read replica
 * - DATABASE_READ_REPLICA_US: US read replica
 * - DATABASE_READ_REPLICA_ASIA: Asia read replica
 */
export function getDatabaseConfig(): DatabaseConfig {
  const primaryUrl = process.env['DATABASE_URL'];
  if (!primaryUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const replicas: Array<{ region: string; url: string }> = [];

  // Add EU replica if configured
  if (process.env['DATABASE_READ_REPLICA_EU']) {
    replicas.push({
      region: 'eu',
      url: process.env['DATABASE_READ_REPLICA_EU'],
    });
  }

  // Add US replica if configured
  if (process.env['DATABASE_READ_REPLICA_US']) {
    replicas.push({
      region: 'us',
      url: process.env['DATABASE_READ_REPLICA_US'],
    });
  }

  // Add Asia replica if configured
  if (process.env['DATABASE_READ_REPLICA_ASIA']) {
    replicas.push({
      region: 'asia',
      url: process.env['DATABASE_READ_REPLICA_ASIA'],
    });
  }

  return {
    primary: {
      region: process.env['DATABASE_PRIMARY_REGION'] || 'eu',
      url: primaryUrl,
    },
    replicas,
    connectionPooling: {
      min: parseInt(process.env['DATABASE_POOL_MIN'] || '2', 10),
      max: parseInt(process.env['DATABASE_POOL_MAX'] || '10', 10),
      acquireTimeout: parseInt(
        process.env['DATABASE_ACQUIRE_TIMEOUT'] || '30000',
        10,
      ),
      idleTimeout: parseInt(
        process.env['DATABASE_IDLE_TIMEOUT'] || '10000',
        10,
      ),
    },
  };
}

/**
 * Detect user's region based on request headers.
 * Falls back to primary region if detection fails.
 */
export function detectRegionFromRequest(
  headers: Record<string, string | string[] | undefined>,
): string {
  // Try CloudFront-Viewer-Country header (AWS CloudFront)
  const cloudFrontCountry = headers['cloudfront-viewer-country'];
  if (cloudFrontCountry && typeof cloudFrontCountry === 'string') {
    return mapCountryToRegion(cloudFrontCountry);
  }

  // Try CF-IPCountry header (Cloudflare)
  const cfCountry = headers['cf-ipcountry'];
  if (cfCountry && typeof cfCountry === 'string') {
    return mapCountryToRegion(cfCountry);
  }

  // Try X-AppEngine-Country header (Google Cloud)
  const gaeCountry = headers['x-appengine-country'];
  if (gaeCountry && typeof gaeCountry === 'string') {
    return mapCountryToRegion(gaeCountry);
  }

  // Default to primary region
  return process.env['DATABASE_PRIMARY_REGION'] || 'eu';
}

/**
 * Map ISO country code to database region.
 */
function mapCountryToRegion(countryCode: string): string {
  const euCountries = [
    'AT',
    'BE',
    'BG',
    'HR',
    'CY',
    'CZ',
    'DK',
    'EE',
    'FI',
    'FR',
    'DE',
    'GR',
    'HU',
    'IE',
    'IT',
    'LV',
    'LT',
    'LU',
    'MT',
    'NL',
    'PL',
    'PT',
    'RO',
    'SK',
    'SI',
    'ES',
    'SE',
    'GB',
    'CH',
    'NO',
    'IS',
  ];

  const usCountries = ['US', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE'];

  const asiaCountries = [
    'CN',
    'JP',
    'KR',
    'IN',
    'SG',
    'HK',
    'TW',
    'TH',
    'MY',
    'ID',
    'PH',
    'VN',
    'AU',
    'NZ',
  ];

  if (euCountries.includes(countryCode.toUpperCase())) {
    return 'eu';
  }

  if (usCountries.includes(countryCode.toUpperCase())) {
    return 'us';
  }

  if (asiaCountries.includes(countryCode.toUpperCase())) {
    return 'asia';
  }

  // Default to EU for unknown countries
  return 'eu';
}
