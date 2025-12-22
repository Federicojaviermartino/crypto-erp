-- White-Label Branding & Partner Management Migration
-- Created: 2025-12-22
-- Phase: 4C - White-Label Branding

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE "RevenueShareModel" AS ENUM ('PERCENTAGE', 'TIERED', 'FLAT_FEE', 'HYBRID');
CREATE TYPE "PartnerStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED');
CREATE TYPE "PartnerCustomerStatus" AS ENUM ('ACTIVE', 'CHURNED', 'SUSPENDED');
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'CANCELLED');
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED');

-- ============================================================================
-- WHITE-LABEL CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS "white_label_configs" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "company_id" UUID NOT NULL UNIQUE REFERENCES "companies"("id") ON DELETE CASCADE,

    -- Branding
    "brand_name" VARCHAR(255),
    "logo_url" VARCHAR(500),
    "favicon_url" VARCHAR(500),

    -- Theme Colors
    "primary_color" VARCHAR(7),      -- #RRGGBB
    "secondary_color" VARCHAR(7),
    "accent_color" VARCHAR(7),
    "background_color" VARCHAR(7),
    "text_color" VARCHAR(7),

    -- Custom CSS
    "custom_css" TEXT,

    -- Custom Domain
    "custom_domain" VARCHAR(255) UNIQUE,
    "domain_verified" BOOLEAN DEFAULT false,

    -- Email Branding
    "email_from_name" VARCHAR(255),
    "email_reply_to" VARCHAR(255),
    "email_footer_text" TEXT,

    -- Feature Flags
    "enabled_features" TEXT[] DEFAULT '{}',

    -- Metadata
    "metadata" JSONB DEFAULT '{}',

    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX "idx_white_label_configs_custom_domain" ON "white_label_configs"("custom_domain");
CREATE INDEX "idx_white_label_configs_company_id" ON "white_label_configs"("company_id");

COMMENT ON TABLE "white_label_configs" IS 'White-label branding configuration per company';
COMMENT ON COLUMN "white_label_configs"."enabled_features" IS 'Array of enabled features: ["invoicing", "crypto", "analytics"]';

-- ============================================================================
-- PARTNERS (RESELLERS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "partners" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Partner Info
    "name" VARCHAR(255) NOT NULL,
    "legal_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "phone" VARCHAR(20),
    "website" VARCHAR(255),

    -- Tax Info
    "tax_id" VARCHAR(50),
    "address" VARCHAR(500),
    "city" VARCHAR(100),
    "country" VARCHAR(2) DEFAULT 'ES',

    -- Partnership Terms
    "commission_rate" FLOAT DEFAULT 20.0,
    "revenue_share_model" "RevenueShareModel" DEFAULT 'PERCENTAGE',
    "payment_terms" VARCHAR(100),

    -- Status
    "status" "PartnerStatus" DEFAULT 'PENDING',
    "is_active" BOOLEAN DEFAULT true,

    -- API Access
    "api_key" VARCHAR(64) UNIQUE,
    "api_key_hash" VARCHAR(128),
    "webhook_url" VARCHAR(500),

    -- Metadata
    "metadata" JSONB DEFAULT '{}',
    "notes" TEXT,

    -- Dates
    "contract_start_date" TIMESTAMPTZ,
    "contract_end_date" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX "idx_partners_email" ON "partners"("email");
CREATE INDEX "idx_partners_status" ON "partners"("status");
CREATE INDEX "idx_partners_is_active" ON "partners"("is_active");
CREATE INDEX "idx_partners_api_key" ON "partners"("api_key");

COMMENT ON TABLE "partners" IS 'Partners/Resellers in white-label program';
COMMENT ON COLUMN "partners"."commission_rate" IS 'Default commission rate (0-100)';
COMMENT ON COLUMN "partners"."api_key_hash" IS 'Hashed API key for authentication';

-- ============================================================================
-- PARTNER CUSTOMERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS "partner_customers" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "partner_id" UUID NOT NULL REFERENCES "partners"("id") ON DELETE CASCADE,
    "company_id" UUID NOT NULL UNIQUE REFERENCES "companies"("id") ON DELETE CASCADE,

    -- Custom pricing
    "custom_commission_rate" FLOAT,

    -- Status
    "status" "PartnerCustomerStatus" DEFAULT 'ACTIVE',

    -- Dates
    "activated_at" TIMESTAMPTZ,
    "deactivated_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX "idx_partner_customers_partner_id" ON "partner_customers"("partner_id");
CREATE INDEX "idx_partner_customers_company_id" ON "partner_customers"("company_id");
CREATE INDEX "idx_partner_customers_status" ON "partner_customers"("status");

COMMENT ON TABLE "partner_customers" IS 'Companies managed by partners';
COMMENT ON COLUMN "partner_customers"."custom_commission_rate" IS 'Override partner default commission rate';

-- ============================================================================
-- PARTNER COMMISSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS "partner_commissions" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "partner_id" UUID NOT NULL REFERENCES "partners"("id") ON DELETE CASCADE,
    "company_id" UUID NOT NULL,

    -- Transaction Details
    "transaction_type" VARCHAR(50) NOT NULL,
    "transaction_id" UUID,

    -- Amounts
    "base_amount" FLOAT NOT NULL,
    "commission_rate" FLOAT NOT NULL,
    "commission_amount" FLOAT NOT NULL,
    "currency" VARCHAR(3) DEFAULT 'EUR',

    -- Status
    "status" "CommissionStatus" DEFAULT 'PENDING',

    -- Payout tracking
    "payout_id" UUID,
    "paid_at" TIMESTAMPTZ,

    -- Period
    "period_start" TIMESTAMPTZ NOT NULL,
    "period_end" TIMESTAMPTZ NOT NULL,

    -- Dates
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX "idx_partner_commissions_partner_id" ON "partner_commissions"("partner_id");
CREATE INDEX "idx_partner_commissions_company_id" ON "partner_commissions"("company_id");
CREATE INDEX "idx_partner_commissions_status" ON "partner_commissions"("status");
CREATE INDEX "idx_partner_commissions_period" ON "partner_commissions"("period_start", "period_end");
CREATE INDEX "idx_partner_commissions_payout_id" ON "partner_commissions"("payout_id");

COMMENT ON TABLE "partner_commissions" IS 'Commission tracking for partner revenue share';
COMMENT ON COLUMN "partner_commissions"."transaction_type" IS 'Type: subscription, invoice, addon';

-- ============================================================================
-- PARTNER PAYOUTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS "partner_payouts" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "partner_id" UUID NOT NULL REFERENCES "partners"("id") ON DELETE CASCADE,

    -- Payout Details
    "amount" FLOAT NOT NULL,
    "currency" VARCHAR(3) DEFAULT 'EUR',

    -- Period covered
    "period_start" TIMESTAMPTZ NOT NULL,
    "period_end" TIMESTAMPTZ NOT NULL,

    -- Payment Details
    "payment_method" VARCHAR(50),
    "payment_reference" VARCHAR(100),

    -- Status
    "status" "PayoutStatus" DEFAULT 'PENDING',

    -- Dates
    "scheduled_at" TIMESTAMPTZ,
    "paid_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX "idx_partner_payouts_partner_id" ON "partner_payouts"("partner_id");
CREATE INDEX "idx_partner_payouts_status" ON "partner_payouts"("status");
CREATE INDEX "idx_partner_payouts_period" ON "partner_payouts"("period_start", "period_end");

COMMENT ON TABLE "partner_payouts" IS 'Payouts to partners for their commissions';

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Add payout_id foreign key to partner_commissions
ALTER TABLE "partner_commissions"
    ADD CONSTRAINT "fk_partner_commissions_payout"
    FOREIGN KEY ("payout_id") REFERENCES "partner_payouts"("id")
    ON DELETE SET NULL;

-- ============================================================================
-- UPDATE TRIGGER FOR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all white-label tables
CREATE TRIGGER update_white_label_configs_updated_at BEFORE UPDATE ON "white_label_configs"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON "partners"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_customers_updated_at BEFORE UPDATE ON "partner_customers"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_commissions_updated_at BEFORE UPDATE ON "partner_commissions"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_payouts_updated_at BEFORE UPDATE ON "partner_payouts"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DEFAULT DATA
-- ============================================================================

-- Example: Create a default white-label config for existing companies
-- (This is optional and can be run separately)
-- INSERT INTO "white_label_configs" ("company_id", "enabled_features")
-- SELECT "id", ARRAY['invoicing', 'crypto', 'analytics']::TEXT[]
-- FROM "companies"
-- WHERE NOT EXISTS (
--     SELECT 1 FROM "white_label_configs" WHERE "company_id" = "companies"."id"
-- );

COMMENT ON SCHEMA public IS 'White-Label & Partner Management - Phase 4C Complete';
