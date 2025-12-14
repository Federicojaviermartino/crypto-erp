# Crypto-ERP - Scaling Guide

This guide covers scaling Crypto-ERP from 10 users to 10,000+ users with high availability and optimal performance.

## Table of Contents

- [Scaling Roadmap](#scaling-roadmap)
- [Architecture Evolution](#architecture-evolution)
- [Horizontal Scaling](#horizontal-scaling)
- [Database Optimization](#database-optimization)
- [Caching Strategies](#caching-strategies)
- [Queue Management](#queue-management)
- [Multi-Region Deployment](#multi-region-deployment)
- [Cost Optimization](#cost-optimization)
- [Monitoring Scaling Metrics](#monitoring-scaling-metrics)

---

## Scaling Roadmap

### Phase 1: Small Scale (10-100 users)

**Infrastructure**:
- 1 API server (2 CPU, 4GB RAM)
- 1 Worker (1 CPU, 2GB RAM)
- 1 PostgreSQL (2 CPU, 4GB RAM)
- 1 Redis (1 CPU, 1GB RAM)

**Capacity**:
- ~100 requests/second
- ~1,000 invoices/day
- 10 concurrent background jobs

**Cost**: ~$50-100/month

### Phase 2: Medium Scale (100-500 users)

**Infrastructure**:
- 3 API servers (2 CPU, 4GB RAM each)
- 2 Workers (2 CPU, 4GB RAM each)
- PostgreSQL with read replicas (4 CPU, 8GB RAM + 2x read replicas)
- Redis cluster (3 nodes)
- CDN for static assets

**Capacity**:
- ~500 requests/second
- ~10,000 invoices/day
- 50 concurrent background jobs

**Cost**: ~$300-500/month

### Phase 3: Large Scale (500-2,000 users)

**Infrastructure**:
- 6+ API servers (auto-scaled)
- 4+ Workers (auto-scaled by queue depth)
- PostgreSQL cluster (8 CPU, 16GB RAM + 4x read replicas)
- Redis cluster (6 nodes)
- CDN + Edge functions
- Dedicated search (Elasticsearch)

**Capacity**:
- ~2,000 requests/second
- ~50,000 invoices/day
- 200 concurrent background jobs

**Cost**: ~$1,000-2,000/month

### Phase 4: Enterprise Scale (2,000-10,000+ users)

**Infrastructure**:
- Multi-region deployment
- Kubernetes orchestration
- Database sharding
- Global CDN
- Dedicated caching layer
- Advanced monitoring

**Capacity**:
- ~10,000+ requests/second
- ~500,000+ invoices/day
- 1,000+ concurrent background jobs

**Cost**: $5,000-20,000/month

---

## Architecture Evolution

### Single Server → Distributed System

**Initial Architecture** (Phase 1):

```
┌────────────────────────────────────┐
│         Single Server              │
│  ┌────────┐  ┌────────┐           │
│  │  API   │  │ Worker │           │
│  │        │  │        │           │
│  └────────┘  └────────┘           │
│  ┌────────┐  ┌────────┐           │
│  │ Postgres│ │ Redis  │           │
│  └────────┘  └────────┘           │
└────────────────────────────────────┘
```

**Scaled Architecture** (Phase 3):

```
                ┌─────────────┐
                │ Load Balancer│
                │   + WAF      │
                └──────┬───────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
    ┌───▼───┐      ┌───▼───┐      ┌──▼────┐
    │ API-1 │      │ API-2 │      │ API-3 │
    └───┬───┘      └───┬───┘      └───┬───┘
        │              │              │
        └──────────────┼──────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
    ┌───▼────┐    ┌───▼────┐    ┌───▼────┐
    │Worker-1│    │Worker-2│    │Worker-3│
    └───┬────┘    └───┬────┘    └───┬────┘
        │             │             │
        └─────────────┼─────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
    ┌───▼────┐   ┌───▼────┐   ┌────▼─────┐
    │Postgres│   │ Redis  │   │Elasticsearch│
    │ Primary│   │Cluster │   │   (opt)   │
    └───┬────┘   └────────┘   └──────────┘
        │
    ┌───▼────┐
    │ Replica│
    │   x4   │
    └────────┘
```

---

## Horizontal Scaling

### API Server Scaling

**Docker Compose** (simple):

```bash
# Scale to 5 instances
docker-compose up -d --scale api=5
```

**Kubernetes** (production):

Create `kubernetes/api-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: crypto-erp-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: crypto-erp-api
  template:
    metadata:
      labels:
        app: crypto-erp-api
    spec:
      containers:
      - name: api
        image: crypto-erp/api:latest
        resources:
          requests:
            cpu: "500m"
            memory: "1Gi"
          limits:
            cpu: "2000m"
            memory: "4Gi"
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: crypto-erp-secrets
              key: database-url
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: crypto-erp-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: crypto-erp-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
      - type: Pods
        value: 4
        periodSeconds: 30
      selectPolicy: Max
```

### Worker Scaling

**Auto-scale based on queue depth**:

Create `kubernetes/worker-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: crypto-erp-worker
spec:
  replicas: 2
  selector:
    matchLabels:
      app: crypto-erp-worker
  template:
    metadata:
      labels:
        app: crypto-erp-worker
    spec:
      containers:
      - name: worker
        image: crypto-erp/worker:latest
        resources:
          requests:
            cpu: "1000m"
            memory: "2Gi"
          limits:
            cpu: "2000m"
            memory: "4Gi"
        env:
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: crypto-erp-secrets
              key: redis-url

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: crypto-erp-worker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: crypto-erp-worker
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: External
    external:
      metric:
        name: redis_queue_depth
        selector:
          matchLabels:
            queue: "blockchain-sync"
      target:
        type: AverageValue
        averageValue: "100"  # Scale up when queue > 100 jobs per worker
```

### Load Balancer Configuration

**Nginx** (manual):

Create `nginx/nginx.conf`:

```nginx
upstream api_backend {
    least_conn;  # Least connections algorithm

    server api-1:3000 max_fails=3 fail_timeout=30s;
    server api-2:3000 max_fails=3 fail_timeout=30s;
    server api-3:3000 max_fails=3 fail_timeout=30s;

    keepalive 32;
}

server {
    listen 80;
    listen 443 ssl http2;
    server_name api.crypto-erp.com;

    ssl_certificate /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
    limit_req zone=api_limit burst=200 nodelay;

    # Connection limiting
    limit_conn_zone $binary_remote_addr zone=addr:10m;
    limit_conn addr 20;

    location / {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint (bypass rate limiting)
    location /health {
        limit_req off;
        proxy_pass http://api_backend;
    }

    # Metrics endpoint (internal only)
    location /metrics {
        allow 10.0.0.0/8;
        deny all;
        proxy_pass http://api_backend;
    }
}
```

---

## Database Optimization

### Read Replicas

**Setup PostgreSQL replication**:

```yaml
# docker-compose.yml
services:
  postgres-primary:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    command: >
      postgres
      -c wal_level=replica
      -c max_wal_senders=3
      -c max_replication_slots=3

  postgres-replica-1:
    image: postgres:15
    environment:
      PGUSER: replicator
      PGPASSWORD: ${REPLICATION_PASSWORD}
    command: >
      postgres
      -c hot_standby=on
    depends_on:
      - postgres-primary

  postgres-replica-2:
    image: postgres:15
    environment:
      PGUSER: replicator
      PGPASSWORD: ${REPLICATION_PASSWORD}
    command: >
      postgres
      -c hot_standby=on
    depends_on:
      - postgres-primary
```

**Route read queries to replicas** (Prisma):

```typescript
// libs/database/src/prisma.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readReplicas: PrismaClient[] = [];

  async onModuleInit() {
    await this.$connect();

    // Initialize read replicas
    const replicaUrls = [
      process.env.DATABASE_REPLICA_1_URL,
      process.env.DATABASE_REPLICA_2_URL,
      process.env.DATABASE_REPLICA_3_URL,
      process.env.DATABASE_REPLICA_4_URL,
    ].filter(Boolean);

    this.readReplicas = replicaUrls.map(url =>
      new PrismaClient({ datasources: { db: { url } } })
    );

    await Promise.all(this.readReplicas.map(replica => replica.$connect()));
  }

  /**
   * Get a read replica for read-only queries
   */
  getReadReplica(): PrismaClient {
    if (this.readReplicas.length === 0) {
      return this; // Fallback to primary
    }

    // Round-robin selection
    const index = Math.floor(Math.random() * this.readReplicas.length);
    return this.readReplicas[index];
  }
}

// Usage in service
@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string): Promise<Invoice[]> {
    // Use read replica for read-only query
    return this.prisma.getReadReplica().invoice.findMany({
      where: { companyId },
      orderBy: { issueDate: 'desc' },
      take: 100,
    });
  }

  async create(data: CreateInvoiceDto): Promise<Invoice> {
    // Use primary for writes
    return this.prisma.invoice.create({ data });
  }
}
```

### Connection Pooling

**Use PgBouncer**:

```yaml
# docker-compose.yml
services:
  pgbouncer:
    image: pgbouncer/pgbouncer:latest
    environment:
      DATABASES_HOST: postgres-primary
      DATABASES_PORT: 5432
      DATABASES_DATABASE: crypto_erp
      DATABASES_USER: postgres
      DATABASES_PASSWORD: ${DB_PASSWORD}
      PGBOUNCER_POOL_MODE: transaction
      PGBOUNCER_MAX_CLIENT_CONN: 1000
      PGBOUNCER_DEFAULT_POOL_SIZE: 25
      PGBOUNCER_MIN_POOL_SIZE: 5
    ports:
      - "6432:6432"
```

**Update DATABASE_URL**:

```bash
# Use PgBouncer instead of direct connection
DATABASE_URL="postgresql://postgres:password@pgbouncer:6432/crypto_erp"
```

### Database Sharding

**Shard by company** (for 10,000+ companies):

```typescript
// Get shard number for company
function getShardNumber(companyId: string): number {
  const hash = createHash('md5').update(companyId).digest('hex');
  const numericHash = parseInt(hash.substring(0, 8), 16);
  return numericHash % NUM_SHARDS;
}

// Route to correct shard
class ShardedPrismaService {
  private shards: PrismaClient[] = [];

  constructor() {
    for (let i = 0; i < NUM_SHARDS; i++) {
      const url = process.env[`DATABASE_SHARD_${i}_URL`];
      this.shards[i] = new PrismaClient({ datasources: { db: { url } } });
    }
  }

  getShard(companyId: string): PrismaClient {
    const shardNum = getShardNumber(companyId);
    return this.shards[shardNum];
  }
}

// Usage
async findInvoices(companyId: string) {
  const shard = this.shardedPrisma.getShard(companyId);
  return shard.invoice.findMany({ where: { companyId } });
}
```

---

## Caching Strategies

### Application-Level Caching

**Redis caching for expensive queries**:

```typescript
// common/decorators/cache.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY_METADATA = 'cache:key';
export const CACHE_TTL_METADATA = 'cache:ttl';

export const CacheKey = (key: string) => SetMetadata(CACHE_KEY_METADATA, key);
export const CacheTTL = (ttl: number) => SetMetadata(CACHE_TTL_METADATA, ttl);

// common/interceptors/cache.interceptor.ts
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private redis: Redis,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const cacheKey = this.reflector.get<string>(CACHE_KEY_METADATA, context.getHandler());
    const cacheTTL = this.reflector.get<number>(CACHE_TTL_METADATA, context.getHandler());

    if (!cacheKey) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const fullCacheKey = `${cacheKey}:${request.user?.id}:${JSON.stringify(request.query)}`;

    // Check cache
    const cached = await this.redis.get(fullCacheKey);
    if (cached) {
      return of(JSON.parse(cached));
    }

    // Execute and cache result
    return next.handle().pipe(
      tap(async (data) => {
        await this.redis.set(fullCacheKey, JSON.stringify(data), 'EX', cacheTTL || 300);
      }),
    );
  }
}

// Usage
@Controller('invoices')
export class InvoicesController {
  @Get()
  @CacheKey('invoices:list')
  @CacheTTL(300)  // 5 minutes
  async listInvoices(@GetCompany() companyId: string, @Query() query: any) {
    return this.invoices.findAll(companyId, query);
  }
}
```

### CDN for Static Assets

**CloudFlare Worker** for edge caching:

```javascript
// cloudflare-worker.js
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const cache = caches.default
  let response = await cache.match(request)

  if (!response) {
    response = await fetch(request)

    // Cache static assets for 1 year
    if (request.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$/)) {
      const headers = new Headers(response.headers)
      headers.set('Cache-Control', 'public, max-age=31536000, immutable')
      response = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
      event.waitUntil(cache.put(request, response.clone()))
    }
  }

  return response
}
```

---

## Queue Management

### Queue Optimization

**Prioritize critical jobs**:

```typescript
// Add invoice creation (high priority)
await this.invoiceQueue.add('create-invoice', data, {
  priority: 10,  // Higher priority
  attempts: 5,
  backoff: { type: 'exponential', delay: 2000 },
});

// Blockchain sync (low priority, can be delayed)
await this.blockchainQueue.add('sync-transactions', data, {
  priority: 1,   // Lower priority
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
});
```

**Rate-limited queues** (for external APIs):

```typescript
@Processor('price-update', {
  concurrency: 5,
  limiter: {
    max: 10,      // Max 10 jobs
    duration: 1000 // per second
  }
})
export class PriceUpdateProcessor {
  @Process('fetch-price')
  async fetchPrice(job: Job) {
    // CoinGecko API has rate limit: 10-50 req/min
    const price = await this.priceService.fetchPrice(job.data.symbol);
    return price;
  }
}
```

---

## Multi-Region Deployment

### Global Architecture

```
         ┌───────────────────┐
         │  Global CDN       │
         │  (CloudFlare)     │
         └─────────┬─────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
   ┌────▼────┐ ┌──▼─────┐ ┌──▼─────┐
   │ US-East │ │ EU-West│ │ APAC   │
   │         │ │        │ │        │
   │ API x3  │ │ API x3 │ │ API x2 │
   │ Worker  │ │ Worker │ │ Worker │
   │         │ │        │ │        │
   │ Postgres│ │Postgres│ │Postgres│
   │ Primary │ │ Replica│ │ Replica│
   └─────────┘ └────────┘ └────────┘
        │          │          │
        └──────────┼──────────┘
                   │
          ┌────────▼─────────┐
          │ Global Database  │
          │  (AWS Aurora)    │
          │  Multi-Master    │
          └──────────────────┘
```

### Route Users to Nearest Region

**GeoDNS** (Route53):

```terraform
# terraform/route53.tf
resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.crypto-erp.com"
  type    = "A"

  geolocation_routing_policy {
    continent = "EU"
  }

  alias {
    name                   = aws_lb.eu_west.dns_name
    zone_id                = aws_lb.eu_west.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "api_us" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.crypto-erp.com"
  type    = "A"

  geolocation_routing_policy {
    continent = "NA"
  }

  alias {
    name                   = aws_lb.us_east.dns_name
    zone_id                = aws_lb.us_east.zone_id
    evaluate_target_health = true
  }
}
```

---

## Cost Optimization

### Right-Sizing

**Monitor resource utilization** and adjust:

```bash
# Check actual CPU/memory usage over 7 days
kubectl top pods --sort-by=cpu -n crypto-erp | head -20
kubectl top pods --sort-by=memory -n crypto-erp | head -20

# Adjust resource limits accordingly
```

### Auto-Scaling Schedules

**Scale down during off-hours**:

```yaml
# kubernetes/api-schedule-scaler.yaml
apiVersion: autoscaling/v1
kind: Schedule
metadata:
  name: scale-down-nights
spec:
  schedule: "0 22 * * *"  # 10 PM daily
  replicas: 2
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: crypto-erp-api

---
apiVersion: autoscaling/v1
kind: Schedule
metadata:
  name: scale-up-mornings
spec:
  schedule: "0 7 * * *"  # 7 AM daily
  replicas: 5
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: crypto-erp-api
```

### Spot Instances

**Use spot instances for workers** (cost savings up to 90%):

```yaml
# kubernetes/worker-deployment.yaml
spec:
  template:
    spec:
      nodeSelector:
        node-type: spot
      tolerations:
      - key: "spot"
        operator: "Equal"
        value: "true"
        effect: "NoSchedule"
```

---

## Monitoring Scaling Metrics

### Key Metrics to Track

**Request Throughput**:
```promql
rate(crypto_erp_http_requests_total[5m])
```

**Response Time Percentiles**:
```promql
histogram_quantile(0.95, rate(crypto_erp_http_request_duration_seconds_bucket[5m]))
histogram_quantile(0.99, rate(crypto_erp_http_request_duration_seconds_bucket[5m]))
```

**Database Connection Pool**:
```promql
crypto_erp_db_connections_active / crypto_erp_db_connections_max
```

**Queue Depth**:
```promql
crypto_erp_queue_jobs_active{queue="blockchain-sync"}
```

**Auto-Scaling Events**:
```promql
kube_hpa_status_current_replicas{hpa="crypto-erp-api-hpa"}
kube_hpa_status_desired_replicas{hpa="crypto-erp-api-hpa"}
```

---

**Last Updated**: 2025-01-08
**Version**: 1.0.0
