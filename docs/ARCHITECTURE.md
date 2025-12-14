# Architecture Documentation

## Overview

This document describes the high-level architecture decisions for the Crypto ERP system.

---

## System Architecture

### Monorepo Structure

We use a monorepo approach with Turborepo for build orchestration. Business logic is organized in NestJS modules within the API application, with a shared database library for Prisma schema.

```
┌─────────────────────────────────────────────────────────────────┐
│                         MONOREPO                                 │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   apps/api  │  │  apps/web   │  │ apps/worker │              │
│  │   (NestJS)  │  │  (Angular)  │  │  (BullMQ)   │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│         └────────────────┼────────────────┘                      │
│                          │                                       │
│                          ▼                                       │
│         ┌─────────────────────────────────────┐                 │
│         │           libs/database              │                 │
│         │    Prisma Schema + Client + Seed     │                 │
│         └─────────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
```

### Why This Structure?

1. **Colocated business logic**: All domain logic in `apps/api/src/modules/` for easier navigation
2. **Shared database**: Single source of truth for Prisma schema
3. **Independent workers**: Background jobs in separate app for scaling
4. **Simplified dependencies**: Less cross-package complexity
5. **Turborepo caching**: Fast incremental builds

---

## Project Structure

```
crypto-erp/
├── apps/
│   ├── api/                  # NestJS backend (REST API)
│   │   └── src/
│   │       └── modules/      # Business logic modules
│   ├── web/                  # Angular 18 frontend
│   └── worker/               # BullMQ background processors
├── libs/
│   └── database/             # Prisma schema, migrations, seed
│       └── prisma/
│           └── schema.prisma
├── docs/                     # Documentation
├── docker-compose.yml        # Development infrastructure
└── turbo.json                # Turborepo configuration
```

---

## Backend Architecture (NestJS)

### Module Organization

```
apps/api/src/modules/
├── auth/                     # Authentication & authorization
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/
│   │   └── jwt.strategy.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── company.guard.ts
│   └── dto/
│
├── users/                    # User management
│   ├── users.module.ts
│   ├── users.controller.ts
│   └── users.service.ts
│
├── companies/                # Multi-tenancy core
│   ├── companies.module.ts
│   ├── companies.controller.ts
│   ├── companies.service.ts
│   └── data/
│       └── pgc-accounts.ts   # Spanish Chart of Accounts
│
├── accounting/               # Core accounting (PGC)
│   ├── accounting.module.ts
│   ├── controllers/
│   │   ├── accounts.controller.ts
│   │   ├── journal-entries.controller.ts
│   │   └── fiscal-years.controller.ts
│   └── services/
│       ├── accounts.service.ts
│       └── journal-entries.service.ts
│
├── invoicing/                # Invoicing + Verifactu
│   ├── invoicing.module.ts
│   ├── controllers/
│   │   ├── invoices.controller.ts
│   │   ├── series.controller.ts
│   │   ├── contacts.controller.ts
│   │   └── verifactu.controller.ts
│   ├── services/
│   │   ├── invoices.service.ts
│   │   ├── series.service.ts
│   │   ├── contacts.service.ts
│   │   └── invoice-pdf.service.ts
│   └── verifactu/
│       ├── verifactu.service.ts
│       └── aeat-client.service.ts
│
├── crypto/                   # Cryptocurrency management
│   ├── crypto.module.ts
│   ├── controllers/
│   │   ├── wallets.controller.ts
│   │   ├── transactions.controller.ts
│   │   └── exchange-accounts.controller.ts
│   ├── services/
│   │   ├── wallets.service.ts
│   │   ├── blockchain-sync.service.ts
│   │   ├── cost-basis.service.ts
│   │   ├── crypto-assets.service.ts
│   │   └── crypto-transactions.service.ts
│   ├── exchanges/
│   │   ├── exchange.interface.ts
│   │   ├── exchange.factory.ts
│   │   ├── coinbase.client.ts
│   │   ├── kraken.client.ts
│   │   └── binance.client.ts
│   └── blockchain/
│       └── transaction-parser.ts
│
├── fiscal/                   # Tax reporting
│   ├── fiscal.module.ts
│   ├── modelo721.controller.ts
│   ├── modelo721.service.ts
│   ├── tax-report.controller.ts
│   └── tax-report.service.ts
│
├── analytics/                # Dashboard & KPIs
│   ├── analytics.module.ts
│   ├── analytics.controller.ts
│   └── analytics.service.ts
│
└── ai/                       # AI services
    ├── ai.module.ts
    ├── ai.controller.ts
    └── services/
        ├── ai.service.ts
        ├── ai-provider.service.ts
        ├── embeddings.service.ts
        └── rag.service.ts
```

### Request Flow

```
HTTP Request
    │
    ▼
┌─────────────────┐
│  Global Pipes   │  ← ValidationPipe (class-validator)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Auth Guard     │  ← JWT validation
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Company Guard   │  ← Multi-tenant context
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Rate Limiter   │  ← ThrottlerModule (3 tiers)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Controller     │  ← Route handling, DTO validation
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Service        │  ← Business logic
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Prisma Client  │  ← Database operations
└─────────────────┘
```

---

## Frontend Architecture (Angular 18)

### Feature-Based Structure

```
apps/web/src/app/
├── core/                     # Singleton services, guards
│   ├── services/
│   │   ├── auth.service.ts
│   │   └── api.service.ts
│   ├── guards/
│   │   └── auth.guard.ts
│   └── interceptors/
│       ├── auth.interceptor.ts
│       └── error.interceptor.ts
│
├── shared/                   # Reusable components
│   └── components/
│       └── ai-chat/
│
├── features/                 # Feature modules (lazy loaded)
│   ├── dashboard/
│   ├── invoicing/
│   ├── crypto/
│   ├── accounting/
│   └── settings/
│
├── app.routes.ts
├── app.config.ts
└── app.component.ts
```

### State Management

Using Angular Signals for reactive state:

```typescript
@Injectable({ providedIn: 'root' })
export class AccountingStore {
  private readonly _accounts = signal<Account[]>([]);
  private readonly _loading = signal(false);

  readonly accounts = this._accounts.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly assetAccounts = computed(() =>
    this._accounts().filter(a => a.type === 'ASSET')
  );

  async loadAccounts(): Promise<void> {
    this._loading.set(true);
    try {
      const accounts = await this.api.getAccounts();
      this._accounts.set(accounts);
    } finally {
      this._loading.set(false);
    }
  }
}
```

---

## Worker Architecture (BullMQ)

### Job Processors

```
apps/worker/src/
├── main.ts                           # Bootstrap
├── worker.module.ts                  # BullMQ configuration
├── processors/
│   ├── blockchain-sync.processor.ts  # Sync wallet transactions (Covalent)
│   ├── price-update.processor.ts     # Update crypto prices (CoinGecko)
│   ├── verifactu-send.processor.ts   # Send invoices to AEAT
│   └── journal-entry.processor.ts    # Auto-create journal entries
└── services/
    └── scheduled-tasks.service.ts    # Cron jobs
```

### Queue Configuration

```typescript
const QUEUES = {
  BLOCKCHAIN: 'blockchain',
  PRICES: 'prices',
  VERIFACTU: 'verifactu',
  JOURNAL: 'journal',
};

const JOBS = {
  BLOCKCHAIN: {
    SYNC_WALLET: 'sync-wallet',
    SYNC_ALL: 'sync-all',
  },
  PRICES: {
    UPDATE: 'update-prices',
  },
  VERIFACTU: {
    SEND_INVOICE: 'send-invoice',
    RETRY_FAILED: 'retry-failed',
  },
  JOURNAL: {
    CREATE_ENTRY: 'create-entry',
  },
};
```

### Scheduled Jobs (Cron)

| Schedule | Job | Description |
|----------|-----|-------------|
| `*/5 * * * *` | Price Update | Update crypto prices every 5 minutes |
| `*/15 * * * *` | Wallet Sync | Sync active wallets every 15 minutes |
| `0 * * * *` | Verifactu Retry | Retry failed AEAT submissions hourly |

---

## Database Architecture

### Multi-Tenancy Strategy

We use **row-level tenancy** with `companyId` on all business tables:

```sql
-- Every table includes companyId
CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  code VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  UNIQUE(company_id, code)  -- Unique within tenant
);
```

### Key Schema Features

- **Decimal precision**: `Decimal(28, 18)` for crypto amounts (wei support)
- **FIFO tracking**: `CryptoLot` table with `remainingAmount` for cost basis
- **Hash chain**: `Invoice.verifactuHash` + `verifactuPrevHash` for Verifactu
- **pgvector**: `Document.embedding` for RAG similarity search

---

## AI Architecture

See [docs/AI.md](./AI.md) for detailed AI architecture documentation.

### Key Features

1. **Provider abstraction**: Anthropic, OpenAI, Ollama with automatic fallback
2. **RAG implementation**: pgvector for embeddings, context retrieval
3. **Chatbot**: Spanish accounting & crypto expert
4. **Categorization**: AI-powered transaction classification

---

## Security Architecture

### Authentication Flow

```
┌─────────┐      ┌─────────┐      ┌─────────┐
│  User   │──────│  Login  │──────│  JWT    │
│         │      │  API    │      │  Token  │
└─────────┘      └─────────┘      └────┬────┘
                                       │
                                       ▼
                                 ┌─────────┐
                                 │ Access  │ (15 min)
                                 │ Token   │
                                 └────┬────┘
                                      │
                                      ▼
                                 ┌─────────┐
                                 │ Refresh │ (7 days)
                                 │ Token   │
                                 └─────────┘
```

### Security Measures

- JWT tokens with short expiry (15 min access, 7 days refresh)
- Rate limiting: 3 tiers (anonymous, authenticated, premium)
- Input validation on all DTOs via class-validator
- SQL injection prevention via Prisma parameterized queries
- XSS prevention via Angular sanitization
- CORS configuration for production domains

---

## Deployment Architecture

### Development (Docker Compose)

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg15
    ports: ["5432:5432"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  ollama:
    image: ollama/ollama
    ports: ["11434:11434"]
```

### Production

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRODUCTION STACK                             │
│                                                                  │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐        │
│  │   Nginx     │────▶│  API (3000) │────▶│  Worker     │        │
│  │  (proxy)    │     │   NestJS    │     │   BullMQ    │        │
│  └─────────────┘     └──────┬──────┘     └──────┬──────┘        │
│                             │                   │                │
│         ┌───────────────────┼───────────────────┘                │
│         │                   │                                    │
│         ▼                   ▼                                    │
│  ┌─────────────┐     ┌─────────────┐                            │
│  │ PostgreSQL  │     │    Redis    │                            │
│  │ + pgvector  │     │             │                            │
│  └─────────────┘     └─────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

### Health Checks

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/health` | Overall health status |
| `GET /api/v1/health/ready` | Kubernetes readiness probe |
| `GET /api/v1/health/live` | Kubernetes liveness probe |

---

## Performance Considerations

### Database

- Connection pooling via Prisma
- Indexes on `companyId` + frequently queried fields
- `CryptoLot` index for FIFO queries: `(company_id, crypto_asset_id, remaining_amount)`

### Caching

- Redis for BullMQ job queues
- Redis for rate limiting counters
- 5-minute TTL for crypto prices

### Async Processing

- Blockchain sync via BullMQ workers
- Verifactu AEAT submission with retry
- Auto journal entry generation
