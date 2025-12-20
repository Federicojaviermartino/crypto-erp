-- Migration: Add region field to Company table for multi-region support
-- Created: 2025-12-20
-- Description: Adds a region column to track which geographic region a company's data resides in

-- Add region column to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS region VARCHAR(10) DEFAULT 'eu';

-- Add comment to document the field
COMMENT ON COLUMN companies.region IS 'Database region where company data resides (eu, us, asia)';

-- Create index for region-based queries
CREATE INDEX IF NOT EXISTS idx_companies_region ON companies(region);

-- Update existing companies to have region based on country
-- EU countries
UPDATE companies
SET region = 'eu'
WHERE country IN ('AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
                   'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
                   'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB', 'CH', 'NO', 'IS')
  AND region = 'eu'; -- Only update if still default

-- US and Americas countries
UPDATE companies
SET region = 'us'
WHERE country IN ('US', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE')
  AND region = 'eu'; -- Only update if still default

-- Asia/Pacific countries
UPDATE companies
SET region = 'asia'
WHERE country IN ('CN', 'JP', 'KR', 'IN', 'SG', 'HK', 'TW', 'TH', 'MY',
                   'ID', 'PH', 'VN', 'AU', 'NZ')
  AND region = 'eu'; -- Only update if still default

-- All others default to 'eu'
