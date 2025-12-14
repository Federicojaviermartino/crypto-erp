# Crypto-ERP - Production Deployment Guide

This guide covers deploying Crypto-ERP to production with high availability, monitoring, and automated backups.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Architecture Overview](#architecture-overview)
- [Environment Setup](#environment-setup)
- [Deployment Steps](#deployment-steps)
- [Monitoring & Alerts](#monitoring--alerts)
- [Backup & Recovery](#backup--recovery)
- [Scaling](#scaling)
- [Security Hardening](#security-hardening)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Services

- **Docker** 24.0+ with Docker Compose v2
- **PostgreSQL** 15+ with pgvector extension
- **Redis** 7+
- **Node.js** 20+ (for building)
- **SSL Certificate** (Let's Encrypt recommended)

### External Services

- **Stripe** account (for payments)
- **Resend** or **SendGrid** (for emails)
- **Sentry** (for error tracking)
- **AWS S3** (optional, for backups)
- **Anthropic/OpenAI** API keys (for AI features)

### Server Requirements

**Minimum** (for 10-50 users):
- 2 CPU cores
- 4 GB RAM
- 50 GB SSD
- 100 Mbps network

**Recommended** (for 100-500 users):
- 4 CPU cores
- 8 GB RAM
- 200 GB SSD
- 1 Gbps network

**Enterprise** (for 1000+ users):
- 8+ CPU cores
- 16+ GB RAM
- 500+ GB SSD
- 10 Gbps network
- Multi-region setup

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       Load Balancer (Nginx)                 │
│                  SSL Termination + Rate Limiting             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   API (x3)   │  │ Worker (x2)  │  │  Frontend    │      │
│  │   NestJS     │  │   BullMQ     │  │    Next.js   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        Data Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │    Redis     │  │   S3 (opt)   │      │
│  │  + pgvector  │  │   (Queues)   │  │   (Backups)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Monitoring Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Prometheus  │  │   Grafana    │  │    Sentry    │      │
│  │  (Metrics)   │  │ (Dashboards) │  │   (Errors)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/yourorg/crypto-erp.git
cd crypto-erp
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with production values
nano .env
```

**Critical variables** to set:

```bash
# Application
NODE_ENV=production
API_URL=https://api.crypto-erp.com
WEB_URL=https://app.crypto-erp.com

# Database (use managed service recommended)
DATABASE_URL="postgresql://user:password@db.internal:5432/crypto_erp?schema=public"

# Redis (use managed service recommended)
REDIS_URL="redis://redis.internal:6379"

# JWT (generate secure random strings)
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (Resend)
RESEND_API_KEY=re_...
EMAIL_FROM=Crypto-ERP <noreply@crypto-erp.com>

# AI
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Error Tracking
SENTRY_DSN=https://...@sentry.io/...

# Backups
S3_ENABLED=true
S3_BUCKET=crypto-erp-backups
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

### 3. SSL Certificates

**Option A: Let's Encrypt** (recommended for production)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --nginx -d api.crypto-erp.com -d app.crypto-erp.com
```

**Option B: Manual Certificate**

Place certificate files in `./certs/`:
- `fullchain.pem`
- `privkey.pem`

---

## Deployment Steps

### 1. Build Application

```bash
# Install dependencies
npm ci --production=false

# Generate Prisma client
npm run db:generate

# Build all applications
npm run build
```

### 2. Database Migration

```bash
# Run migrations
npm run db:migrate

# Seed initial data (subscription plans, etc.)
npm run db:seed
```

### 3. Start Services with Docker Compose

**Production Stack** (all services):

```bash
docker-compose \
  -f docker-compose.yml \
  -f docker-compose.monitoring.yml \
  -f docker-compose.backups.yml \
  up -d
```

**Individual service control**:

```bash
# API only
docker-compose up -d api

# Workers only
docker-compose up -d worker

# Monitoring only
docker-compose -f docker-compose.monitoring.yml up -d

# Backups only
docker-compose -f docker-compose.backups.yml up -d
```

### 4. Verify Deployment

```bash
# Check all services are running
docker-compose ps

# Check API health
curl https://api.crypto-erp.com/health

# Check logs
docker-compose logs -f api worker

# Verify database connection
docker-compose exec api npm run db:status

# Test backup system
docker-compose exec backup-scheduler /scripts/backup-database.sh
```

---

## Monitoring & Alerts

### Access Dashboards

- **Grafana**: https://monitoring.crypto-erp.com:3100
  - Default credentials: `admin` / `$GRAFANA_ADMIN_PASSWORD`
  - Main dashboard: "Crypto-ERP - Production Dashboard"

- **Prometheus**: https://monitoring.crypto-erp.com:9090
  - Targets: https://monitoring.crypto-erp.com:9090/targets
  - Alerts: https://monitoring.crypto-erp.com:9090/alerts

- **Sentry**: https://sentry.io/organizations/your-org/projects/crypto-erp/

### Key Metrics to Monitor

**Application Health**:
- Request rate: `rate(crypto_erp_http_requests_total[5m])`
- Error rate: `rate(crypto_erp_http_requests_total{status_code=~"5.."}[5m])`
- Response time p95: `histogram_quantile(0.95, rate(crypto_erp_http_request_duration_seconds_bucket[5m]))`

**Database**:
- Query duration p95: `histogram_quantile(0.95, rate(crypto_erp_db_query_duration_seconds_bucket[5m]))`
- Active connections: `crypto_erp_db_connections_active`

**Business Metrics**:
- Active subscriptions: `crypto_erp_subscriptions_active`
- Monthly Recurring Revenue: `crypto_erp_revenue_mrr`
- Invoices created: `rate(crypto_erp_invoices_created_total[1h])`

**Backups**:
- Last successful backup: `time() - crypto_erp_backup_last_success_timestamp`
- Backup success rate: `sum(crypto_erp_backup_total{status="success"}) / sum(crypto_erp_backup_total)`

### Alert Notifications

**Slack Integration**:

```bash
# Add Slack webhook URL to environment
BACKUP_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

**Email Alerts** (via Alertmanager):

Create `monitoring/alertmanager.yml`:

```yaml
route:
  receiver: 'email-alerts'
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

receivers:
  - name: 'email-alerts'
    email_configs:
      - to: 'ops@crypto-erp.com'
        from: 'alerts@crypto-erp.com'
        smarthost: smtp.sendgrid.net:587
        auth_username: 'apikey'
        auth_password: '$SENDGRID_API_KEY'
```

---

## Backup & Recovery

### Automated Daily Backups

Backups run automatically at **2:00 AM daily** via cron scheduler.

**Configuration**:

```bash
# Backup schedule (cron format)
BACKUP_SCHEDULE=0 2 * * *

# Retention policy
BACKUP_RETENTION_DAYS=7      # Keep daily backups for 7 days
BACKUP_RETENTION_WEEKS=4     # Keep weekly backups for 4 weeks
BACKUP_RETENTION_MONTHS=12   # Keep monthly backups for 12 months
```

### Manual Backup

```bash
# Create backup
docker-compose exec backup-scheduler /scripts/backup-database.sh

# List backups
ls -lh backups/

# Upload to S3 manually
aws s3 cp backups/crypto_erp_backup_20250115_120000.sql.gz \
  s3://crypto-erp-backups/backups/database/
```

### Restore from Backup

**⚠️ WARNING**: Restoration will **DROP the current database**!

```bash
# Download from S3
docker-compose exec backup-scheduler \
  /scripts/restore-database.sh crypto_erp_backup_20250115_120000.sql.gz --from-s3

# Or restore from local file
docker-compose exec backup-scheduler \
  /scripts/restore-database.sh /backups/crypto_erp_backup_20250115_120000.sql.gz
```

**Manual Restoration** (if scripts fail):

```bash
# 1. Stop all services
docker-compose stop api worker

# 2. Drop and recreate database
docker-compose exec postgres psql -U postgres -c "DROP DATABASE crypto_erp;"
docker-compose exec postgres psql -U postgres -c "CREATE DATABASE crypto_erp;"

# 3. Restore from backup
gunzip -c backups/crypto_erp_backup_20250115_120000.sql.gz | \
  docker-compose exec -T postgres psql -U postgres -d crypto_erp

# 4. Run migrations (if needed)
npm run db:migrate

# 5. Restart services
docker-compose start api worker
```

### Disaster Recovery Checklist

1. ✅ **Identify Issue**: Check Grafana alerts and Sentry errors
2. ✅ **Stop Traffic**: Put maintenance page or disable routes
3. ✅ **Assess Data Loss**: Determine last good backup
4. ✅ **Restore Database**: Follow restoration procedure above
5. ✅ **Verify Data**: Run smoke tests on critical workflows
6. ✅ **Resume Traffic**: Remove maintenance page
7. ✅ **Post-Mortem**: Document what happened and prevent recurrence

---

## Scaling

### Horizontal Scaling (Recommended)

**Scale API instances**:

```bash
# Scale to 3 API instances
docker-compose up -d --scale api=3

# Verify load balancing
docker-compose ps api
```

**Update Nginx upstream** (`nginx/nginx.conf`):

```nginx
upstream api_backend {
    least_conn;  # Load balancing algorithm
    server api-1:3000;
    server api-2:3000;
    server api-3:3000;
}
```

**Scale Workers**:

```bash
# Scale to 2 worker instances
docker-compose up -d --scale worker=2
```

**Auto-scaling with Kubernetes** (advanced):

See [kubernetes/deployment.yaml](../kubernetes/deployment.yaml) for K8s manifests.

### Vertical Scaling

**Increase container resources** (`docker-compose.yml`):

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
```

**Database scaling**:

- Use managed PostgreSQL (AWS RDS, Google Cloud SQL, Azure Database)
- Enable read replicas for analytics queries
- Implement connection pooling with PgBouncer

**Redis scaling**:

- Use Redis Cluster for multi-node setup
- Separate queues into dedicated Redis instances

### Performance Optimization

**1. Enable CDN** (for frontend):

```bash
# CloudFlare, Fastly, or AWS CloudFront
# Cache static assets for 1 year
Cache-Control: public, max-age=31536000, immutable
```

**2. Database Query Optimization**:

```sql
-- Add indexes for common queries
CREATE INDEX idx_invoices_company_date ON "Invoice" ("companyId", "issueDate" DESC);
CREATE INDEX idx_transactions_wallet_date ON "CryptoTransaction" ("walletId", "timestamp" DESC);
CREATE INDEX idx_subscriptions_status ON "Subscription" ("status") WHERE status = 'ACTIVE';
```

**3. API Response Caching**:

```typescript
// Cache GET requests for 5 minutes
@CacheKey('invoices:list')
@CacheTTL(300)
@Get()
async listInvoices(@GetCompany() companyId: string) {
  return this.invoices.findAll(companyId);
}
```

**4. Background Job Optimization**:

```typescript
// Increase queue concurrency
@Processor('blockchain-sync', { concurrency: 10 })
export class BlockchainSyncProcessor { /* ... */ }
```

---

## Security Hardening

### 1. Network Security

**Firewall rules**:

```bash
# Allow only necessary ports
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (redirect to HTTPS)
ufw allow 443/tcp   # HTTPS
ufw enable
```

**Internal services** (PostgreSQL, Redis) should NOT be exposed to public internet.

### 2. Docker Security

```bash
# Run containers as non-root user
USER node

# Read-only root filesystem
read_only: true

# Drop unnecessary capabilities
cap_drop:
  - ALL
cap_add:
  - NET_BIND_SERVICE
```

### 3. Database Security

```sql
-- Create dedicated database user with limited permissions
CREATE USER crypto_erp_app WITH PASSWORD 'strong-password';
GRANT CONNECT ON DATABASE crypto_erp TO crypto_erp_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO crypto_erp_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO crypto_erp_app;

-- Revoke public schema permissions
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
```

### 4. Secret Management

**Use environment variables** (never hardcode):

```bash
# AWS Secrets Manager
aws secretsmanager create-secret \
  --name crypto-erp/production \
  --secret-string file://secrets.json

# Inject at runtime
export DATABASE_URL=$(aws secretsmanager get-secret-value \
  --secret-id crypto-erp/production \
  --query SecretString --output text | jq -r .DATABASE_URL)
```

**Or use Vault**:

```bash
# HashiCorp Vault
vault kv put secret/crypto-erp/production \
  database_url="postgresql://..." \
  jwt_secret="..." \
  stripe_key="..."
```

### 5. Rate Limiting

Configured in [app.module.ts](../apps/api/src/app.module.ts):

```typescript
ThrottlerModule.forRoot([
  { name: 'short', ttl: 1000, limit: 10 },   // 10 req/sec
  { name: 'medium', ttl: 10000, limit: 50 }, // 50 req/10sec
  { name: 'long', ttl: 60000, limit: 100 },  // 100 req/min
])
```

### 6. Security Headers

Added via Helmet middleware:

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));
```

---

## Troubleshooting

### Common Issues

**1. API not responding**

```bash
# Check if container is running
docker-compose ps api

# Check logs
docker-compose logs --tail=100 api

# Restart service
docker-compose restart api
```

**2. Database connection errors**

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Test connection
docker-compose exec api npm run db:status

# Check connection pool
docker-compose logs postgres | grep "connection"
```

**3. Queue jobs not processing**

```bash
# Check worker status
docker-compose ps worker

# Check Redis connection
docker-compose exec redis redis-cli ping

# View queue stats
docker-compose exec api npm run queue:stats
```

**4. High memory usage**

```bash
# Check container resource usage
docker stats

# Increase Node.js heap size
NODE_OPTIONS="--max-old-space-size=4096"
```

**5. Backup failures**

```bash
# Check backup logs
docker-compose logs backup-scheduler

# Verify PostgreSQL connectivity
docker-compose exec backup-scheduler pg_isready -h postgres

# Check S3 credentials
docker-compose exec backup-scheduler aws s3 ls s3://crypto-erp-backups/
```

### Performance Debugging

**1. Slow API responses**

```bash
# Enable query logging
PRISMA_LOG_QUERIES=true

# Check slow queries in Grafana
# Dashboard -> "Database Query Duration (p95)"

# Analyze with EXPLAIN
docker-compose exec postgres psql -U postgres crypto_erp
EXPLAIN ANALYZE SELECT * FROM "Invoice" WHERE "companyId" = '...';
```

**2. High error rate**

```bash
# Check Sentry for error details
# https://sentry.io/organizations/your-org/issues/

# Check Prometheus for error breakdown
rate(crypto_erp_http_requests_total{status_code=~"5.."}[5m])

# Review recent code changes
git log --since="1 day ago" --oneline
```

### Rollback Procedure

**1. Code rollback**:

```bash
# Revert to previous Docker image
docker-compose down
docker-compose pull api:previous-tag
docker-compose up -d

# Or rebuild from previous commit
git checkout <previous-commit>
npm run build
docker-compose up -d --build
```

**2. Database rollback**:

```bash
# Revert last migration
npm run db:migrate:down

# Or restore from backup (see Backup & Recovery section)
```

---

## Additional Resources

- [API Documentation](./API.md)
- [Database Schema](./DATABASE.md)
- [Contributing Guide](./CONTRIBUTING.md)
- [Security Policy](./SECURITY.md)

---

## Support

For production issues:
- **Email**: ops@crypto-erp.com
- **Slack**: #crypto-erp-production
- **On-call**: PagerDuty integration available

---

**Last Updated**: 2025-01-08
**Version**: 1.0.0
