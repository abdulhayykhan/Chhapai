#!/usr/bin/env bash
# ==============================================================================
# Chhapai (چھپائی) - Automated Nightly Database Backup Script
# PRD Specification: Nightly pg_dump to server disk, retain 7 days.
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/chhapai}"
RETENTION_DAYS=7
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/chhapai_backup_${TIMESTAMP}.sql.gz"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting Chhapai database backup..."

# Execute pg_dump inside the docker container or directly
if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q 'chhapai.*db'; then
    CONTAINER_NAME=$(docker ps --format '{{.Names}}' | grep 'chhapai.*db' | head -n 1)
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Dumping from container: ${CONTAINER_NAME}..."
    docker exec -t "${CONTAINER_NAME}" pg_dump -U "${POSTGRES_USER:-chhapai}" "${POSTGRES_DB:-chhapai_db}" | gzip > "${BACKUP_FILE}"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Dumping directly via pg_dump..."
    pg_dump -h "${PGHOST:-localhost}" -U "${PGUSER:-chhapai}" "${PGDATABASE:-chhapai_db}" | gzip > "${BACKUP_FILE}"
fi

FILESIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup created successfully: ${BACKUP_FILE} (${FILESIZE})"

# Delete backups older than 7 days
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Pruning backups older than ${RETENTION_DAYS} days..."
DELETED_COUNT=$(find "${BACKUP_DIR}" -type f -name "chhapai_backup_*.sql.gz" -mtime +"${RETENTION_DAYS}" -print -delete | wc -l)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Pruned ${DELETED_COUNT} old backup files."

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup job complete."
