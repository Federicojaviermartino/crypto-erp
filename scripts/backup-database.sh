#!/bin/bash
# PostgreSQL Backup Script for Crypto-ERP
# Performs daily backups with configurable retention policy
# Supports local storage and optional S3 upload

set -e  # Exit on error

# Configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_FILENAME="crypto_erp_backup_${TIMESTAMP}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILENAME}"

# Database connection
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-crypto_erp}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

# Retention policy (days)
RETENTION_DAYS="${RETENTION_DAYS:-7}"     # Daily backups: 7 days
RETENTION_WEEKS="${RETENTION_WEEKS:-4}"    # Weekly backups: 4 weeks
RETENTION_MONTHS="${RETENTION_MONTHS:-12}" # Monthly backups: 12 months

# S3 configuration (optional)
S3_ENABLED="${S3_ENABLED:-false}"
S3_BUCKET="${S3_BUCKET:-}"
S3_PREFIX="${S3_PREFIX:-backups/database}"

# Notification settings
WEBHOOK_URL="${WEBHOOK_URL:-}"

echo "==============================================="
echo "Crypto-ERP Database Backup"
echo "==============================================="
echo "Timestamp: ${TIMESTAMP}"
echo "Database:  ${DB_NAME}@${DB_HOST}:${DB_PORT}"
echo "Backup to: ${BACKUP_PATH}"
echo "==============================================="

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Perform backup using pg_dump
echo "Starting backup..."
export PGPASSWORD="${DB_PASSWORD}"

pg_dump -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        --format=plain \
        --no-owner \
        --no-acl \
        --verbose \
        2>&1 | gzip > "${BACKUP_PATH}"

unset PGPASSWORD

# Check if backup was successful
if [ -f "${BACKUP_PATH}" ]; then
    BACKUP_SIZE=$(du -h "${BACKUP_PATH}" | cut -f1)
    echo "✓ Backup completed successfully: ${BACKUP_SIZE}"
else
    echo "✗ Backup failed!"
    notify_failure "Backup failed to create file"
    exit 1
fi

# Verify backup integrity
echo "Verifying backup integrity..."
if gzip -t "${BACKUP_PATH}"; then
    echo "✓ Backup integrity verified"
else
    echo "✗ Backup file is corrupted!"
    notify_failure "Backup file integrity check failed"
    exit 1
fi

# Upload to S3 (if enabled)
if [ "${S3_ENABLED}" = "true" ] && [ -n "${S3_BUCKET}" ]; then
    echo "Uploading to S3..."
    if command -v aws &> /dev/null; then
        aws s3 cp "${BACKUP_PATH}" \
            "s3://${S3_BUCKET}/${S3_PREFIX}/${BACKUP_FILENAME}" \
            --storage-class STANDARD_IA
        echo "✓ Uploaded to S3: s3://${S3_BUCKET}/${S3_PREFIX}/${BACKUP_FILENAME}"
    else
        echo "⚠ AWS CLI not installed, skipping S3 upload"
    fi
fi

# Apply retention policy
echo "Applying retention policy..."

# Remove daily backups older than RETENTION_DAYS
find "${BACKUP_DIR}" -name "crypto_erp_backup_*.sql.gz" \
     -type f -mtime +${RETENTION_DAYS} -delete
echo "✓ Removed daily backups older than ${RETENTION_DAYS} days"

# Keep weekly backups (every Sunday)
if [ "$(date +%u)" -eq 7 ]; then
    WEEKLY_DIR="${BACKUP_DIR}/weekly"
    mkdir -p "${WEEKLY_DIR}"
    cp "${BACKUP_PATH}" "${WEEKLY_DIR}/"
    echo "✓ Created weekly backup"

    # Remove weekly backups older than RETENTION_WEEKS weeks
    find "${WEEKLY_DIR}" -name "*.sql.gz" \
         -type f -mtime +$((RETENTION_WEEKS * 7)) -delete
fi

# Keep monthly backups (first day of month)
if [ "$(date +%d)" -eq 01 ]; then
    MONTHLY_DIR="${BACKUP_DIR}/monthly"
    mkdir -p "${MONTHLY_DIR}"
    cp "${BACKUP_PATH}" "${MONTHLY_DIR}/"
    echo "✓ Created monthly backup"

    # Remove monthly backups older than RETENTION_MONTHS months
    find "${MONTHLY_DIR}" -name "*.sql.gz" \
         -type f -mtime +$((RETENTION_MONTHS * 30)) -delete
fi

# Send success notification
if [ -n "${WEBHOOK_URL}" ]; then
    notify_success "Backup completed: ${BACKUP_SIZE}"
fi

echo "==============================================="
echo "Backup completed successfully!"
echo "==============================================="

# Function to send failure notification
notify_failure() {
    local message="$1"
    if [ -n "${WEBHOOK_URL}" ]; then
        curl -X POST "${WEBHOOK_URL}" \
             -H "Content-Type: application/json" \
             -d "{\"status\":\"error\",\"message\":\"${message}\",\"timestamp\":\"${TIMESTAMP}\"}" \
             || true
    fi
}

# Function to send success notification
notify_success() {
    local message="$1"
    if [ -n "${WEBHOOK_URL}" ]; then
        curl -X POST "${WEBHOOK_URL}" \
             -H "Content-Type: application/json" \
             -d "{\"status\":\"success\",\"message\":\"${message}\",\"timestamp\":\"${TIMESTAMP}\"}" \
             || true
    fi
}
