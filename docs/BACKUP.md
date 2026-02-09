# Backup & Restore Guide

## What Gets Backed Up

1. **PostgreSQL database** — Full dump of `menu_app` database (`pg_dump --format=custom`)
2. **Uploads directory** — All uploaded food images (`data/uploads/`)

## Backup Schedule

- **Frequency:** Daily at 2:00 AM
- **Retention:** 7 days (older backups auto-deleted)
- **Location:** `/var/backups/whats-on-the-menu/`

## Setup

### Cron Entry

```bash
crontab -e
```

Add:
```
0 2 * * * /home/jeffh/projects/whats-on-the-menu-multi-tenant-production/scripts/backup.sh >> /var/log/menu-backup.log 2>&1
```

Verify:
```bash
crontab -l
```

### Manual Backup

```bash
./scripts/backup.sh
```

### Environment Variables

All optional — defaults shown:

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKUP_DIR` | `/var/backups/whats-on-the-menu` | Where backups are stored |
| `RETENTION_DAYS` | `7` | Days to keep backups |
| `APP_DIR` | Project directory | App root for uploads |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `menu_app` | Database name |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | `postgres` | Database password |

## Restore Procedures

### Restore Database

```bash
# Stop the app
docker compose -f docker-compose.prod.yml down

# Restore
pg_restore -h localhost -p 5432 -U postgres -d menu_app \
  --clean --if-exists \
  /var/backups/whats-on-the-menu/db_backup_YYYYMMDD_HHMMSS.dump

# Restart
docker compose -f docker-compose.prod.yml up -d
```

### Restore Uploads

```bash
tar -xzf /var/backups/whats-on-the-menu/uploads_backup_YYYYMMDD_HHMMSS.tar.gz \
  -C /home/jeffh/projects/whats-on-the-menu-multi-tenant-production/
```

## Troubleshooting

**Backups not running:**
- Check cron: `systemctl status cron` and `crontab -l`
- Check logs: `tail /var/log/menu-backup.log`

**Permission denied:**
- `chmod +x scripts/backup.sh`
- `mkdir -p /var/backups/whats-on-the-menu && chmod 755 /var/backups/whats-on-the-menu`

**pg_dump not found:**
- `apt install postgresql-client`

## Future: Offsite Backups

Consider syncing to S3/R2 for off-site protection:
```bash
aws s3 sync /var/backups/whats-on-the-menu/ s3://my-bucket/menu-backups/
```
