# Phase 4A - Advanced Analytics Dashboard Setup Guide

This guide covers the implementation and setup of the Advanced Analytics Dashboard with TimescaleDB, real-time metrics, and custom reports.

---

## Prerequisites

- Docker and Docker Compose
- Node.js 18+
- PostgreSQL 15 with TimescaleDB extension

---

## 1. Install Required Dependencies

### WebSocket Support (Required for Real-Time Metrics)

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```

### PDF Generation (Required for Reports)

```bash
npm install pdfmake
npm install --save-dev @types/pdfmake
```

---

## 2. Database Setup

### Run TimescaleDB Migration

The TimescaleDB migration creates hypertables, continuous aggregates, and compression policies.

```bash
# Apply analytics migration
psql -U crypto_erp_user -d crypto_erp -f libs/database/prisma/migrations/20251220_analytics_timescaledb.sql
```

### Verify TimescaleDB Extension

```sql
-- Connect to database
psql -U crypto_erp_user -d crypto_erp

-- Check TimescaleDB version
SELECT extversion FROM pg_extension WHERE extname = 'timescaledb';

-- List hypertables
SELECT * FROM timescaledb_information.hypertables;

-- Check continuous aggregates
SELECT * FROM timescaledb_information.continuous_aggregates;
```

---

## 3. Docker Compose Configuration

The TimescaleDB image replaces the standard PostgreSQL image:

```yaml
postgres:
  image: timescale/timescaledb:latest-pg15
  environment:
    TIMESCALEDB_TELEMETRY: "off"
  # ... rest of configuration
```

### Restart Services

```bash
# Rebuild with TimescaleDB image
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d postgres

# Verify TimescaleDB is running
docker exec crypto-erp-postgres psql -U crypto_erp_user -c "SELECT extversion FROM pg_extension WHERE extname = 'timescaledb';"
```

---

## 4. Generate Prisma Client

After adding the AnalyticsEvent model, regenerate the Prisma client:

```bash
npm run db:generate
```

---

## 5. Configure Analytics Worker

The analytics aggregation worker runs scheduled jobs to pre-compute metrics.

### Register Worker Processor

Add to `apps/worker/src/worker.module.ts`:

```typescript
import { AnalyticsAggregationProcessor } from './processors/analytics-aggregation.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'analytics-aggregation',
    }),
  ],
  providers: [
    // ... other processors
    AnalyticsAggregationProcessor,
  ],
})
export class WorkerModule {}
```

### Schedule Aggregation Jobs

Add to `apps/api/src/app.module.ts` or create a dedicated scheduler:

```typescript
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class AnalyticsScheduler {
  constructor(
    @InjectQueue('analytics-aggregation') private analyticsQueue: Queue,
  ) {}

  // Run hourly aggregation every hour
  @Cron(CronExpression.EVERY_HOUR)
  async scheduleHourlyAggregation() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    await this.analyticsQueue.add('aggregate', {
      type: 'hourly',
      startDate: oneHourAgo,
      endDate: now,
    });
  }

  // Run daily aggregation at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async scheduleDailyAggregation() {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    await this.analyticsQueue.add('aggregate', {
      type: 'daily',
      startDate: yesterday,
      endDate: now,
    });
  }

  // Run monthly aggregation on 1st of each month
  @Cron('0 1 1 * *')
  async scheduleMonthlyAggregation() {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    await this.analyticsQueue.add('aggregate', {
      type: 'monthly',
      startDate: lastMonth,
      endDate: lastMonthEnd,
    });
  }
}
```

---

## 6. API Endpoints

### Revenue Analytics

```bash
# Get current month revenue metrics
GET /analytics/revenue

# Get specific period
GET /analytics/revenue?startDate=2025-01-01&endDate=2025-12-31
```

Response:
```json
{
  "mrr": 2500.00,
  "arr": 30000.00,
  "totalRevenue": 15000.00,
  "averageRevenuePerUser": 150.00,
  "revenueGrowth": 15.5,
  "currency": "EUR"
}
```

### User Analytics

```bash
GET /analytics/users?startDate=2025-01-01&endDate=2025-12-31
```

Response:
```json
{
  "totalUsers": 100,
  "activeUsers": 85,
  "newUsers": 15,
  "churnedUsers": 5,
  "churnRate": 5.0,
  "activeUserRate": 85.0
}
```

---

## 7. Recording Analytics Events

### Automatic Event Recording

Events are automatically recorded for:
- Invoice creation
- Payment received
- User login
- Crypto transactions
- Subscription changes

### Manual Event Recording

```typescript
import { AnalyticsService } from './modules/analytics/analytics.service';

// In your service
constructor(private analyticsService: AnalyticsService) {}

// Record custom event
await this.analyticsService.recordEvent(
  companyId,
  userId,
  'feature.used',
  'user_activity',
  1, // value (optional)
  'EUR', // currency (optional)
  { feature: 'export', format: 'pdf' } // metadata (optional)
);
```

---

## 8. Querying TimescaleDB

### Raw Queries

```sql
-- Get hourly revenue for last 24 hours
SELECT
  time_bucket('1 hour', timestamp) AS hour,
  SUM(value) AS revenue
FROM analytics_events
WHERE category = 'revenue'
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- Get top events by volume
SELECT
  event_type,
  COUNT(*) AS event_count,
  SUM(value) AS total_value
FROM analytics_events
WHERE company_id = 'your-company-id'
  AND timestamp > NOW() - INTERVAL '30 days'
GROUP BY event_type
ORDER BY event_count DESC
LIMIT 10;

-- Use continuous aggregates for faster queries
SELECT * FROM analytics_revenue_hourly
WHERE company_id = 'your-company-id'
  AND bucket > NOW() - INTERVAL '7 days'
ORDER BY bucket DESC;
```

---

## 9. Performance Optimization

### Compression Policy

TimescaleDB automatically compresses data older than 30 days:

```sql
-- Check compression stats
SELECT * FROM timescaledb_information.compression_settings;

-- Manual compression (if needed)
SELECT compress_chunk(i) FROM show_chunks('analytics_events', older_than => INTERVAL '30 days') i;
```

### Retention Policy

Old data is automatically deleted after 2 years:

```sql
-- Check retention policy
SELECT * FROM timescaledb_information.jobs WHERE proc_name = 'policy_retention';

-- Modify retention period
SELECT remove_retention_policy('analytics_events');
SELECT add_retention_policy('analytics_events', INTERVAL '1 year');
```

### Refresh Continuous Aggregates

```sql
-- Manual refresh (normally automatic)
CALL refresh_continuous_aggregate('analytics_revenue_hourly', NULL, NULL);
CALL refresh_continuous_aggregate('analytics_user_activity_daily', NULL, NULL);
CALL refresh_continuous_aggregate('analytics_crypto_daily', NULL, NULL);
```

---

## 10. Monitoring

### Check Hypertable Size

```sql
SELECT
  hypertable_name,
  pg_size_pretty(hypertable_size(format('%I.%I', hypertable_schema, hypertable_name)::regclass)) AS size
FROM timescaledb_information.hypertables;
```

### Check Chunk Information

```sql
SELECT
  chunk_name,
  range_start,
  range_end,
  pg_size_pretty(chunk_size) AS size
FROM timescaledb_information.chunks
WHERE hypertable_name = 'analytics_events'
ORDER BY range_start DESC
LIMIT 20;
```

### Query Performance

```sql
-- Enable query timing
\timing

-- Analyze query plan
EXPLAIN ANALYZE
SELECT * FROM analytics_events
WHERE company_id = 'your-company-id'
  AND timestamp > NOW() - INTERVAL '7 days';
```

---

## 11. Troubleshooting

### Issue: TimescaleDB extension not found

```sql
-- Install extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- If error persists, check PostgreSQL version
SELECT version();
-- Must be PostgreSQL 15+
```

### Issue: Continuous aggregates not refreshing

```sql
-- Check refresh policies
SELECT * FROM timescaledb_information.jobs
WHERE proc_name LIKE '%continuous_aggregate%';

-- Manually refresh
CALL refresh_continuous_aggregate('analytics_revenue_hourly', NULL, NULL);
```

### Issue: High memory usage

```sql
-- Check shared buffers and work_mem
SHOW shared_buffers;
SHOW work_mem;

-- Adjust in postgresql.conf or docker-compose
shared_buffers = 256MB
work_mem = 64MB
```

---

## 12. Backup and Restore

### Backup with TimescaleDB

```bash
# Backup including TimescaleDB metadata
pg_dump -U crypto_erp_user -Fc crypto_erp > backup_$(date +%Y%m%d).dump

# Backup only analytics_events hypertable
pg_dump -U crypto_erp_user -t analytics_events crypto_erp > analytics_backup.sql
```

### Restore

```bash
# Restore full database
pg_restore -U crypto_erp_user -d crypto_erp backup_20251220.dump

# Restore specific table
psql -U crypto_erp_user -d crypto_erp < analytics_backup.sql
```

---

## 13. Security

### Restrict Access to Analytics

```sql
-- Create read-only role for analytics
CREATE ROLE analytics_reader WITH LOGIN PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE crypto_erp TO analytics_reader;
GRANT USAGE ON SCHEMA public TO analytics_reader;
GRANT SELECT ON analytics_events TO analytics_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA timescaledb_information TO analytics_reader;
```

---

## 14. Next Steps

- [ ] Install WebSocket dependencies for real-time metrics
- [ ] Implement custom report generation
- [ ] Set up Grafana dashboards for analytics visualization
- [ ] Configure email delivery for scheduled reports
- [ ] Implement alert thresholds for key metrics

---

**Last Updated**: December 20, 2025
**Phase**: 4A - Advanced Analytics Dashboard
**Status**: In Progress
