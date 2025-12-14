-- ============================================================================
-- Crypto ERP - Database Initialization Script
-- ============================================================================
-- This script runs automatically when PostgreSQL container starts
-- It sets up required extensions and initial configuration
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search

-- Set default timezone to UTC
SET timezone = 'UTC';

-- Create custom functions

-- Function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to prevent updates on closed fiscal years
CREATE OR REPLACE FUNCTION check_fiscal_year_closed()
RETURNS TRIGGER AS $$
DECLARE
    is_closed BOOLEAN;
BEGIN
    SELECT fy.is_closed INTO is_closed
    FROM fiscal_years fy
    WHERE fy.id = NEW.fiscal_year_id;
    
    IF is_closed THEN
        RAISE EXCEPTION 'Cannot modify entries in a closed fiscal year';
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to validate journal entry balance (debits = credits)
CREATE OR REPLACE FUNCTION validate_journal_balance()
RETURNS TRIGGER AS $$
DECLARE
    total_debit DECIMAL(18, 8);
    total_credit DECIMAL(18, 8);
BEGIN
    -- Only validate when posting
    IF NEW.is_posted = TRUE AND (OLD IS NULL OR OLD.is_posted = FALSE) THEN
        SELECT 
            COALESCE(SUM(debit), 0),
            COALESCE(SUM(credit), 0)
        INTO total_debit, total_credit
        FROM journal_lines
        WHERE journal_entry_id = NEW.id;
        
        IF ABS(total_debit - total_credit) > 0.00000001 THEN
            RAISE EXCEPTION 'Journal entry is not balanced. Debits: %, Credits: %', 
                total_debit, total_credit;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function for Verifactu hash chain validation
CREATE OR REPLACE FUNCTION validate_verifactu_chain()
RETURNS TRIGGER AS $$
DECLARE
    last_hash VARCHAR(64);
BEGIN
    -- Get the last hash for this company
    SELECT verifactu_hash INTO last_hash
    FROM invoices
    WHERE company_id = NEW.company_id
      AND direction = 'ISSUED'
      AND verifactu_hash IS NOT NULL
      AND id != NEW.id
    ORDER BY issue_date DESC, number DESC
    LIMIT 1;
    
    -- If there's a previous hash, verify the chain
    IF last_hash IS NOT NULL AND NEW.verifactu_prev_hash != last_hash THEN
        RAISE EXCEPTION 'Verifactu hash chain broken. Expected previous hash: %', last_hash;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- Indexes for common queries (will be created by Prisma, but here for reference)
-- ============================================================================

-- Note: These are created by Prisma migrations, listed here for documentation

-- Accounting indexes
-- CREATE INDEX IF NOT EXISTS idx_journal_entries_company_date 
--     ON journal_entries(company_id, date);
-- CREATE INDEX IF NOT EXISTS idx_accounts_company_type 
--     ON accounts(company_id, type);

-- Invoicing indexes  
-- CREATE INDEX IF NOT EXISTS idx_invoices_company_status 
--     ON invoices(company_id, status);
-- CREATE INDEX IF NOT EXISTS idx_invoices_verifactu 
--     ON invoices(verifactu_hash) WHERE verifactu_hash IS NOT NULL;

-- Crypto indexes
-- CREATE INDEX IF NOT EXISTS idx_crypto_tx_wallet_time 
--     ON crypto_transactions(wallet_id, block_timestamp);
-- CREATE INDEX IF NOT EXISTS idx_crypto_lots_fifo 
--     ON crypto_lots(company_id, crypto_asset_id, acquired_at) 
--     WHERE remaining_amount > 0;

-- Vector similarity search index (for RAG)
-- CREATE INDEX IF NOT EXISTS idx_documents_embedding 
--     ON documents USING ivfflat (embedding vector_cosine_ops);

-- ============================================================================
-- Grants (adjust as needed for your security requirements)
-- ============================================================================

-- In production, create a limited user for the application
-- CREATE USER crypto_erp_app WITH PASSWORD 'secure_password';
-- GRANT CONNECT ON DATABASE crypto_erp TO crypto_erp_app;
-- GRANT USAGE ON SCHEMA public TO crypto_erp_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO crypto_erp_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO crypto_erp_app;

-- ============================================================================
-- Initial Configuration
-- ============================================================================

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'Crypto ERP database initialized successfully';
    RAISE NOTICE 'Extensions enabled: uuid-ossp, vector, pg_trgm';
END $$;
