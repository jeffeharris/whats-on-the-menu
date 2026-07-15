# Schema migrations

`docs/schema.sql` is the **baseline** — a fresh database is created from it, and
the production database already has it applied. Every schema change authored
*after* the baseline lives here as a per-file migration.

## Authoring a migration

Create a file named `YYYYMMDD_HHMM_short_slug.ts` (the `YYYYMMDD_HHMM` prefix
sorts chronologically). Example — `20260716_0900_add_household_locale.ts`:

```ts
import type { PoolClient } from 'pg';

export const DESCRIPTION = 'Add locale column to households';
// export const DEPENDS_ON = '20260715_1200_other'; // string | string[], rarely needed

export async function upgrade(client: PoolClient): Promise<void> {
  await client.query(`ALTER TABLE households ADD COLUMN IF NOT EXISTS locale TEXT`);
}
```

Guidelines:

- Make `upgrade` **idempotent** — use `IF NOT EXISTS` / `IF EXISTS` guards so a
  re-run or a partially-built database is safe.
- Purely additive changes (new tables/columns/indexes) need no `DEPENDS_ON`.
- Each migration runs in its own transaction alongside its bookkeeping row, so a
  failure leaves the DB on the last fully-applied migration.
- Also update `docs/schema.sql` so fresh installs and the CI test database stay
  current with the cumulative shape.

## Running

```bash
npm run migrate      # apply all pending migrations
```

Migrations also run automatically on server startup (see `server/index.ts`), so
a deploy applies any pending migrations before the app serves traffic.

## How tracking works

An `applied_migrations` table records the **set** of applied migration ids. The
runner discovers every file here and applies any not yet in that set — so a
late-merged migration that sorts "earlier" than ones already applied still runs.
No renumbering is ever required to merge branches.
