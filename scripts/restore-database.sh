#!/bin/bash
# PostgreSQL Restore Script for Crypto-ERP
# Restores database from backup file

set -e  # Exit on error

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-crypto_erp}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

# Check if backup file is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup_file.sql.gz> [--from-s3]"
    echo ""
    echo "Examples:"
    echo "  $0 /backups/crypto_erp_backup_20240115_120000.sql.gz"
    echo "  $0 crypto_erp_backup_20240115_120000.sql.gz --from-s3"
    exit 1
fi

BACKUP_FILE="$1"
FROM_S3="$2"

echo "==============================================="
echo "Crypto-ERP Database Restore"
echo "==============================================="
echo "Database: ${DB_NAME}@${DB_HOST}:${DB_PORT}"
echo "Backup:   ${BACKUP_FILE}"
echo "==============================================="

# Download from S3 if requested
if [ "${FROM_S3}" = "--from-s3" ]; then
    if [ -z "${S3_BUCKET}" ]; then
        echo "✗ Error: S3_BUCKET environment variable not set"
        exit 1
    fi

    echo "Downloading from S3..."
    S3_PREFIX="${S3_PREFIX:-backups/database}"
    LOCAL_FILE="/tmp/${BACKUP_FILE}"

    aws s3 cp "s3://${S3_BUCKET}/${S3_PREFIX}/${BACKUP_FILE}" "${LOCAL_FILE}"
    BACKUP_FILE="${LOCAL_FILE}"
    echo "✓ Downloaded from S3"
fi

# Verify backup file exists
if [ ! -f "${BACKUP_FILE}" ]; then
    echo "✗ Error: Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

# Verify backup file integrity
echo "Verifying backup integrity..."
if ! gzip -t "${BACKUP_FILE}"; then
    echo "✗ Error: Backup file is corrupted!"
    exit 1
fi
echo "✓ Backup file integrity verified"

# Confirmation prompt
echo ""
echo "⚠️  WARNING: This will DROP the existing database and restore from backup!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Restore cancelled."
    exit 0
fi

export PGPASSWORD="${DB_PASSWORD}"

# Create backup of current database before restore (safety measure)
SAFETY_BACKUP="/tmp/crypto_erp_pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
echo "Creating safety backup of current database..."
pg_dump -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        --format=plain \
        2>&1 | gzip > "${SAFETY_BACKUP}"
echo "✓ Safety backup created: ${SAFETY_BACKUP}"

# Terminate all active connections to the database
echo "Terminating active connections..."
psql -h "${DB_HOST}" \
     -p "${DB_PORT}" \
     -U "${DB_USER}" \
     -d postgres \
     -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" \
     > /dev/null

# Drop and recreate database
echo "Dropping database..."
psql -h "${DB_HOST}" \
     -p "${DB_PORT}" \
     -U "${DB_USER}" \
     -d postgres \
     -c "DROP DATABASE IF EXISTS ${DB_NAME};" \
     > /dev/null

echo "Creating database..."
psql -h "${DB_HOST}" \
     -p "${DB_PORT}" \
     -U "${DB_USER}" \
     -d postgres \
     -c "CREATE DATABASE ${DB_NAME};" \
     > /dev/null

# Enable required extensions
echo "Enabling extensions..."
psql -h "${DB_HOST}" \
     -p "${DB_PORT}" \
     -U "${DB_USER}" \
     -d "${DB_NAME}" \
     -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" \
     > /dev/null

psql -h "${DB_HOST}" \
     -p "${DB_PORT}" \
     -U "${DB_USER}" \
     -d "${DB_NAME}" \
     -c "CREATE EXTENSION IF NOT EXISTS vector;" \
     > /dev/null

# Restore from backup
echo "Restoring database..."
gunzip -c "${BACKUP_FILE}" | psql -h "${DB_HOST}" \
                                   -p "${DB_PORT}" \
                                   -U "${DB_USER}" \
                                   -d "${DB_NAME}" \
                                   --quiet

unset PGPASSWORD

# Verify restore
echo "Verifying restore..."
export PGPASSWORD="${DB_PASSWORD}"
TABLE_COUNT=$(psql -h "${DB_HOST}" \
                   -p "${DB_PORT}" \
                   -U "${DB_USER}" \
                   -d "${DB_NAME}" \
                   -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
unset PGPASSWORD

if [ "${TABLE_COUNT}" -gt 0 ]; then
    echo "✓ Restore completed successfully (${TABLE_COUNT} tables restored)"
else
    echo "✗ Error: No tables found after restore!"
    exit 1
fi

# Clean up temporary files
if [ "${FROM_S3}" = "--from-s3" ]; then
    rm -f "${LOCAL_FILE}"
fi

echo "==============================================="
echo "Restore completed successfully!"
echo "==============================================="
echo "Safety backup saved at: ${SAFETY_BACKUP}"
echo ""
echo "Next steps:"
echo "  1. Verify application functionality"
echo "  2. Run migrations if needed: npm run db:migrate"
echo "  3. Delete safety backup if restore is successful"
echo "==============================================="
