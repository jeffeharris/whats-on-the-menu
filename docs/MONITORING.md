# Monitoring & Incident Response

## Uptime Monitoring

### UptimeRobot Setup

1. Create free account at [uptimerobot.com](https://uptimerobot.com)
2. Add new monitor:
   - **Type**: HTTP(s)
   - **URL**: `https://whatsonthemenu.app/api/health`
   - **Interval**: 5 minutes
   - **Expected status**: 200
   - **Expected response**: `{"status":"ok"}`
3. Configure alert contacts:
   - Add email address for downtime notifications
   - Optionally add Slack/Discord webhook

## Viewing Logs

### Docker Compose Commands

```bash
# Follow all app logs
docker-compose -f docker-compose.prod.yml logs -f app

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100 app

# All services
docker-compose -f docker-compose.prod.yml logs -f

# Database logs only
docker-compose -f docker-compose.prod.yml logs -f db
```

### Log Format

Logs use [pino](https://github.com/pinojs/pino) JSON format:

```json
{
  "level": 30,
  "time": 1707400000000,
  "msg": "request completed",
  "req": { "method": "GET", "url": "/api/health" },
  "res": { "statusCode": 200 },
  "responseTime": 12
}
```

### Log Levels

| Level | Value | Usage |
|-------|-------|-------|
| trace | 10 | Verbose debug output |
| debug | 20 | Debug information |
| info  | 30 | Normal operations (default) |
| warn  | 40 | Warnings, non-critical issues |
| error | 50 | Errors requiring attention |
| fatal | 60 | Process-ending errors |

### Setting Log Level

Set via `LOG_LEVEL` environment variable in `docker-compose.prod.yml`:

```yaml
environment:
  - LOG_LEVEL=info   # default
  - LOG_LEVEL=debug  # more verbose
```

Restart the app service after changing:

```bash
docker-compose -f docker-compose.prod.yml restart app
```

## Incident Response

### Site is Down

1. **Check server is reachable**
   ```bash
   ssh your-server
   ```

2. **Check Docker containers are running**
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   ```

3. **Check app logs for errors**
   ```bash
   docker-compose -f docker-compose.prod.yml logs --tail=200 app
   ```

4. **Check database logs**
   ```bash
   docker-compose -f docker-compose.prod.yml logs --tail=100 db
   ```

5. **Restart services**
   ```bash
   # Restart app only
   docker-compose -f docker-compose.prod.yml restart app

   # Restart everything
   docker-compose -f docker-compose.prod.yml down && docker-compose -f docker-compose.prod.yml up -d
   ```

6. **Verify recovery**
   ```bash
   curl -s https://whatsonthemenu.app/api/health
   # Expected: {"status":"ok"}
   ```

### Common Issues

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| 502 Bad Gateway | App container crashed | `docker-compose restart app` |
| Database connection errors | DB container down or OOM | Check `docker-compose logs db`, restart db |
| Slow responses | High load or DB queries | Check logs for slow queries, restart app |
| Certificate errors | Caddy TLS renewal failed | Check `docker-compose logs caddy`, ensure port 80/443 open |
