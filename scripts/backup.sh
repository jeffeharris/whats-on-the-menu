#!/bin/bash
set -euo pipefail

#############################################
# What's On The Menu — Backup Script
#############################################
# Backs up the PostgreSQL database and the uploads directory.
# Keeps the last 7 days of backups. Run via cron:
#   0 2 * * * /opt/menu/scripts/backup.sh >> /var/log/menu-backup.log 2>&1
#
# The production database runs inside the `db` compose service on an
# internal-only Docker network with NO host port, so we drive pg_dump/
# pg_restore *through the container* via `docker compose exec` rather than
# connecting to localhost. This also means the host needs no postgresql-client.
#############################################

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/whats-on-the-menu}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
DATE=$(date +%Y%m%d_%H%M%S)

# App root on the production host (where docker-compose.prod.yml + data/ live).
APP_DIR="${APP_DIR:-/opt/menu}"
COMPOSE_FILE="${COMPOSE_FILE:-$APP_DIR/docker-compose.prod.yml}"
COMPOSE="docker compose -f $COMPOSE_FILE"

# Database — matches docker-compose.prod.yml (service `db`, database `whatsonthemenu`).
DB_SERVICE="${DB_SERVICE:-db}"
DB_NAME="${DB_NAME:-whatsonthemenu}"
DB_USER="${DB_USER:-postgres}"

# Optional off-site sync. Set BACKUP_OFFSITE_CMD to a command that receives the
# backup directory as its final argument, e.g.:
#   BACKUP_OFFSITE_CMD="rclone sync"  BACKUP_OFFSITE_DEST="remote:menu-backups"
#   BACKUP_OFFSITE_CMD="aws s3 sync"  BACKUP_OFFSITE_DEST="s3://my-bucket/menu"
# Left unset = no off-site copy (backups stay local only).
BACKUP_OFFSITE_CMD="${BACKUP_OFFSITE_CMD:-}"
BACKUP_OFFSITE_DEST="${BACKUP_OFFSITE_DEST:-}"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."

# Fail early if the database container isn't running — better a loud cron
# failure than a silently-missing backup.
if ! $COMPOSE ps --status running "$DB_SERVICE" | grep -q "$DB_SERVICE"; then
  echo "[$(date)] ERROR: db service '$DB_SERVICE' is not running; aborting." >&2
  exit 1
fi

DB_DUMP="$BACKUP_DIR/db_backup_$DATE.dump"

# 1. Back up the PostgreSQL database (custom format, streamed to the host).
echo "[$(date)] Backing up PostgreSQL database '$DB_NAME'..."
$COMPOSE exec -T "$DB_SERVICE" pg_dump -U "$DB_USER" -d "$DB_NAME" --format=custom > "$DB_DUMP"
echo "[$(date)] Database backup complete: $(basename "$DB_DUMP")"

# Verify integrity by listing the archive back through the container
# (pg_restore reads the dump from stdin when no input file is given).
echo "[$(date)] Verifying database backup integrity..."
if $COMPOSE exec -T "$DB_SERVICE" pg_restore --list < "$DB_DUMP" > /dev/null 2>&1; then
  echo "[$(date)] Backup verification passed"
else
  echo "[$(date)] ERROR: Backup verification FAILED for $(basename "$DB_DUMP")" >&2
  rm -f "$DB_DUMP"
  exit 1
fi

# 2. Back up the uploads directory (host bind mount at $APP_DIR/data/uploads).
echo "[$(date)] Backing up uploads directory..."
if [ -d "$APP_DIR/data/uploads" ]; then
  tar -czf "$BACKUP_DIR/uploads_backup_$DATE.tar.gz" -C "$APP_DIR" data/uploads
  echo "[$(date)] Uploads backup complete: uploads_backup_$DATE.tar.gz"
else
  echo "[$(date)] No uploads directory found at $APP_DIR/data/uploads, skipping uploads backup"
fi

# 3. Rotate old backups.
echo "[$(date)] Rotating old backups (keeping last $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "db_backup_*.dump" -type f -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -name "uploads_backup_*.tar.gz" -type f -mtime +"$RETENTION_DAYS" -delete

# 4. Optional off-site sync (a failure here fails the cron loudly).
if [ -n "$BACKUP_OFFSITE_CMD" ]; then
  echo "[$(date)] Syncing backups off-site: $BACKUP_OFFSITE_CMD $BACKUP_DIR $BACKUP_OFFSITE_DEST"
  $BACKUP_OFFSITE_CMD "$BACKUP_DIR" $BACKUP_OFFSITE_DEST
  echo "[$(date)] Off-site sync complete"
else
  echo "[$(date)] BACKUP_OFFSITE_CMD not set — skipping off-site sync (backups are local only)"
fi

# 5. Summary.
echo "[$(date)] Backup summary:"
echo "  Database backups: $(find "$BACKUP_DIR" -name "db_backup_*.dump" | wc -l)"
echo "  Uploads backups:  $(find "$BACKUP_DIR" -name "uploads_backup_*.tar.gz" | wc -l)"
echo "  Total size:       $(du -sh "$BACKUP_DIR" | cut -f1)"
echo "[$(date)] Backup complete!"
