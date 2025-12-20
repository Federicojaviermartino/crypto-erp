# Crypto-ERP

Complete ERP system for accounting management, electronic invoicing with Verifactu, and cryptocurrency accounting with Spanish tax compliance.

## Project Status

**Version**: 3.0 (January 2025)
**Status**: Commercial Launch Ready
**Coverage**: 90%+ (421 tests)
**Capacity**: 100-500 concurrent users

---

## Main Features

### Accounting
- Complete Spanish General Accounting Plan (PGC)
- Automatic journal entries
- Fiscal years and closings
- Balance sheet and P&L statement
- General ledger and journal book

### Electronic Invoicing & Compliance
- Complete **Verifactu** system (AEAT)
- **SII** - Immediate Information Supply (4-day submission)
- **Model 347** - Declaration of operations >3,005 EUR
- SHA-256 hash chain + QR codes
- SOAP submission to AEAT with retries
- AEAT signed XML generation
- Configurable invoice series
- Contact management (customers/suppliers)
- PDF export

### Crypto & Blockchain
- **9 blockchains supported**:
  - EVM: Ethereum, Polygon, BSC, Arbitrum, Optimism, Base, Avalanche
  - Non-EVM: Solana, Bitcoin
- Automatic FIFO calculation (cost basis)
- 20+ auto-detected transaction types
- Exchange integration (Coinbase, Kraken, Binance)
- Real-time portfolio tracking
- Model 721/720 (cryptocurrency declaration)

### Artificial Intelligence
- **Accounting assistant chat** with RAG (Retrieval-Augmented Generation)
- **Real-time tax prediction**
- **Intelligent OCR** for invoices (Google Vision + PaddleOCR + AI)
- **Batch categorization** of crypto transactions
- AEAT knowledge base (VAT, IRPF, Corporate Tax, BOICAC)
- **Multi-language** support (Spanish + English)
- Automatic insights and recommendations

### Analytics & Reporting
- Interactive dashboard with Chart.js
- Portfolio charts (doughnut chart)
- Monthly trends (line charts)
- Tax reports (CSV export)
- Tax calculator with IRPF brackets

### Payments & SaaS
- Complete **Stripe integration** (Checkout + Webhooks)
- **3 Subscription tiers**: Free, Pro (29 EUR/month), Enterprise (99 EUR/month)
- 14-day trial on paid plans
- Usage limits per plan (invoices/month, AI messages/month)
- Customer Portal for subscription management
- Automatic upgrade/downgrade

### Monitoring & Observability
- **Prometheus** for metrics (15+ custom metrics)
- **Grafana** dashboards (16 pre-configured panels)
- **Sentry** for error tracking
- Automatic alerts (18 configured rules)
- Business metrics (MRR, churn, active subscriptions)

### Backups & DR
- **Automatic daily backups** (cron scheduler)
- Automatic upload to **AWS S3**
- Retention policy (7d/4w/12m)
- Safe restoration with safety backup
- Backup metrics integrated in Grafana

---

## Architecture

### Technology Stack

- **Backend**: NestJS 10 + TypeScript
- **Frontend**: Angular 17 (standalone components + signals)
- **Database**: PostgreSQL 15 + Prisma ORM
- **Workers**: BullMQ + Redis
- **AI**: Anthropic Claude 3.5, OpenAI GPT-4, Ollama
- **OCR**: Google Cloud Vision, PaddleOCR
- **Blockchain**: Covalent GoldRush API
- **Charts**: Chart.js + ng2-charts
- **Payments**: Stripe
- **Monitoring**: Prometheus + Grafana + Sentry
- **Backups**: Automated PostgreSQL backups to S3

---

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+ (or use Docker)
- Redis 7+ (or use Docker)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your API keys:
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/cryptoerp"

# AI (choose one or more)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
OLLAMA_BASE_URL=http://localhost:11434

# Blockchain
COVALENT_API_KEY=cqt_...
COINGECKO_API_KEY=CG-...

# OCR (optional)
GOOGLE_CLOUD_API_KEY=...
PADDLE_OCR_URL=http://localhost:8866
```

### 3. Start Database

```bash
docker-compose up -d postgres redis
```

### 4. Run Database Migrations

```bash
npm run db:migrate
npm run db:seed  # Sample data (optional)
```

### 5. Start Application

```bash
npm run dev
```

This starts:
- API: http://localhost:3000
- Web: http://localhost:4200
- Worker: background

---

## Documentation

- [API Docs](http://localhost:3000/api-docs) - Swagger UI
- [Architecture](docs/ARCHITECTURE.md) - System architecture
- [Deployment](docs/DEPLOYMENT.md) - Production deployment guide
- [Scaling](docs/SCALING.md) - Scaling guide

---

## Testing

```bash
npm run test        # Unit tests
npm run test:e2e    # E2E tests
npm run test:cov    # Coverage report
```

**Current coverage**: 90%+ (421 tests)

---

## Build

```bash
npm run build
```

---

## Roadmap

### Phase 1 - MVP (Completed)
- JWT Authentication
- PGC Accounting
- Basic Invoicing
- Verifactu AEAT
- 7 EVM Blockchains
- Basic AI Chat

### Phase 2 - Advanced AI + Multi-Blockchain (Completed)
- Real-time tax prediction
- AI batch categorization
- Expanded knowledge base (AEAT)
- Multi-language (ES/EN)
- Self-hosted PaddleOCR
- Solana + Bitcoin
- Dashboard with interactive charts
- OCR in forms
- Improved AI Chat (context, history, files)

### Phase 3A - MVP Production (Completed)
- Email notifications (Resend)
- User invitations system
- Two-Factor Authentication (2FA)
- Complete audit logging
- GDPR compliance (data export/deletion)
- Error tracking (Sentry)
- CI/CD pipeline (GitHub Actions)

### Phase 3B - Commercial Launch (Completed)
- Model 347 - Declaration of operations >3,005 EUR
- SII - Immediate Information Supply
- Stripe integration - Payments + Subscriptions
- Subscription tiers - Free/Pro/Enterprise
- Prometheus + Grafana - Production monitoring
- Automated backups - PostgreSQL to S3
- Complete documentation (Deployment + Scaling)

### Phase 3C - Enterprise Ready (Completed)
- SSO/SAML integration (Google, Azure AD, SAML 2.0)
- Webhooks system with HMAC-SHA256 signatures
- Complete test coverage 95%+
- Production infrastructure (CI/CD, monitoring, backups)
- Security hardening (2FA, audit logs, GDPR)

### Phase 4 - Scale & Growth (Future)
- Multi-region deployment
- Advanced analytics dashboard
- White-label branding
- Mobile app (React Native)
- API marketplace
- Advanced integrations

---

## License

Proprietary - All rights reserved
