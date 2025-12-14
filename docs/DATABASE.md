# Database Documentation

## Overview

This document describes the database schema and design decisions for the Crypto ERP system.

---

## Technology Stack

- **Database**: PostgreSQL 15+
- **ORM**: Prisma 5.x
- **Extensions**: 
  - `pgvector` for AI embeddings
  - `uuid-ossp` for UUID generation

---

## Complete Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pgvector(map: "vector"), uuidOssp(map: "uuid-ossp")]
}

// ============================================================================
// CORE ENTITIES
// ============================================================================

model User {
  id            String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  email         String    @unique
  passwordHash  String    @map("password_hash")
  firstName     String    @map("first_name")
  lastName      String    @map("last_name")
  isActive      Boolean   @default(true) @map("is_active")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  
  // Relations
  companyUsers  CompanyUser[]
  
  @@map("users")
}

model Company {
  id              String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  name            String
  legalName       String?   @map("legal_name")
  taxId           String    @map("tax_id")  // CIF/NIF
  taxIdType       TaxIdType @default(CIF) @map("tax_id_type")
  address         String?
  city            String?
  postalCode      String?   @map("postal_code")
  country         String    @default("ES")
  currency        String    @default("EUR")
  
  // Verifactu
  verifactuEnabled  Boolean   @default(false) @map("verifactu_enabled")
  verifactuId       String?   @map("verifactu_id")
  
  // Settings
  defaultCryptoClassification CryptoClassification @default(INVENTORY) @map("default_crypto_classification")
  
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  
  // Relations
  companyUsers    CompanyUser[]
  fiscalYears     FiscalYear[]
  accounts        Account[]
  journalEntries  JournalEntry[]
  invoices        Invoice[]
  invoiceSeries   InvoiceSeries[]
  wallets         Wallet[]
  cryptoAssets    CryptoAsset[]
  cryptoLots      CryptoLot[]
  aiConversations AiConversation[]
  documents       Document[]
  
  @@map("companies")
}

model CompanyUser {
  id        String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  companyId String   @map("company_id") @db.Uuid
  role      UserRole @default(USER)
  createdAt DateTime @default(now()) @map("created_at")
  
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  @@unique([userId, companyId])
  @@map("company_users")
}

// ============================================================================
// ACCOUNTING ENTITIES
// ============================================================================

model FiscalYear {
  id          String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  companyId   String    @map("company_id") @db.Uuid
  name        String    // "2024", "2025"
  startDate   DateTime  @map("start_date") @db.Date
  endDate     DateTime  @map("end_date") @db.Date
  isClosed    Boolean   @default(false) @map("is_closed")
  closedAt    DateTime? @map("closed_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  
  company        Company        @relation(fields: [companyId], references: [id], onDelete: Cascade)
  journalEntries JournalEntry[]
  
  @@unique([companyId, name])
  @@map("fiscal_years")
}

model Account {
  id          String      @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  companyId   String      @map("company_id") @db.Uuid
  code        String      // "430", "572001", "305001"
  name        String      // "Customers", "Bank Santander", "Bitcoin"
  type        AccountType
  parentCode  String?     @map("parent_code")  // For hierarchy: "43" is parent of "430"
  
  // Crypto-specific
  isCrypto    Boolean     @default(false) @map("is_crypto")
  cryptoAssetId String?   @map("crypto_asset_id") @db.Uuid
  
  isActive    Boolean     @default(true) @map("is_active")
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")
  
  company      Company       @relation(fields: [companyId], references: [id], onDelete: Cascade)
  cryptoAsset  CryptoAsset?  @relation(fields: [cryptoAssetId], references: [id])
  journalLines JournalLine[]
  
  @@unique([companyId, code])
  @@index([companyId, type])
  @@map("accounts")
}

model JournalEntry {
  id            String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  companyId     String    @map("company_id") @db.Uuid
  fiscalYearId  String    @map("fiscal_year_id") @db.Uuid
  number        Int       // Sequential number within fiscal year
  date          DateTime  @db.Date
  description   String
  reference     String?   // External reference (invoice number, tx hash, etc.)
  referenceType ReferenceType? @map("reference_type")
  
  // Source tracking
  sourceType    SourceType? @map("source_type")  // MANUAL, INVOICE, CRYPTO_TX, AI
  sourceId      String?     @map("source_id")
  
  isPosted      Boolean   @default(false) @map("is_posted")
  postedAt      DateTime? @map("posted_at")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  
  company     Company       @relation(fields: [companyId], references: [id], onDelete: Cascade)
  fiscalYear  FiscalYear    @relation(fields: [fiscalYearId], references: [id])
  lines       JournalLine[]
  
  @@unique([companyId, fiscalYearId, number])
  @@index([companyId, date])
  @@map("journal_entries")
}

model JournalLine {
  id            String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  journalEntryId String  @map("journal_entry_id") @db.Uuid
  accountId     String   @map("account_id") @db.Uuid
  description   String?
  
  // Amounts in base currency (EUR)
  debit         Decimal  @default(0) @db.Decimal(18, 8)
  credit        Decimal  @default(0) @db.Decimal(18, 8)
  
  // Crypto amounts (optional)
  cryptoAmount  Decimal? @map("crypto_amount") @db.Decimal(28, 18)
  cryptoAsset   String?  @map("crypto_asset")  // "BTC", "ETH", etc.
  cryptoPrice   Decimal? @map("crypto_price") @db.Decimal(18, 8)  // Price at transaction time
  
  createdAt     DateTime @default(now()) @map("created_at")
  
  journalEntry JournalEntry @relation(fields: [journalEntryId], references: [id], onDelete: Cascade)
  account      Account      @relation(fields: [accountId], references: [id])
  
  @@index([journalEntryId])
  @@map("journal_lines")
}

// ============================================================================
// INVOICING ENTITIES
// ============================================================================

model InvoiceSeries {
  id          String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  companyId   String    @map("company_id") @db.Uuid
  code        String    // "F", "R", "A"
  name        String    // "Standard Invoices", "Simplified", "Credit Notes"
  type        InvoiceType
  prefix      String?   // "2024-"
  nextNumber  Int       @default(1) @map("next_number")
  isActive    Boolean   @default(true) @map("is_active")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  
  company  Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)
  invoices Invoice[]
  
  @@unique([companyId, code])
  @@map("invoice_series")
}

model Invoice {
  id              String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  companyId       String    @map("company_id") @db.Uuid
  seriesId        String    @map("series_id") @db.Uuid
  
  // Invoice identification
  number          Int       // Sequential within series
  fullNumber      String    @map("full_number")  // "F2024-00001"
  type            InvoiceType
  status          InvoiceStatus @default(DRAFT)
  
  // Dates
  issueDate       DateTime  @map("issue_date") @db.Date
  dueDate         DateTime? @map("due_date") @db.Date
  operationDate   DateTime? @map("operation_date") @db.Date
  
  // Customer/Supplier
  direction       InvoiceDirection
  counterpartyName    String  @map("counterparty_name")
  counterpartyTaxId   String? @map("counterparty_tax_id")
  counterpartyAddress String? @map("counterparty_address")
  counterpartyCountry String  @default("ES") @map("counterparty_country")
  
  // Amounts
  subtotal        Decimal   @db.Decimal(18, 2)
  totalTax        Decimal   @map("total_tax") @db.Decimal(18, 2)
  total           Decimal   @db.Decimal(18, 2)
  currency        String    @default("EUR")
  
  // Crypto payment (optional)
  cryptoPayment   Boolean   @default(false) @map("crypto_payment")
  cryptoAsset     String?   @map("crypto_asset")
  cryptoAmount    Decimal?  @map("crypto_amount") @db.Decimal(28, 18)
  cryptoRate      Decimal?  @map("crypto_rate") @db.Decimal(18, 8)
  
  // Verifactu
  verifactuHash       String?   @map("verifactu_hash")
  verifactuPrevHash   String?   @map("verifactu_prev_hash")
  verifactuSentAt     DateTime? @map("verifactu_sent_at")
  verifactuResponse   String?   @map("verifactu_response")
  
  // Notes
  notes           String?
  internalNotes   String?   @map("internal_notes")
  
  // Journal entry link
  journalEntryId  String?   @map("journal_entry_id") @db.Uuid
  
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  
  company      Company         @relation(fields: [companyId], references: [id], onDelete: Cascade)
  series       InvoiceSeries   @relation(fields: [seriesId], references: [id])
  lines        InvoiceLine[]
  
  @@unique([companyId, seriesId, number])
  @@index([companyId, status])
  @@index([companyId, issueDate])
  @@map("invoices")
}

model InvoiceLine {
  id          String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  invoiceId   String    @map("invoice_id") @db.Uuid
  lineNumber  Int       @map("line_number")
  
  description String
  quantity    Decimal   @db.Decimal(18, 4)
  unitPrice   Decimal   @map("unit_price") @db.Decimal(18, 4)
  discount    Decimal   @default(0) @db.Decimal(5, 2)  // Percentage
  
  subtotal    Decimal   @db.Decimal(18, 2)
  taxRate     Decimal   @map("tax_rate") @db.Decimal(5, 2)  // 21.00, 10.00, 4.00, 0.00
  taxAmount   Decimal   @map("tax_amount") @db.Decimal(18, 2)
  total       Decimal   @db.Decimal(18, 2)
  
  // Optional account mapping
  accountCode String?   @map("account_code")
  
  invoice Invoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  
  @@unique([invoiceId, lineNumber])
  @@map("invoice_lines")
}

// ============================================================================
// CRYPTO ENTITIES
// ============================================================================

model CryptoAsset {
  id          String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  companyId   String    @map("company_id") @db.Uuid
  
  symbol      String    // "BTC", "ETH"
  name        String    // "Bitcoin", "Ethereum"
  decimals    Int       @default(18)
  
  // Classification for accounting
  classification CryptoClassification @default(INVENTORY)
  
  // Optional: CoinGecko ID for price fetching
  coingeckoId String?   @map("coingecko_id")
  
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  
  company   Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)
  accounts  Account[]
  lots      CryptoLot[]
  
  @@unique([companyId, symbol])
  @@map("crypto_assets")
}

model Wallet {
  id          String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  companyId   String    @map("company_id") @db.Uuid
  
  address     String
  chain       String    // "ethereum", "polygon", "bitcoin"
  label       String?   // User-friendly name
  type        WalletType @default(EXTERNAL)
  
  // Sync status
  lastSyncAt  DateTime? @map("last_sync_at")
  syncStatus  SyncStatus @default(PENDING) @map("sync_status")
  syncError   String?    @map("sync_error")
  
  isActive    Boolean   @default(true) @map("is_active")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  
  company      Company            @relation(fields: [companyId], references: [id], onDelete: Cascade)
  transactions CryptoTransaction[]
  
  @@unique([companyId, chain, address])
  @@index([companyId, isActive])
  @@map("wallets")
}

model CryptoTransaction {
  id              String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  walletId        String    @map("wallet_id") @db.Uuid
  
  // Blockchain data
  txHash          String    @map("tx_hash")
  blockNumber     BigInt    @map("block_number")
  blockTimestamp  DateTime  @map("block_timestamp")
  chain           String
  
  // Transaction classification
  type            CryptoTxType
  subtype         String?   // For DeFi: "swap", "addLiquidity", etc.
  
  // Amounts
  assetIn         String?   @map("asset_in")
  amountIn        Decimal?  @map("amount_in") @db.Decimal(28, 18)
  assetOut        String?   @map("asset_out")
  amountOut       Decimal?  @map("amount_out") @db.Decimal(28, 18)
  
  // Fees
  feeAsset        String?   @map("fee_asset")
  feeAmount       Decimal?  @map("fee_amount") @db.Decimal(28, 18)
  
  // Pricing (EUR at transaction time)
  priceInEur      Decimal?  @map("price_in_eur") @db.Decimal(18, 8)
  priceOutEur     Decimal?  @map("price_out_eur") @db.Decimal(18, 8)
  feeEur          Decimal?  @map("fee_eur") @db.Decimal(18, 8)
  
  // Cost basis (FIFO)
  costBasis       Decimal?  @map("cost_basis") @db.Decimal(18, 8)
  realizedGain    Decimal?  @map("realized_gain") @db.Decimal(18, 8)
  
  // AI categorization
  aiCategorized   Boolean   @default(false) @map("ai_categorized")
  aiConfidence    Decimal?  @map("ai_confidence") @db.Decimal(5, 4)
  
  // Journal entry link
  journalEntryId  String?   @map("journal_entry_id") @db.Uuid
  
  // Raw data (for debugging)
  rawData         Json?     @map("raw_data")
  
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  
  wallet Wallet @relation(fields: [walletId], references: [id], onDelete: Cascade)
  
  @@unique([walletId, txHash])
  @@index([walletId, blockTimestamp])
  @@index([walletId, type])
  @@map("crypto_transactions")
}

model CryptoLot {
  id              String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  companyId       String    @map("company_id") @db.Uuid
  cryptoAssetId   String    @map("crypto_asset_id") @db.Uuid
  
  // Acquisition data
  acquiredAt      DateTime  @map("acquired_at")
  acquiredAmount  Decimal   @map("acquired_amount") @db.Decimal(28, 18)
  costBasisEur    Decimal   @map("cost_basis_eur") @db.Decimal(18, 8)
  costPerUnit     Decimal   @map("cost_per_unit") @db.Decimal(18, 8)
  
  // Remaining for FIFO
  remainingAmount Decimal   @map("remaining_amount") @db.Decimal(28, 18)
  
  // Source tracking
  sourceTxId      String?   @map("source_tx_id")
  sourceType      String?   @map("source_type")  // "purchase", "staking", "airdrop"
  
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  
  company     Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)
  cryptoAsset CryptoAsset @relation(fields: [cryptoAssetId], references: [id])
  
  @@index([companyId, cryptoAssetId, remainingAmount])
  @@index([companyId, acquiredAt])
  @@map("crypto_lots")
}

// ============================================================================
// AI ENTITIES
// ============================================================================

model AiConversation {
  id          String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  companyId   String    @map("company_id") @db.Uuid
  userId      String    @map("user_id") @db.Uuid
  
  title       String?
  context     String?   // Serialized context data
  
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  
  company  Company      @relation(fields: [companyId], references: [id], onDelete: Cascade)
  messages AiMessage[]
  
  @@index([companyId, userId])
  @@map("ai_conversations")
}

model AiMessage {
  id              String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  conversationId  String    @map("conversation_id") @db.Uuid
  
  role            AiRole
  content         String
  
  // Token usage tracking
  inputTokens     Int?      @map("input_tokens")
  outputTokens    Int?      @map("output_tokens")
  
  // Provider info
  provider        String?   // "anthropic", "openai", "ollama"
  model           String?   // "claude-3-5-sonnet", "gpt-4o"
  
  createdAt       DateTime  @default(now()) @map("created_at")
  
  conversation AiConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  
  @@index([conversationId, createdAt])
  @@map("ai_messages")
}

model Document {
  id          String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  companyId   String    @map("company_id") @db.Uuid
  
  title       String
  content     String    // Full text content
  type        DocumentType
  sourceUrl   String?   @map("source_url")
  
  // Embedding (pgvector)
  embedding   Unsupported("vector(1536)")?
  
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  
  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  @@index([companyId, type])
  @@map("documents")
}

// ============================================================================
// ENUMS
// ============================================================================

enum TaxIdType {
  CIF
  NIF
  NIE
  VAT
  OTHER
}

enum UserRole {
  OWNER
  ADMIN
  USER
  VIEWER
}

enum AccountType {
  ASSET
  LIABILITY
  EQUITY
  INCOME
  EXPENSE
}

enum ReferenceType {
  INVOICE
  CRYPTO_TX
  BANK_TX
  MANUAL
}

enum SourceType {
  MANUAL
  INVOICE
  CRYPTO_TX
  BANK_IMPORT
  AI
}

enum InvoiceType {
  STANDARD
  SIMPLIFIED
  CREDIT_NOTE
  DEBIT_NOTE
}

enum InvoiceStatus {
  DRAFT
  ISSUED
  SENT
  PAID
  CANCELLED
}

enum InvoiceDirection {
  ISSUED    // Outgoing (sales)
  RECEIVED  // Incoming (purchases)
}

enum CryptoClassification {
  INVENTORY         // Group 3 - Active trading
  INTANGIBLE_ASSET  // Group 2 - Long-term investment
}

enum WalletType {
  EXTERNAL    // User's own wallet
  EXCHANGE    // Exchange account
  DEFI        // DeFi protocol position
}

enum SyncStatus {
  PENDING
  SYNCING
  SYNCED
  ERROR
}

enum CryptoTxType {
  TRANSFER_IN
  TRANSFER_OUT
  SWAP
  STAKE
  UNSTAKE
  CLAIM_REWARD
  AIRDROP
  LIQUIDITY_ADD
  LIQUIDITY_REMOVE
  NFT_MINT
  NFT_TRANSFER
  NFT_SALE
  APPROVE
  CONTRACT_INTERACTION
  UNKNOWN
}

enum AiRole {
  USER
  ASSISTANT
  SYSTEM
}

enum DocumentType {
  REGULATION      // AEAT, BOICAC docs
  KNOWLEDGE_BASE  // Internal knowledge
  USER_UPLOAD     // User uploaded docs
}
```

---

## Key Design Decisions

### 1. Decimal Precision

| Type | Precision | Use Case |
|------|-----------|----------|
| `Decimal(18, 2)` | Standard | Invoice amounts in EUR |
| `Decimal(18, 8)` | High | Crypto prices, cost basis |
| `Decimal(28, 18)` | Maximum | Crypto amounts (wei support) |
| `Decimal(5, 2)` | Percentage | Tax rates, discounts |

### 2. Multi-Tenancy

Every business entity includes `companyId`:
- Enables row-level security
- Simplifies queries with Prisma middleware
- Allows future schema-per-tenant migration if needed

### 3. Journal Entry Structure

Double-entry bookkeeping with:
- Header (`JournalEntry`) containing metadata
- Lines (`JournalLine`) with debits and credits
- Validation: sum of debits must equal sum of credits

### 4. FIFO Cost Basis

`CryptoLot` table tracks:
- Original acquisition cost
- Remaining amount after partial sales
- Ordered by `acquiredAt` for FIFO matching

### 5. Verifactu Hash Chain

`Invoice` stores:
- `verifactuHash`: Current invoice hash
- `verifactuPrevHash`: Previous invoice hash
- Creates immutable chain for AEAT compliance

---

## Indexes

Critical indexes for performance:

```sql
-- Accounting queries
CREATE INDEX idx_journal_entries_company_date ON journal_entries(company_id, date);
CREATE INDEX idx_journal_lines_entry ON journal_lines(journal_entry_id);

-- Invoice queries
CREATE INDEX idx_invoices_company_status ON invoices(company_id, status);
CREATE INDEX idx_invoices_company_date ON invoices(company_id, issue_date);

-- Crypto queries
CREATE INDEX idx_wallets_company_active ON wallets(company_id, is_active);
CREATE INDEX idx_crypto_tx_wallet_timestamp ON crypto_transactions(wallet_id, block_timestamp);
CREATE INDEX idx_crypto_lots_fifo ON crypto_lots(company_id, crypto_asset_id, remaining_amount) 
  WHERE remaining_amount > 0;

-- AI vector similarity
CREATE INDEX idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops);
```

---

## Seed Data

The `seed.ts` file initializes:

1. **Spanish Chart of Accounts (PGC)** - ~300 standard accounts
2. **Default Invoice Series** - Standard, Simplified, Credit Notes
3. **Common Crypto Assets** - BTC, ETH, USDT, USDC, etc.
4. **Sample AI Knowledge Base** - AEAT regulations, crypto tax guidance
