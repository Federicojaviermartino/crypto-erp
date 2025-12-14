# Crypto-ERP - Quick Start Guide

Get Crypto-ERP running in production in 15 minutes.

## Prerequisites

- Docker 24.0+ with Docker Compose v2
- Node.js 20+
- PostgreSQL 15+ (or use Docker)
- Redis 7+ (or use Docker)

---

## 1. Clone & Install (3 min)

```bash
# Clone repository
git clone https://github.com/yourorg/crypto-erp.git
cd crypto-erp

# Install dependencies
npm install

# Generate Prisma client
npm run db:generate
```

---

## 2. Configure Environment (5 min)

```bash
# Copy environment template
cp .env.example .env
```

**Edit `.env` with your values**:

```bash
# Minimum required variables:

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/crypto_erp"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT Secrets (generate new ones!)
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)

# Email (Resend - free tier)
RESEND_API_KEY=re_...  # Get free key at resend.com

# AI (optional but recommended)
ANTHROPIC_API_KEY=sk-ant-...  # Get at console.anthropic.com
OPENAI_API_KEY=sk-...         # Get at platform.openai.com

# Stripe (test mode)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional (can skip for now)
SENTRY_DSN=https://...@sentry.io/...
S3_ENABLED=false
```

---

## 3. Database Setup (2 min)

```bash
# Start PostgreSQL + Redis with Docker
docker-compose up -d postgres redis

# Wait for PostgreSQL to be ready
sleep 10

# Run migrations
npm run db:migrate

# Seed initial data (subscription plans, etc.)
npm run db:seed
```

---

## 4. Build Application (3 min)

```bash
# Build all packages
npm run build
```

---

## 5. Start Services (2 min)

### Option A: Development Mode

```bash
# Start API
npm run dev:api

# In another terminal, start Worker
npm run dev:worker

# In another terminal, start Frontend
npm run dev:web
```

**Access**:
- API: http://localhost:3000
- Frontend: http://localhost:5200
- API Docs: http://localhost:3000/api-docs

### Option B: Production Mode (Docker)

```bash
# Start full stack
docker-compose up -d

# With monitoring
docker-compose -f docker-compose.yml \
               -f docker-compose.monitoring.yml \
               up -d

# With monitoring + backups
docker-compose -f docker-compose.yml \
               -f docker-compose.monitoring.yml \
               -f docker-compose.backups.yml \
               up -d
```

**Access**:
- API: http://localhost:3000
- Frontend: http://localhost:5200
- Grafana: http://localhost:3100 (admin/admin)
- Prometheus: http://localhost:9090

---

## 6. Verify Installation

```bash
# Check API health
curl http://localhost:3000/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-01-08T...",
  "services": {
    "database": "healthy",
    "redis": "healthy"
  }
}

# Check database connection
npm run db:status

# Check Docker services
docker-compose ps

# All services should show "Up"
```

---

## 7. Create First User

```bash
# Via API (using curl)
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@crypto-erp.com",
    "password": "SecurePassword123!",
    "firstName": "Admin",
    "lastName": "User"
  }'

# Or use frontend registration: http://localhost:5200/auth/register
```

---

## 8. Create First Company

```bash
# Login first to get token
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@crypto-erp.com",
    "password": "SecurePassword123!"
  }' | jq -r '.accessToken')

# Create company
curl -X POST http://localhost:3000/companies \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mi Empresa SL",
    "taxId": "B12345678",
    "email": "empresa@example.com",
    "country": "ES"
  }'
```

---

## 9. Test Key Features

### Test Invoice Creation

```bash
curl -X POST http://localhost:3000/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "INV-001",
    "issueDate": "2025-01-08",
    "dueDate": "2025-02-08",
    "counterpartyName": "Cliente Test",
    "counterpartyTaxId": "B87654321",
    "items": [
      {
        "description": "Servicio de consultoría",
        "quantity": 10,
        "unitPrice": 100,
        "taxRate": 21
      }
    ]
  }'
```

### Test AI Chat

```bash
curl -X POST http://localhost:3000/ai/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "¿Cómo puedo crear una factura?",
    "conversationId": null
  }'
```

### Test Crypto Wallet

```bash
curl -X POST http://localhost:3000/crypto/wallets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mi Wallet Ethereum",
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "blockchain": "ETHEREUM",
    "type": "HOT"
  }'
```

---

## 10. Configure Stripe (for Payments)

### Create Products in Stripe Dashboard

1. Go to https://dashboard.stripe.com/test/products
2. Create 3 products:

**Free Plan**:
- Name: "Free"
- Price: €0/month
- Copy Price ID → Update `.env`: `STRIPE_PRICE_FREE=price_...`

**Pro Plan**:
- Name: "Pro"
- Price: €29/month
- Add 14-day trial
- Copy Price ID → Update `.env`: `STRIPE_PRICE_PRO=price_...`

**Enterprise Plan**:
- Name: "Enterprise"
- Price: €99/month
- Add 14-day trial
- Copy Price ID → Update `.env`: `STRIPE_PRICE_ENTERPRISE=price_...`

### Configure Webhook

1. Go to https://dashboard.stripe.com/test/webhooks
2. Add endpoint: `https://api.crypto-erp.com/payments/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.*`
   - `invoice.*`
4. Copy Webhook Secret → Update `.env`: `STRIPE_WEBHOOK_SECRET=whsec_...`

### Seed Subscription Plans

```bash
# Update seed script with Stripe Price IDs
npm run db:seed:plans
```

---

## 11. Monitor Your Application

### Grafana Dashboards

1. Open http://localhost:3100
2. Login: `admin` / `admin`
3. Go to Dashboards → "Crypto-ERP - Production Dashboard"
4. Monitor:
   - Request rate
   - Response time
   - Error rate
   - Active subscriptions
   - Revenue (MRR)

### Prometheus Alerts

1. Open http://localhost:9090/alerts
2. Verify all alerting rules are loaded
3. Configure Alertmanager for notifications (optional)

### Sentry Error Tracking

1. Create project at https://sentry.io
2. Copy DSN → Update `.env`: `SENTRY_DSN=https://...`
3. Restart API: `docker-compose restart api`

---

## 12. Test Automated Backups

```bash
# Run manual backup
docker-compose exec backup-scheduler /scripts/backup-database.sh

# Verify backup created
docker-compose exec backup-scheduler ls -lh /backups/

# Test restoration (⚠️ WARNING: will drop database!)
docker-compose exec backup-scheduler \
  /scripts/restore-database.sh /backups/crypto_erp_backup_*.sql.gz
```

---

## Common Issues & Solutions

### Issue: Database connection failed

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check connection string
echo $DATABASE_URL

# Reset database
docker-compose down -v
docker-compose up -d postgres
npm run db:migrate
```

### Issue: Redis connection failed

```bash
# Check Redis is running
docker-compose ps redis

# Test connection
redis-cli -h localhost -p 6379 ping
```

### Issue: API not starting

```bash
# Check logs
docker-compose logs api

# Common fixes:
npm run db:generate  # Regenerate Prisma client
npm run build        # Rebuild application
```

### Issue: Stripe webhook not working

```bash
# Use Stripe CLI for local testing
stripe listen --forward-to localhost:3000/payments/webhook

# Copy webhook secret and update .env
```

---

## Production Deployment

For production deployment, see:
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) - Full deployment guide
- [SCALING.md](docs/SCALING.md) - Scaling from 10 to 10,000+ users

**Key differences for production**:

1. Use managed services (AWS RDS, ElastiCache)
2. Enable SSL certificates (Let's Encrypt)
3. Configure Nginx reverse proxy
4. Enable S3 backups
5. Set up monitoring alerts
6. Use production Stripe keys
7. Enable security headers
8. Configure rate limiting

---

## Next Steps

### 1. Explore API Documentation

Open http://localhost:3000/api-docs to explore all endpoints.

### 2. Configure Verifactu (Spanish invoicing)

```bash
# Upload AEAT certificate
cp /path/to/certificate.p12 ./certs/

# Update .env
AEAT_CERTIFICATE_PATH=/app/certs/certificate.p12
AEAT_CERTIFICATE_PASSWORD=your-password
AEAT_ENVIRONMENT=test

# Restart API
docker-compose restart api
```

### 3. Test SII Submission

```bash
# Create invoice
INVOICE_ID=$(curl -X POST http://localhost:3000/invoices ... | jq -r '.id')

# Submit to SII
curl -X POST http://localhost:3000/fiscal/sii/submit-issued \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"invoiceIds\": [\"$INVOICE_ID\"]}"
```

### 4. Enable Background Jobs

```bash
# Check worker is processing jobs
docker-compose logs -f worker

# Monitor queue in Grafana
# Dashboard → "Queue Jobs Status"
```

---

## Support & Resources

- **Documentation**: [docs/](docs/)
- **API Reference**: http://localhost:3000/api-docs
- **GitHub Issues**: https://github.com/yourorg/crypto-erp/issues
- **Email**: support@crypto-erp.com

---

## Quick Reference

### Useful Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api worker

# Stop all services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build

# Run migrations
npm run db:migrate

# Run tests
npm run test

# Check health
curl http://localhost:3000/health

# View metrics
curl http://localhost:3000/metrics

# Create backup
docker-compose exec backup-scheduler /scripts/backup-database.sh
```

### Ports Reference

| Service | Port | URL |
|---------|------|-----|
| API | 3000 | http://localhost:3000 |
| Frontend | 5200 | http://localhost:5200 |
| PostgreSQL | 5432 | postgres://localhost:5432 |
| Redis | 6379 | redis://localhost:6379 |
| Prometheus | 9090 | http://localhost:9090 |
| Grafana | 3100 | http://localhost:3100 |
| Pushgateway | 9091 | http://localhost:9091 |

---

**Ready to launch! 🚀**

For questions or issues, check [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) or open an issue.
