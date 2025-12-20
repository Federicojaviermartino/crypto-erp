-- Migration: Add OAuth 2.0 and API Marketplace tables
-- Created: 2025-12-20
-- Phase: 4B - API Marketplace
-- Description: Creates tables for OAuth apps, tokens, and API usage tracking

-- ============================================================================
-- OAuth Apps Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS oauth_apps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Application details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    logo_url VARCHAR(500),
    website VARCHAR(500),

    -- OAuth credentials
    client_id VARCHAR(64) NOT NULL UNIQUE,
    client_secret VARCHAR(128) NOT NULL, -- Hashed with bcrypt

    -- OAuth configuration
    redirect_uris TEXT[] NOT NULL, -- Array of allowed redirect URIs
    scopes TEXT[] NOT NULL, -- Array of allowed scopes

    -- Rate limiting & quotas
    rate_limit INT NOT NULL DEFAULT 1000, -- Requests per hour
    daily_quota INT NOT NULL DEFAULT 10000, -- Total requests per day

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_public BOOLEAN NOT NULL DEFAULT false, -- Visible in marketplace

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for oauth_apps
CREATE INDEX IF NOT EXISTS idx_oauth_apps_company_id ON oauth_apps(company_id);
CREATE INDEX IF NOT EXISTS idx_oauth_apps_client_id ON oauth_apps(client_id);
CREATE INDEX IF NOT EXISTS idx_oauth_apps_active_public ON oauth_apps(is_active, is_public);

-- ============================================================================
-- OAuth Tokens Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS oauth_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID NOT NULL REFERENCES oauth_apps(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Token data (hashed with bcrypt)
    access_token VARCHAR(128) NOT NULL UNIQUE,
    refresh_token VARCHAR(128) UNIQUE,

    -- Token metadata
    scopes TEXT[] NOT NULL, -- Granted scopes
    expires_at TIMESTAMPTZ NOT NULL, -- Access token expiration
    refresh_expires_at TIMESTAMPTZ, -- Refresh token expiration

    -- OAuth flow data
    authorization_code VARCHAR(128) UNIQUE, -- Temporary auth code
    code_expires_at TIMESTAMPTZ,

    -- Status
    is_revoked BOOLEAN NOT NULL DEFAULT false,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

-- Indexes for oauth_tokens
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_app_id ON oauth_tokens(app_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_company_id ON oauth_tokens(company_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_access_token ON oauth_tokens(access_token);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_refresh_token ON oauth_tokens(refresh_token);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_authorization_code ON oauth_tokens(authorization_code);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expires_at ON oauth_tokens(expires_at);

-- ============================================================================
-- API Usage Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID REFERENCES oauth_apps(id) ON DELETE SET NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Request details
    endpoint VARCHAR(500) NOT NULL, -- API endpoint called
    method VARCHAR(10) NOT NULL, -- HTTP method (GET, POST, etc.)
    status_code INT NOT NULL, -- HTTP status code

    -- Performance metrics
    response_time INT NOT NULL, -- Response time in milliseconds

    -- Rate limiting
    request_count INT NOT NULL DEFAULT 1, -- Aggregated count for this time bucket

    -- Metadata
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- Request timestamp
    ip_address VARCHAR(45), -- IPv4 or IPv6
    user_agent TEXT
);

-- Indexes for api_usage
CREATE INDEX IF NOT EXISTS idx_api_usage_app_timestamp ON api_usage(app_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_api_usage_company_timestamp ON api_usage(company_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint_timestamp ON api_usage(endpoint, timestamp);
CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON api_usage(timestamp);

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE oauth_apps IS 'Third-party OAuth applications registered to access the API';
COMMENT ON COLUMN oauth_apps.client_id IS 'Public client ID for OAuth flow';
COMMENT ON COLUMN oauth_apps.client_secret IS 'Hashed client secret (bcrypt)';
COMMENT ON COLUMN oauth_apps.redirect_uris IS 'Array of allowed OAuth redirect URIs';
COMMENT ON COLUMN oauth_apps.scopes IS 'Array of allowed OAuth scopes (read:invoices, write:invoices, etc.)';
COMMENT ON COLUMN oauth_apps.rate_limit IS 'API requests per hour limit';
COMMENT ON COLUMN oauth_apps.daily_quota IS 'Total API requests per day limit';
COMMENT ON COLUMN oauth_apps.is_public IS 'Whether app is visible in public marketplace';

COMMENT ON TABLE oauth_tokens IS 'OAuth access and refresh tokens for API authentication';
COMMENT ON COLUMN oauth_tokens.access_token IS 'Hashed OAuth access token (bcrypt)';
COMMENT ON COLUMN oauth_tokens.refresh_token IS 'Hashed OAuth refresh token (bcrypt)';
COMMENT ON COLUMN oauth_tokens.authorization_code IS 'Temporary authorization code for OAuth flow';
COMMENT ON COLUMN oauth_tokens.scopes IS 'Array of granted scopes for this token';

COMMENT ON TABLE api_usage IS 'API usage tracking for rate limiting and analytics';
COMMENT ON COLUMN api_usage.endpoint IS 'API endpoint path (e.g., /api/v1/invoices)';
COMMENT ON COLUMN api_usage.response_time IS 'Request response time in milliseconds';
COMMENT ON COLUMN api_usage.request_count IS 'Aggregated request count for time bucket (for pre-aggregated data)';

-- ============================================================================
-- Cleanup old tokens (optional - can be run periodically)
-- ============================================================================

-- Example: Delete expired tokens older than 30 days
-- DELETE FROM oauth_tokens
-- WHERE expires_at < NOW() - INTERVAL '30 days'
--   AND is_revoked = true;
