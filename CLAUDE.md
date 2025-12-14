# CLAUDE.md - Crypto ERP Spain

## Project Description

Full-featured accounting system with Verifactu electronic invoicing, native cryptocurrency management, and integrated artificial intelligence for the Spanish and European market. Goal: compete with SAGE/Holded by offering the first crypto-native ERP with specialized accounting AI.

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Backend** | NestJS + TypeScript | Node 20 LTS |
| **ORM** | Prisma | 5.x |
| **Database** | PostgreSQL | 15+ |
| **Vector DB** | pgvector (PostgreSQL extension) | - |
| **Frontend** | Angular | 17+ |
| **Styling** | Tailwind CSS | 3.x |
| **Queue** | BullMQ + Redis | 7.x |
| **Blockchain APIs** | Covalent GoldRush | v1 |
| **Crypto Prices** | CoinGecko API | v3 |
| **AI - LLM** | Anthropic Claude API / OpenAI | - |
| **AI - OCR** | Google Document AI / PaddleOCR | - |
| **AI - Embeddings** | OpenAI text-embedding-3-small | - |
| **AI - Self-hosted** | Ollama + Llama 3.1 | Phase 2 |
| **Containers** | Docker + Docker Compose | - |
| **Cloud (prod)** | AWS (ECS, RDS, ElastiCache) | - |

---

## Project Structure

```
crypto-erp/
├── CLAUDE.md                 # This file - context for Claude Code
├── apps/
│   ├── api/                  # NestJS backend (port 3000)
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/           # JWT Authentication
│   │   │   │   ├── companies/      # Multi-tenancy
│   │   │   │   ├── accounting/     # Accounting (journal entries, accounts)
│   │   │   │   ├── invoicing/      # Invoicing + Verifactu
│   │   │   │   ├── crypto/         # Wallets, blockchain transactions
│   │   │   │   ├── reports/        # P&L, Balance Sheet, fiscal
│   │   │   │   └── ai/             # Artificial Intelligence module
│   │   │   │       ├── ai.module.ts
│   │   │   │       ├── ai.controller.ts
│   │   │   │       ├── ai.service.ts
│   │   │   │       ├── providers/
│   │   │   │       │   ├── anthropic.provider.ts
│   │   │   │       │   ├── openai.provider.ts
│   │   │   │       │   └── ollama.provider.ts
│   │   │   │       ├── services/
│   │   │   │       │   ├── chat.service.ts         # Accounting chatbot
│   │   │   │       │   ├── categorizer.service.ts  # Transaction categorization
│   │   │   │       │   ├── ocr.service.ts          # Invoice OCR
│   │   │   │       │   ├── predictor.service.ts    # Tax prediction
│   │   │   │       │   ├── reporter.service.ts     # Report generation
│   │   │   │       │   └── embeddings.service.ts   # RAG and search
│   │   │   │       └── prompts/
│   │   │   │           ├── system-accountant.md
│   │   │   │           ├── system-tax-advisor.md
│   │   │   │           └── system-crypto-expert.md
│   │   │   ├── common/
│   │   │   └── main.ts
│   │   └── test/
│   ├── web/                  # Angular frontend (port 4200)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── core/
│   │   │   │   ├── shared/
│   │   │   │   │   └── components/
│   │   │   │   │       └── ai-chat/
│   │   │   │   ├── features/
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   ├── accounting/
│   │   │   │   │   ├── invoicing/
│   │   │   │   │   ├── crypto/
│   │   │   │   │   └── ai-assistant/
│   │   │   │   └── app.routes.ts
│   │   │   └── environments/
│   │   └── angular.json
│   └── worker/               # Async jobs (BullMQ)
│       └── src/
│           ├── processors/
│           │   ├── blockchain-sync.processor.ts
│           │   ├── price-update.processor.ts
│           │   ├── verifactu-send.processor.ts
│           │   ├── ai-categorize.processor.ts
│           │   └── ai-embeddings.processor.ts
│           └── main.ts
├── libs/
│   ├── shared/               # Shared code
│   │   ├── src/
│   │   │   ├── dto/
│   │   │   ├── interfaces/
│   │   │   ├── constants/
│   │   │   └── utils/
│   │   └── index.ts
│   ├── database/             # Prisma and migrations
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   └── index.ts
│   ├── crypto/               # Blockchain logic
│   │   ├── src/
│   │   │   ├── providers/
│   │   │   ├── parsers/
│   │   │   ├── calculators/
│   │   │   └── types/
│   │   └── index.ts
│   └── ai/                   # Shared AI library
│       ├── src/
│       │   ├── llm/
│       │   │   ├── base.provider.ts
│       │   │   ├── anthropic.client.ts
│       │   │   ├── openai.client.ts
│       │   │   └── ollama.client.ts
│       │   ├── embeddings/
│       │   │   ├── generator.ts
│       │   │   └── similarity.ts
│       │   ├── ocr/
│       │   │   ├── document-ai.client.ts
│       │   │   └── paddle-ocr.client.ts
│       │   ├── rag/
│       │   │   ├── retriever.ts
│       │   │   └── context-builder.ts
│       │   └── prompts/
│       │       └── templates.ts
│       └── index.ts
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── VERIFACTU.md
│   ├── CRYPTO.md
│   └── AI.md
├── docker-compose.yml
├── package.json
├── .env.example
└── tsconfig.base.json
```

---

## AI Architecture

### Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Angular)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  AI Chat     │  │  Smart Forms │  │  Insights Dashboard  │  │
│  │  Widget      │  │  (OCR upload)│  │  (predictions)       │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
└─────────┼─────────────────┼─────────────────────┼───────────────┘
          │                 │                     │
          ▼                 ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (NestJS)                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    AI Module                              │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐│   │
│  │  │ Chat    │ │ OCR     │ │ Predict │ │ Categorizer     ││   │
│  │  │ Service │ │ Service │ │ Service │ │ Service         ││   │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────────┬────────┘│   │
│  └───────┼───────────┼───────────┼───────────────┼──────────┘   │
└──────────┼───────────┼───────────┼───────────────┼──────────────┘
           │           │           │               │
           ▼           ▼           ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     AI PROVIDERS LAYER                           │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   ANTHROPIC     │  │    OPENAI       │  │    OLLAMA       │  │
│  │   Claude 3.5    │  │    GPT-4o       │  │    Llama 3.1    │  │
│  │   (Primary)     │  │    (Fallback)   │  │    (Self-host)  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │  DOCUMENT AI    │  │  PADDLEOCR      │                       │
│  │  (Cloud OCR)    │  │  (Self-hosted)  │                       │
│  └─────────────────┘  └─────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DATA LAYER                                   │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   PostgreSQL    │  │    pgvector     │  │     Redis       │  │
│  │   (Data)        │  │   (Embeddings)  │  │   (Cache/Queue) │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### AI Features

#### 1. Smart Accounting Chatbot
- Answers questions about Spanish accounting (PGC - Plan General Contable)
- Explains generated journal entries
- Advises on tax implications of crypto operations
- Uses RAG with AEAT documentation, BOICAC, MiCA regulations
- **Model**: Claude 3.5 Sonnet (primary) / GPT-4o (fallback)

#### 2. Automatic Transaction Categorization
- Automatically classifies crypto transactions
- Detects type: swap, transfer, stake, reward, airdrop, NFT
- Suggests appropriate accounting account (PGC)
- **Model**: Claude Haiku (fast/cheap) / Llama 3.1 8B (self-hosted)

#### 3. Invoice & Receipt OCR
- Extracts data from scanned/photographed invoices
- Detects: issuer, tax ID, date, line items, amounts, VAT
- Auto-creates received invoice draft
- **Service**: Google Document AI (accuracy) / PaddleOCR (zero cost)

#### 4. Real-Time Tax Prediction
- Calculates accumulated taxes before trading
- Simulates tax impact of potential trades
- Alerts on tax thresholds (Model 721, etc.)
- **Model**: Claude 3.5 with historical context

#### 5. Intelligent Report Generation
- Generates narrative analysis of financial statements
- Executive summary of P&L with insights
- Detects anomalies and patterns
- **Model**: Claude 3.5 Sonnet

#### 6. RAG (Retrieval Augmented Generation)
- Knowledge base with Spanish regulations
- AEAT documentation, binding consultations
- Articles on crypto accounting
- **Embeddings**: text-embedding-3-small
- **Vector Store**: pgvector

### Provider Strategy (Fallback Chain)

```typescript
// Priority order for each task type
const providerStrategy = {
  chat: ['anthropic', 'openai', 'ollama'],           // Quality > cost
  categorization: ['ollama', 'anthropic-haiku'],      // Cost > quality
  ocr: ['document-ai', 'paddle-ocr'],                 // Precision > cost
  embeddings: ['openai', 'ollama'],                   // Consistency
  reports: ['anthropic', 'openai'],                   // Maximum quality
};
```

### Private Mode (Enterprise)
For clients requiring total privacy:
- All processing with local Ollama
- No data sent to external APIs
- Requires GPU on client infrastructure
- Flag `AI_PRIVATE_MODE=true`

---

## Development Rules

### TypeScript
- `strict: true` mandatory in tsconfig
- Never use `any` - use `unknown` with type guards
- Interfaces for external data, types for internal
- Enums for fixed values (AccountType, InvoiceStatus, etc.)

### NestJS Backend
- Each module in its own folder: controller, service, dto, entities
- DTOs validated with class-validator on ALL endpoints
- Typed HttpException errors
- Interceptors for logging and response transformation
- Guards for auth and tenant permissions

### Angular Frontend
- Standalone components (no NgModules)
- Signals for reactive state
- Lazy loading by feature
- Smart/Dumb component pattern
- Reactive forms (not template-driven)

### Database
- Prisma as the only ORM
- Versioned migrations committed to git
- Soft delete with `deletedAt` where applicable
- Indexes on frequently searched fields
- **Decimals**: 
  - EUR: `Decimal(18, 8)` - supports up to billions with 8 decimals
  - Crypto: `Decimal(28, 18)` - supports Ethereum wei
- **Vectors**: pgvector for AI embeddings

### AI/LLM
- Versioned prompts in separate `.md` files
- Never hardcode prompts in code
- Log all LLM calls (cost, tokens, latency)
- Rate limiting per tenant
- Cache frequent responses in Redis
- Automatic fallback between providers

### Multi-tenancy
- ALL tables have `companyId`
- Automatic tenant filter on queries
- Ownership validation on every operation
- Embeddings segregated by tenant

### Testing
- Unit tests for business logic (Jest)
- Integration tests for critical endpoints
- Minimum 80% coverage on core modules
- Mocks for external APIs (Covalent, CoinGecko, LLMs)
- Prompt tests with edge cases

---

## Accounting - Spanish General Accounting Plan (PGC)

### Account Structure
```
Group 1: Basic financing
Group 2: Non-current assets
  - 250xxx: Long-term financial investments (long-term crypto)
Group 3: Inventory
  - 305xxx: Crypto inventory (if main activity is trading)
Group 4: Creditors and debtors
  - 430: Customers (Accounts Receivable)
  - 400: Suppliers (Accounts Payable)
  - 472: Input VAT
  - 477: Output VAT
Group 5: Financial accounts
  - 572: Banks
  - 5700xx: Crypto wallets (sub-account per wallet)
Group 6: Expenses
  - 600: Purchases
  - 662: Debt interest (crypto fees)
  - 668: Negative exchange differences (crypto losses)
Group 7: Income
  - 700: Sales
  - 768: Positive exchange differences (crypto gains)
  - 769: Other financial income (staking, airdrops)
```

### Crypto Accounting Rules
1. **Classification**: Inventory (group 3) if active trading, Intangible assets (group 2) if long-term investment
2. **Valuation**: Acquisition cost (never revalue above cost)
3. **Cost basis**: FIFO method mandatory in Spain
4. **Fees**: Capitalize in acquisition cost if buying, expense if selling
5. **Staking/Airdrops**: Income at market value on receipt date

### Automatic Journal Entries
```
// Buy crypto with EUR
(305001) Bitcoin          1,000.00 €
   to (572) Banks                      1,000.00 €

// Sell crypto with gain
(572) Banks               1,500.00 €
   to (305001) Bitcoin                   800.00 €  // FIFO cost
   to (768) Positive exchange diff       700.00 €

// Staking reward received
(5700xx) ETH Wallet          50.00 €
   to (769) Other financial income       50.00 €

// Transaction fee
(662) Debt interest           5.00 €
   to (5700xx) ETH Wallet                 5.00 €
```

---

## Electronic Invoicing - Verifactu (Spain)

### Key Dates
- **July 29, 2025**: Software must be compliant
- **January 1, 2026**: Mandatory for corporations
- **July 1, 2026**: Mandatory for self-employed

### Technical Requirements
1. **Chained hash**: SHA-256 of each record, including previous hash
2. **QR Code**: Mandatory with AEAT verification URL
3. **Label**: "VERI*FACTU" visible on invoice
4. **Format**: XML per AEAT specification
5. **Transmission**: Capability to send to AEAT

### Hash Implementation
```typescript
function generateVerifactuHash(invoice: Invoice, previousHash: string): string {
  const data = [
    invoice.issuerTaxId,
    invoice.series + invoice.number,
    invoice.date.toISOString().split('T')[0],
    invoice.totalAmount.toFixed(2),
    previousHash || '0'
  ].join('|');
  
  return crypto.createHash('sha256').update(data).digest('hex');
}
```

---

## Crypto - Blockchain Integration

### Supported Chains (MVP)
- Ethereum (mainnet)
- Polygon
- BSC (Binance Smart Chain)

### Phase 2 Chains
- Arbitrum, Optimism (L2s)
- Solana
- Bitcoin (balance only, no DeFi)

### Primary API: Covalent GoldRush
```typescript
// Get wallet transactions
const txs = await covalent.getTransactions(address, 'eth-mainnet');

// Get balances
const balances = await covalent.getBalances(address, 'polygon-mainnet');
```

### Transaction Types to Parse
- Transfer (simple send/receive)
- Swap (DEX: Uniswap, SushiSwap, etc.)
- Approve (no journal entry)
- Stake/Unstake
- Claim Rewards
- Liquidity Add/Remove
- NFT Mint/Transfer/Sale

---

## Useful Commands

```bash
# Development
docker-compose up -d              # Start PostgreSQL + Redis + Ollama
npm run start:api                 # Backend on :3000
npm run start:web                 # Frontend on :4200
npm run start:worker              # BullMQ workers

# Database
npx prisma migrate dev            # Create migration
npx prisma generate               # Regenerate client
npx prisma studio                 # Database GUI
npx prisma db seed                # Seed chart of accounts

# Testing
npm run test                      # Unit tests
npm run test:e2e                  # Integration tests
npm run test:ai                   # Prompt tests

# AI Local (Ollama)
ollama pull llama3.1:8b           # Download model
ollama run llama3.1:8b            # Test model
```

---

## Key Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/crypto_erp"

# Redis
REDIS_URL="redis://localhost:6379"

# AI - APIs
ANTHROPIC_API_KEY="sk-ant-..."
OPENAI_API_KEY="sk-..."
GOOGLE_CLOUD_PROJECT="project-id"

# AI - Config
AI_PRIVATE_MODE=false             # true = Ollama only
AI_PRIMARY_PROVIDER=anthropic     # anthropic | openai | ollama
OLLAMA_BASE_URL="http://localhost:11434"

# Blockchain
COVALENT_API_KEY="cqt_..."
COINGECKO_API_KEY="CG-..."        # Optional, free tier ok

# Verifactu
AEAT_CERTIFICATE_PATH="/path/to/cert.p12"
AEAT_CERTIFICATE_PASSWORD="..."
```

---

## Additional Context

- See `docs/ARCHITECTURE.md` for detailed architecture decisions
- See `docs/DATABASE.md` for complete Prisma schema
- See `docs/VERIFACTU.md` for AEAT technical specification
- See `docs/CRYPTO.md` for blockchain integration
- See `docs/AI.md` for detailed AI architecture

---

## Developer

**Federico** - Full Stack Developer
- Expertise: Angular, NestJS, PostgreSQL, Docker, AWS
- Languages: Spanish (primary), English
- Target market: Spain → Europe → Global
- Goal: Complete commercial product with AI differentiator
