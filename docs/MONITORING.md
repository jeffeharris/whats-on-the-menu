# Monitoring & Incident Response

## Public Landing Page Analytics

Cloudflare Web Analytics is optional and limited to the logged-out landing
page. Its SPA measurement is disabled so navigation into account, kid,
invitation, sharing, or other token-bearing routes is not reported.

### Cloudflare Setup

1. In Cloudflare, open **Web Analytics**, select **Add a site**, and add
   `whatsonthemenu.app`.
2. Copy the site token from the generated JavaScript beacon. This public site
   token is not a Cloudflare API token.
3. In GitHub Actions, create a repository or `production` environment variable
   named `CLOUDFLARE_WEB_ANALYTICS_TOKEN` with that value. A secret with the
   same name also works, although the Cloudflare site token is public.
4. Deploy a new build. The workflow passes the configured value into Vite as
   `VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN`; an empty or missing value leaves the
   integration disabled.

For a local production build, set the Vite variable directly:

```bash
VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN=your_site_token npm run build
```

The repository uses the manual beacon. If Cloudflare is also proxying the
domain, keep automatic beacon injection disabled. The app will refuse to add a
second beacon, but Cloudflare's automatically injected beacon would use its
default SPA tracking and broaden the route scope beyond the landing page.

### Verification

Open `/` in a logged-out production session and inspect the browser network
panel. `beacon.min.js` should load from `static.cloudflareinsights.com`, followed
by a request to the Cloudflare RUM endpoint. Navigating within the SPA should
not generate analytics for the destination route. Cloudflare notes that new
data can take several minutes to appear in its dashboard.

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

Run these from the deploy directory (`/opt/menu`). The app service is
`menu-app` and the database service is `db`.

```bash
# Follow all app logs
docker compose -f docker-compose.prod.yml logs -f menu-app

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100 menu-app

# All services
docker compose -f docker-compose.prod.yml logs -f

# Database logs only
docker compose -f docker-compose.prod.yml logs -f db
```

> **Note:** Caddy (TLS / reverse proxy) is **not** part of this compose file —
> it runs as a shared proxy on the host, attached to the external `web` network.
> Inspect it with the host's Caddy tooling (e.g. `journalctl -u caddy` or
> `docker logs <caddy-container>`), not `docker compose`.

Container logs are capped at 10 MB × 5 files per service (`json-file` driver,
see `docker-compose.prod.yml`), so they can't fill the host disk.

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
docker compose -f docker-compose.prod.yml restart menu-app
```

## Incident Response

### Site is Down

1. **Check server is reachable**
   ```bash
   ssh your-server
   ```

2. **Check Docker containers are running** (from `/opt/menu`)
   ```bash
   docker compose -f docker-compose.prod.yml ps
   ```

3. **Check app logs for errors**
   ```bash
   docker compose -f docker-compose.prod.yml logs --tail=200 menu-app
   ```

4. **Check database logs**
   ```bash
   docker compose -f docker-compose.prod.yml logs --tail=100 db
   ```

5. **Restart services**
   ```bash
   # Restart app only
   docker compose -f docker-compose.prod.yml restart menu-app

   # Restart everything
   docker compose -f docker-compose.prod.yml down && docker compose -f docker-compose.prod.yml up -d
   ```

6. **Verify recovery**
   ```bash
   curl -s https://whatsonthemenu.app/api/health
   # Expected: {"status":"ok"}
   ```

### Common Issues

All `docker compose` commands run from `/opt/menu`.

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| 502 Bad Gateway | App container crashed | `docker compose -f docker-compose.prod.yml restart menu-app` |
| Database connection errors | DB container down or OOM | Check `docker compose -f docker-compose.prod.yml logs db`, restart `db` |
| Slow responses | High load or DB queries | Check logs for slow queries, restart `menu-app` |
| Certificate errors | Caddy TLS renewal failed | Caddy runs on the host (not in this compose) — check the host Caddy logs, ensure ports 80/443 are open |
