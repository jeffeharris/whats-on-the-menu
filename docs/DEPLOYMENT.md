---
purpose: Operate and validate the restricted production deployment path for What's on the Menu
type: guide
created: 2026-07-26
last_updated: 2026-07-26
---

# Production Deployment

A push to protected `main` runs validation, builds the application image on a
GitHub-hosted runner, and publishes it to GHCR. The production job passes the
commit SHA, Buildx image digest, and short-lived workflow token over pinned SSH
to the deploy-only service at `menu-deploy@178.156.202.136:2222`.

The SSH key is stored only as `DEPLOY_SSH_PRIVATE_KEY` in the GitHub
`production` environment. Its host account has no interactive shell, TTY,
forwarding, Docker-group membership, or general sudo. It can invoke only the
root-owned deployment controller's menu scope.

TCP `2222` is served by a separate SSH daemon that denies root and password
authentication and allows only the forced-command deploy accounts.
Administrative TCP `22` remains source-restricted by the Hetzner firewall.

The controller:

1. validates a canonical commit SHA and image digest;
2. verifies the commit's GitHub signature and protected-`main` ancestry;
3. safely extracts only `docker-compose.prod.yml` and `docs/schema.sql` from the
   exact source archive;
4. requires every Compose image to resolve by digest;
5. verifies the application image's OCI revision label equals the commit SHA;
6. deploys under a host lock and restores the previous application image if the
   public health check fails.

The workflow token exists only in controller memory and a temporary root-only
Docker configuration. No persistent GHCR credential is stored on the host.

## Rotation

Rotate the deploy SSH key by creating a new ED25519 pair, installing the public
key in the production `menu-deploy` forced-command account, and replacing the
GitHub environment secret with the private key. Run one successful deployment,
then remove the old public key.

This rotation is transparent to users and does not restart the application by
itself. Rotating `/opt/menu/.env` credentials has separate effects:

- `SESSION_SECRET` invalidates application sessions;
- `POSTGRES_PASSWORD` must change atomically in PostgreSQL and `.env`;
- `RESEND_API_KEY` interrupts email during a mismatch;
- image-provider key mismatches interrupt image generation only.

## Validation

After each deployment, confirm:

```bash
curl -fsS https://whatsonthemenu.app/api/health
```

On the host, the release record is
`/var/lib/feltbound-deploy/releases/menu-production.json`. Direct shell commands
using the deploy key must fail with exit status `64`.
