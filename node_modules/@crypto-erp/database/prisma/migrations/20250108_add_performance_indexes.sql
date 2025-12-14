-- Performance Indexes Migration
-- Added: 2025-01-08
-- Purpose: Optimize query performance for frequently accessed data

-- ============================================================================
-- USER & AUTHENTICATION INDEXES
-- ============================================================================

-- Optimize user lookups by email and active status
CREATE INDEX IF NOT EXISTS idx_users_email_active ON users(email, is_active);

-- Optimize last login tracking
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at DESC NULLS LAST);

-- ============================================================================
-- COMPANY & MULTI-TENANCY INDEXES
-- ============================================================================

-- Optimize company lookups by tax_id and country
CREATE INDEX IF NOT EXISTS idx_companies_tax_id_country ON companies(tax_id, country);

-- Optimize company user queries
CREATE INDEX IF NOT EXISTS idx_company_users_user_company ON company_users(user_id, company_id, is_default);

-- ============================================================================
-- ACCOUNTING INDEXES
-- ============================================================================

-- Optimize account lookups by company and code
CREATE INDEX IF NOT EXISTS idx_accounts_company_code ON accounts(company_id, code);

-- Optimize account type queries
CREATE INDEX IF NOT EXISTS idx_accounts_type_active ON accounts(type, is_active);

-- Optimize journal entry queries by date range
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_date ON journal_entries(company_id, entry_date DESC);

-- Optimize journal entry status queries
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON journal_entries(status, entry_date DESC);

-- Optimize journal line item queries
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry_account ON journal_line_items(journal_entry_id, account_id);

-- ============================================================================
-- INVOICING INDEXES
-- ============================================================================

-- Optimize invoice queries by company and date
CREATE INDEX IF NOT EXISTS idx_invoices_company_date ON invoices(company_id, issue_date DESC);

-- Optimize invoice status queries
CREATE INDEX IF NOT EXISTS idx_invoices_status_date ON invoices(status, issue_date DESC);

-- Optimize invoice number lookups
CREATE INDEX IF NOT EXISTS idx_invoices_company_number ON invoices(company_id, number);

-- Optimize verifactu invoice queries
CREATE INDEX IF NOT EXISTS idx_invoices_verifactu ON invoices(verifactu_status, verifactu_sent_at);

-- Optimize invoice direction queries (emitidas/recibidas)
CREATE INDEX IF NOT EXISTS idx_invoices_direction_date ON invoices(direction, issue_date DESC);

-- Optimize contact-invoice relationships
CREATE INDEX IF NOT EXISTS idx_invoices_contact ON invoices(contact_id, issue_date DESC);

-- ============================================================================
-- CONTACTS INDEXES
-- ============================================================================

-- Optimize contact lookups by tax_id
CREATE INDEX IF NOT EXISTS idx_contacts_company_tax_id ON contacts(company_id, tax_id);

-- Optimize contact type queries
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(type, is_active);

-- Full-text search on contact names (PostgreSQL)
CREATE INDEX IF NOT EXISTS idx_contacts_name_search ON contacts USING gin(to_tsvector('spanish', name));

-- ============================================================================
-- CRYPTO INDEXES
-- ============================================================================

-- Optimize wallet queries by company and blockchain
CREATE INDEX IF NOT EXISTS idx_wallets_company_blockchain ON wallets(company_id, blockchain);

-- Optimize wallet address lookups
CREATE INDEX IF NOT EXISTS idx_wallets_address ON wallets(address);

-- Optimize crypto transaction queries by date
CREATE INDEX IF NOT EXISTS idx_crypto_txs_wallet_date ON crypto_transactions(wallet_id, transaction_date DESC);

-- Optimize transaction hash lookups
CREATE INDEX IF NOT EXISTS idx_crypto_txs_hash ON crypto_transactions(transaction_hash);

-- Optimize crypto lot queries by asset
CREATE INDEX IF NOT EXISTS idx_crypto_lots_asset_remaining ON crypto_lots(crypto_asset_id, remaining_quantity DESC);

-- Optimize crypto asset queries
CREATE INDEX IF NOT EXISTS idx_crypto_assets_company_symbol ON crypto_assets(company_id, symbol);

-- ============================================================================
-- AI & DOCUMENTS INDEXES
-- ============================================================================

-- Optimize AI conversation queries
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_date ON ai_conversations(user_id, created_at DESC);

-- Optimize AI message queries
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON ai_messages(conversation_id, created_at ASC);

-- Optimize document queries by company and type
CREATE INDEX IF NOT EXISTS idx_documents_company_type ON documents(company_id, type, created_at DESC);

-- Full-text search on document content (PostgreSQL)
CREATE INDEX IF NOT EXISTS idx_documents_content_search ON documents USING gin(to_tsvector('spanish', coalesce(content, '')));

-- ============================================================================
-- AUDIT & LOGGING INDEXES
-- ============================================================================

-- Optimize audit log queries by user
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_date ON audit_logs(user_id, created_at DESC);

-- Optimize audit log queries by company
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_date ON audit_logs(company_id, created_at DESC);

-- Optimize audit log queries by entity
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity, entity_id, created_at DESC);

-- Optimize audit action queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_date ON audit_logs(action, created_at DESC);

-- ============================================================================
-- INVITATIONS INDEXES
-- ============================================================================

-- Optimize invitation token lookups
CREATE INDEX IF NOT EXISTS idx_invitations_token ON company_invitations(token) WHERE status = 'PENDING';

-- Optimize pending invitations queries
CREATE INDEX IF NOT EXISTS idx_invitations_company_pending ON company_invitations(company_id, status, expires_at);

-- ============================================================================
-- SUBSCRIPTION & PAYMENTS INDEXES
-- ============================================================================

-- Optimize subscription queries by company
CREATE INDEX IF NOT EXISTS idx_subscriptions_company_status ON subscriptions(company_id, status, current_period_end DESC);

-- Optimize subscription queries by stripe customer
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);

-- Optimize payment queries by subscription
CREATE INDEX IF NOT EXISTS idx_payments_subscription_status ON payments(subscription_id, status, paid_at DESC);

-- Optimize payment queries by stripe payment intent
CREATE INDEX IF NOT EXISTS idx_payments_stripe_intent ON payments(stripe_payment_intent_id);

-- ============================================================================
-- ONBOARDING INDEXES
-- ============================================================================

-- Optimize onboarding queries by status
CREATE INDEX IF NOT EXISTS idx_user_onboarding_status ON user_onboarding(status, last_activity_at DESC);

-- ============================================================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ============================================================================

-- Optimize dashboard invoice count queries
CREATE INDEX IF NOT EXISTS idx_invoices_company_status_date ON invoices(company_id, status, issue_date DESC);

-- Optimize fiscal year account queries
CREATE INDEX IF NOT EXISTS idx_accounts_fiscal_year ON accounts(fiscal_year_id, code);

-- Optimize crypto portfolio queries
CREATE INDEX IF NOT EXISTS idx_crypto_assets_company_classification ON crypto_assets(company_id, classification);

-- Optimize transaction type queries
CREATE INDEX IF NOT EXISTS idx_crypto_txs_type_date ON crypto_transactions(tx_type, transaction_date DESC);

-- ============================================================================
-- PARTIAL INDEXES (Conditional Indexes)
-- ============================================================================

-- Index only active users
CREATE INDEX IF NOT EXISTS idx_users_active_only ON users(email, last_login_at DESC) WHERE is_active = true;

-- Index only active accounts
CREATE INDEX IF NOT EXISTS idx_accounts_active_only ON accounts(company_id, code) WHERE is_active = true;

-- Index only pending/processing invoices
CREATE INDEX IF NOT EXISTS idx_invoices_pending ON invoices(company_id, issue_date DESC) WHERE status IN ('DRAFT', 'PENDING');

-- Index only unsent verifactu invoices
CREATE INDEX IF NOT EXISTS idx_invoices_verifactu_unsent ON invoices(company_id, created_at DESC) WHERE verifactu_status = 'PENDING';

-- Index only unprocessed crypto transactions
CREATE INDEX IF NOT EXISTS idx_crypto_txs_unprocessed ON crypto_transactions(wallet_id, transaction_date DESC) WHERE status IN ('PENDING', 'PROCESSING');

-- ============================================================================
-- ANALYZE TABLES (Update Statistics)
-- ============================================================================

ANALYZE users;
ANALYZE companies;
ANALYZE company_users;
ANALYZE accounts;
ANALYZE journal_entries;
ANALYZE journal_line_items;
ANALYZE invoices;
ANALYZE invoice_items;
ANALYZE contacts;
ANALYZE wallets;
ANALYZE crypto_transactions;
ANALYZE crypto_lots;
ANALYZE crypto_assets;
ANALYZE ai_conversations;
ANALYZE ai_messages;
ANALYZE documents;
ANALYZE audit_logs;
ANALYZE company_invitations;
ANALYZE subscriptions;
ANALYZE payments;
ANALYZE user_onboarding;
