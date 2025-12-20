-- Migration: Add TimescaleDB extension and analytics events
-- Created: 2025-12-20
-- Description: Sets up TimescaleDB for time-series analytics and creates hypertable

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    value DECIMAL(20, 8),
    currency VARCHAR(3),
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Convert to TimescaleDB hypertable (partitioned by time)
-- Chunk interval: 7 days (optimized for analytics queries)
SELECT create_hypertable(
    'analytics_events',
    'timestamp',
    chunk_time_interval => INTERVAL '7 days',
    if_not_exists => TRUE
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_analytics_company_time
ON analytics_events (company_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_event_type_time
ON analytics_events (event_type, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_category_time
ON analytics_events (category, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_timestamp
ON analytics_events (timestamp DESC);

-- Enable compression for old data (compress data older than 30 days)
ALTER TABLE analytics_events SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'company_id, event_type',
    timescaledb.compress_orderby = 'timestamp DESC'
);

-- Add compression policy
SELECT add_compression_policy(
    'analytics_events',
    INTERVAL '30 days',
    if_not_exists => TRUE
);

-- Add data retention policy (delete data older than 2 years)
SELECT add_retention_policy(
    'analytics_events',
    INTERVAL '2 years',
    if_not_exists => TRUE
);

-- Create continuous aggregates for common queries

-- 1. Hourly aggregates for revenue metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_revenue_hourly
WITH (timescaledb.continuous) AS
SELECT
    company_id,
    time_bucket('1 hour', timestamp) AS bucket,
    event_type,
    currency,
    COUNT(*) AS event_count,
    SUM(value) AS total_value,
    AVG(value) AS avg_value,
    MIN(value) AS min_value,
    MAX(value) AS max_value
FROM analytics_events
WHERE category = 'revenue'
GROUP BY company_id, bucket, event_type, currency
WITH NO DATA;

-- Refresh policy for hourly aggregates (every 15 minutes)
SELECT add_continuous_aggregate_policy(
    'analytics_revenue_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '15 minutes',
    if_not_exists => TRUE
);

-- 2. Daily aggregates for user activity
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_user_activity_daily
WITH (timescaledb.continuous) AS
SELECT
    company_id,
    user_id,
    time_bucket('1 day', timestamp) AS bucket,
    event_type,
    COUNT(*) AS event_count
FROM analytics_events
WHERE category = 'user_activity'
GROUP BY company_id, user_id, bucket, event_type
WITH NO DATA;

-- Refresh policy for daily aggregates (every hour)
SELECT add_continuous_aggregate_policy(
    'analytics_user_activity_daily',
    start_offset => INTERVAL '7 days',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

-- 3. Daily aggregates for crypto transactions
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_crypto_daily
WITH (timescaledb.continuous) AS
SELECT
    company_id,
    time_bucket('1 day', timestamp) AS bucket,
    event_type,
    COUNT(*) AS event_count,
    SUM(value) AS total_value,
    AVG(value) AS avg_value
FROM analytics_events
WHERE category = 'crypto'
GROUP BY company_id, bucket, event_type
WITH NO DATA;

-- Refresh policy for crypto aggregates (every hour)
SELECT add_continuous_aggregate_policy(
    'analytics_crypto_daily',
    start_offset => INTERVAL '7 days',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

-- Comments for documentation
COMMENT ON TABLE analytics_events IS 'Time-series analytics events stored in TimescaleDB hypertable';
COMMENT ON COLUMN analytics_events.event_type IS 'Type of event: invoice.created, payment.received, user.login, etc.';
COMMENT ON COLUMN analytics_events.category IS 'Event category: revenue, user_activity, system, crypto';
COMMENT ON COLUMN analytics_events.value IS 'Numeric value associated with the event';
COMMENT ON COLUMN analytics_events.timestamp IS 'Event timestamp - primary dimension for time-series queries';

-- Initial data seeding (optional - for testing)
-- Uncomment to seed sample analytics data
/*
INSERT INTO analytics_events (company_id, event_type, category, value, currency, timestamp)
SELECT
    c.id,
    'invoice.created',
    'revenue',
    RANDOM() * 1000,
    'EUR',
    NOW() - (INTERVAL '1 day' * generate_series(1, 90))
FROM companies c
LIMIT 1;
*/
