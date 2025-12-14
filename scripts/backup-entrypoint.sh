#!/bin/bash
# Backup Scheduler Entrypoint
# Configures cron and starts backup scheduler service

set -e

echo "==============================================="
echo "Crypto-ERP Backup Scheduler Starting"
echo "==============================================="
echo "Time: $(date)"
echo "Timezone: ${TZ:-UTC}"
echo "Backup Schedule: ${BACKUP_SCHEDULE:-0 2 * * *}"
echo "S3 Enabled: ${S3_ENABLED:-false}"
echo "==============================================="

# Export environment variables for cron
printenv | grep -E '^(DB_|BACKUP_|S3_|AWS_|WEBHOOK_|PROMETHEUS_)' > /etc/environment

# Create cron job configuration
CRON_SCHEDULE="${BACKUP_SCHEDULE:-0 2 * * *}"
CRON_JOB="${CRON_SCHEDULE} /scripts/backup-wrapper.sh >> /var/log/backups/cron.log 2>&1"

echo "Creating cron job: ${CRON_JOB}"
echo "${CRON_JOB}" > /etc/crontabs/root

# Create backup wrapper script (runs backup + monitoring)
cat > /scripts/backup-wrapper.sh <<'EOF'
#!/bin/bash
# Backup Wrapper - Executes backup and sends metrics

set -e

# Load environment variables
set -a
source /etc/environment 2>/dev/null || true
set +a

START_TIME=$(date +%s)
BACKUP_DATE=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="/var/log/backups/backup_${BACKUP_DATE}.log"

echo "===============================================" | tee -a "${LOG_FILE}"
echo "Backup Started: $(date)" | tee -a "${LOG_FILE}"
echo "===============================================" | tee -a "${LOG_FILE}"

# Run backup script
if /scripts/backup-database.sh 2>&1 | tee -a "${LOG_FILE}"; then
    BACKUP_STATUS="success"
    EXIT_CODE=0
    echo "✓ Backup completed successfully" | tee -a "${LOG_FILE}"
else
    BACKUP_STATUS="failure"
    EXIT_CODE=$?
    echo "✗ Backup failed with exit code ${EXIT_CODE}" | tee -a "${LOG_FILE}"
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "Backup Duration: ${DURATION}s" | tee -a "${LOG_FILE}"

# Get backup file size
LATEST_BACKUP=$(find /backups -name "crypto_erp_backup_*.sql.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
if [ -n "${LATEST_BACKUP}" ]; then
    BACKUP_SIZE=$(stat -c%s "${LATEST_BACKUP}" 2>/dev/null || echo "0")
    BACKUP_SIZE_MB=$(echo "scale=2; ${BACKUP_SIZE} / 1024 / 1024" | bc)
    echo "Backup Size: ${BACKUP_SIZE_MB} MB" | tee -a "${LOG_FILE}"
else
    BACKUP_SIZE=0
    BACKUP_SIZE_MB=0
fi

# Send metrics to Prometheus Pushgateway
if [ -n "${PROMETHEUS_PUSHGATEWAY}" ]; then
    echo "Sending metrics to Prometheus Pushgateway..." | tee -a "${LOG_FILE}"

    cat <<METRICS | curl --data-binary @- "${PROMETHEUS_PUSHGATEWAY}/metrics/job/crypto_erp_backup" || true
# TYPE crypto_erp_backup_last_success_timestamp gauge
crypto_erp_backup_last_success_timestamp{status="${BACKUP_STATUS}"} ${END_TIME}

# TYPE crypto_erp_backup_duration_seconds gauge
crypto_erp_backup_duration_seconds{status="${BACKUP_STATUS}"} ${DURATION}

# TYPE crypto_erp_backup_size_bytes gauge
crypto_erp_backup_size_bytes{status="${BACKUP_STATUS}"} ${BACKUP_SIZE}

# TYPE crypto_erp_backup_total counter
crypto_erp_backup_total{status="${BACKUP_STATUS}"} 1
METRICS

    echo "✓ Metrics sent to Pushgateway" | tee -a "${LOG_FILE}"
fi

# Send webhook notification if configured
if [ -n "${WEBHOOK_URL}" ]; then
    echo "Sending webhook notification..." | tee -a "${LOG_FILE}"

    PAYLOAD=$(cat <<JSON
{
  "timestamp": "$(date -Iseconds)",
  "status": "${BACKUP_STATUS}",
  "duration": ${DURATION},
  "backup_size_mb": ${BACKUP_SIZE_MB},
  "database": "${DB_NAME}",
  "s3_enabled": ${S3_ENABLED:-false}
}
JSON
)

    curl -X POST "${WEBHOOK_URL}" \
         -H "Content-Type: application/json" \
         -d "${PAYLOAD}" \
         --max-time 10 \
         || echo "⚠ Webhook notification failed" | tee -a "${LOG_FILE}"
fi

echo "===============================================" | tee -a "${LOG_FILE}"
echo "Backup Finished: $(date)" | tee -a "${LOG_FILE}"
echo "===============================================" | tee -a "${LOG_FILE}"

# Keep only last 30 log files
find /var/log/backups -name "backup_*.log" -type f | sort -r | tail -n +31 | xargs rm -f 2>/dev/null || true

exit ${EXIT_CODE}
EOF

chmod +x /scripts/backup-wrapper.sh

# Verify database connectivity before starting cron
echo "Verifying database connectivity..."
RETRIES=30
RETRY_INTERVAL=2

for i in $(seq 1 ${RETRIES}); do
    if pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" > /dev/null 2>&1; then
        echo "✓ Database is ready"
        break
    fi

    if [ ${i} -eq ${RETRIES} ]; then
        echo "✗ Database not available after ${RETRIES} attempts"
        exit 1
    fi

    echo "Waiting for database... (${i}/${RETRIES})"
    sleep ${RETRY_INTERVAL}
done

# Run initial backup on startup (optional)
if [ "${RUN_INITIAL_BACKUP:-false}" = "true" ]; then
    echo "Running initial backup on startup..."
    /scripts/backup-wrapper.sh
fi

# Start cron daemon
echo "Starting cron daemon..."
crond -f -l 2
