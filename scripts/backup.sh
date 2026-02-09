#!/bin/bash
set -euo pipefail

#############################################
# What's On The Menu — Backup Script
#############################################
# Backs up PostgreSQL database and uploads directory
# Keeps last 7 days of backups
# Run via cron: 0 2 * * * /path/to/backup.sh
#############################################

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/whats-on-the-menu}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="${APP_DIR:-/home/jeffh/projects/whats-on-the-menu-multi-tenant-production}"

# PostgreSQL connection
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-menu_app}"
DB_USER="${DB_USER:-postgres}"
export PGPASSWORD="${DB_PASSWORD:-postgres}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."

# 1. Backup PostgreSQL database
echo "[$(date)] Backing up PostgreSQL database..."
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --format=custom \
  --file="$BACKUP_DIR/db_backup_$DATE.dump"
echo "[$(date)] Database backup complete: db_backup_$DATE.dump"

# Verify backup integrity
echo "[$(date)] Verifying database backup integrity..."
if pg_restore --list "$BACKUP_DIR/db_backup_$DATE.dump" > /dev/null 2>&1; then
  echo "[$(date)] Backup verification passed"
else
  echo "[$(date)] ERROR: Backup verification FAILED for db_backup_$DATE.dump"
  rm -f "$BACKUP_DIR/db_backup_$DATE.dump"
  exit 1
fi

# 2. Backup uploads directory
echo "[$(date)] Backing up uploads directory..."
if [ -d "$APP_DIR/data/uploads" ]; then
  tar -czf "$BACKUP_DIR/uploads_backup_$DATE.tar.gz" \
    -C "$APP_DIR" data/uploads
  echo "[$(date)] Uploads backup complete: uploads_backup_$DATE.tar.gz"
else
  echo "[$(date)] No uploads directory found, skipping uploads backup"
fi

# 3. Rotate old backups
echo "[$(date)] Rotating old backups (keeping last $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "db_backup_*.dump" -type f -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "uploads_backup_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete

# 4. Summary
echo "[$(date)] Backup summary:"
echo "  Database backups: $(find "$BACKUP_DIR" -name "db_backup_*.dump" | wc -l)"
echo "  Uploads backups: $(find "$BACKUP_DIR" -name "uploads_backup_*.tar.gz" | wc -l)"
echo "  Total size: $(du -sh "$BACKUP_DIR" | cut -f1)"
echo "[$(date)] Backup complete!"
