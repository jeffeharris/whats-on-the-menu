# Backup & Restore Guide

## What Gets Backed Up

1. **PostgreSQL database** — Full dump of the `whatsonthemenu` database (`pg_dump --format=custom`)
2. **Uploads directory** — All uploaded food images (`data/uploads/`)

The production database runs inside the `db` compose service on an internal-only
Docker network with **no host port**, so backup and restore drive `pg_dump` /
`pg_restore` *through the container* (`docker compose exec`). The host does not
need `postgresql-client` installed.

## Backup Schedule

- **Frequency:** Daily at 2:00 AM
- **Retention:** 7 days (older backups auto-deleted)
- **Location:** `/var/backups/whats-on-the-menu/`

## Setup

### Cron Entry

```bash
crontab -e
```

Add (adjust the path if the app isn't deployed at `/opt/menu`):
```
0 2 * * * /opt/menu/scripts/backup.sh >> /var/log/menu-backup.log 2>&1
```

Verify:
```bash
crontab -l
```

### Manual Backup

```bash
cd /opt/menu && ./scripts/backup.sh
```

### Environment Variables

All optional — defaults shown:

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKUP_DIR` | `/var/backups/whats-on-the-menu` | Where backups are stored |
| `RETENTION_DAYS` | `7` | Days to keep backups |
| `APP_DIR` | `/opt/menu` | App root (holds compose file + `data/uploads`) |
| `COMPOSE_FILE` | `$APP_DIR/docker-compose.prod.yml` | Compose file used to reach the db container |
| `DB_SERVICE` | `db` | Compose service name for PostgreSQL |
| `DB_NAME` | `whatsonthemenu` | Database name |
| `DB_USER` | `postgres` | Database user |
| `BACKUP_OFFSITE_CMD` | _(unset)_ | Off-site sync command, e.g. `rclone sync` or `aws s3 sync` |
| `BACKUP_OFFSITE_DEST` | _(unset)_ | Off-site destination, e.g. `remote:menu-backups` |

## Off-site Backups (recommended)

Local-only backups are lost if the VPS is lost. Enable an off-site copy by
setting the two off-site variables in the cron environment. Examples:

```bash
# rclone to any configured remote (S3, R2, B2, Google Drive, ...)
BACKUP_OFFSITE_CMD="rclone sync" BACKUP_OFFSITE_DEST="r2:menu-backups" /opt/menu/scripts/backup.sh

# AWS CLI to S3
BACKUP_OFFSITE_CMD="aws s3 sync" BACKUP_OFFSITE_DEST="s3://my-bucket/menu-backups" /opt/menu/scripts/backup.sh
```

The command is invoked as `<CMD> <BACKUP_DIR> <DEST>`. A failure in the off-site
step fails the whole run (and the cron log), so a broken remote is noticed.

## Restore Procedures

### Restore Database

```bash
cd /opt/menu

# Stop the app so nothing writes during the restore (leave db running).
docker compose -f docker-compose.prod.yml stop menu-app

# Restore into the running db container (reads the dump from stdin).
docker compose -f docker-compose.prod.yml exec -T db \
  pg_restore -U postgres -d whatsonthemenu --clean --if-exists \
  < /var/backups/whats-on-the-menu/db_backup_YYYYMMDD_HHMMSS.dump

# Bring the app back up.
docker compose -f docker-compose.prod.yml start menu-app
```

### Restore Uploads

```bash
tar -xzf /var/backups/whats-on-the-menu/uploads_backup_YYYYMMDD_HHMMSS.tar.gz \
  -C /opt/menu/
```

### Verify a backup can actually be restored (do this periodically!)

A backup you have never restored is not a backup. List a dump's contents
without touching production:

```bash
cd /opt/menu
docker compose -f docker-compose.prod.yml exec -T db pg_restore --list \
  < /var/backups/whats-on-the-menu/db_backup_YYYYMMDD_HHMMSS.dump
```

For a full drill, restore into a throwaway database and inspect it:

```bash
docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -c "CREATE DATABASE restore_test;"
docker compose -f docker-compose.prod.yml exec -T db pg_restore -U postgres -d restore_test \
  < /var/backups/whats-on-the-menu/db_backup_YYYYMMDD_HHMMSS.dump
docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d restore_test -c "\dt"
docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -c "DROP DATABASE restore_test;"
```

## Troubleshooting

**Backups not running:**
- Check cron: `systemctl status cron` and `crontab -l`
- Check logs: `tail /var/log/menu-backup.log`

**`db service 'db' is not running`:**
- Check containers: `cd /opt/menu && docker compose -f docker-compose.prod.yml ps`
- The script aborts (rather than writing an empty backup) if the db container is down.

**Permission denied:**
- `chmod +x scripts/backup.sh`
- `mkdir -p /var/backups/whats-on-the-menu && chmod 755 /var/backups/whats-on-the-menu`
