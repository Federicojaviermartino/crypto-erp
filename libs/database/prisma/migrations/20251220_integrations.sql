-- Migration: Add Integrations table for third-party connections
-- Created: 2025-12-20
-- Phase: 4B - Advanced Integrations (Feature 4)
-- Description: Creates integrations table for QuickBooks, Xero, HubSpot, Salesforce, PayPal, Square

-- ============================================================================
-- Integrations Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Integration details
    provider VARCHAR(50) NOT NULL, -- "quickbooks", "xero", "hubspot", "salesforce", "paypal", "square"
    name VARCHAR(255) NOT NULL, -- User-friendly name

    -- OAuth credentials (encrypted with AES-256)
    access_token TEXT, -- Encrypted OAuth access token
    refresh_token TEXT, -- Encrypted OAuth refresh token
    expires_at TIMESTAMPTZ, -- Token expiration

    -- Provider-specific metadata
    realm_id VARCHAR(100), -- QuickBooks company ID
    tenant_id VARCHAR(100), -- Xero tenant ID
    instance_url VARCHAR(500), -- Salesforce instance URL
    metadata JSONB DEFAULT '{}', -- Additional provider-specific data

    -- Sync configuration
    sync_enabled BOOLEAN NOT NULL DEFAULT true,
    sync_frequency VARCHAR(20) NOT NULL DEFAULT 'hourly', -- "realtime", "hourly", "daily", "manual"
    last_sync_at TIMESTAMPTZ,
    last_sync_status VARCHAR(20), -- "success", "error", "partial"
    last_sync_error TEXT,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(company_id, provider) -- One integration per provider per company
);

-- Indexes for integrations
CREATE INDEX IF NOT EXISTS idx_integrations_company_id ON integrations(company_id);
CREATE INDEX IF NOT EXISTS idx_integrations_provider ON integrations(provider);
CREATE INDEX IF NOT EXISTS idx_integrations_sync_active ON integrations(sync_enabled, is_active);

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE integrations IS 'Third-party integrations (QuickBooks, Xero, HubSpot, Salesforce, PayPal, Square)';
COMMENT ON COLUMN integrations.provider IS 'Integration provider identifier (quickbooks, xero, hubspot, salesforce, paypal, square)';
COMMENT ON COLUMN integrations.access_token IS 'Encrypted OAuth access token (AES-256)';
COMMENT ON COLUMN integrations.refresh_token IS 'Encrypted OAuth refresh token (AES-256)';
COMMENT ON COLUMN integrations.realm_id IS 'QuickBooks company ID (realmId)';
COMMENT ON COLUMN integrations.tenant_id IS 'Xero tenant ID';
COMMENT ON COLUMN integrations.instance_url IS 'Salesforce instance URL (e.g., https://na1.salesforce.com)';
COMMENT ON COLUMN integrations.sync_frequency IS 'Sync frequency: realtime, hourly, daily, manual';
COMMENT ON COLUMN integrations.last_sync_status IS 'Last sync status: success, error, partial';

-- ============================================================================
-- Supported Providers
-- ============================================================================

-- Accounting:
-- - quickbooks: QuickBooks Online
-- - xero: Xero Accounting

-- CRM:
-- - hubspot: HubSpot CRM
-- - salesforce: Salesforce CRM

-- Payments:
-- - paypal: PayPal
-- - square: Square

-- Future:
-- - stripe: Stripe
-- - shopify: Shopify
-- - woocommerce: WooCommerce
-- - zapier: Zapier (webhooks)
