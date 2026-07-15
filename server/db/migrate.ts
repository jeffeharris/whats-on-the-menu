/**
 * Forward schema migrations: per-file, applied-set model.
 *
 * Mirrors the approach used in the my-poker-face project. `docs/schema.sql` is
 * the **baseline** (equivalent to a squashed migration): a fresh database is
 * created from it, and the production database already has it applied. Every
 * schema change authored *after* the baseline is a per-file migration here.
 *
 * Why per-file + applied-set:
 *   - Per-file — each migration is its own module, so two branches authoring
 *     migrations in parallel touch *different files* and merge cleanly. There
 *     is no shared version constant to conflict on.
 *   - Applied-set, not high-water-mark — the `applied_migrations` table records
 *     the *set* of applied ids and runs any discovered file not in that set. A
 *     late-merged migration whose id sorts "earlier" than ones already applied
 *     still runs, so merging never requires renumbering for correctness.
 *
 * Authoring a migration — drop a file in `server/db/migrations/` named:
 *
 *     YYYYMMDD_HHMM_short_slug.ts
 *
 * exposing:
 *
 *     export async function upgrade(client: PoolClient): Promise<void> { ... }
 *
 * and optionally:
 *
 *     export const DESCRIPTION = 'one-line summary';
 *     export const DEPENDS_ON = '20260607_1430_other'; // string | string[]
 *
 * Make `upgrade` idempotent (guard with IF NOT EXISTS / catalog checks) so a
 * re-run or a partially-built DB is safe. Ordering is lexicographic by id (the
 * YYYYMMDD_HHMM prefix sorts chronologically), refined by a topological pass
 * that honours DEPENDS_ON. For purely additive migrations order is irrelevant.
 *
 * Run pending migrations:  npm run migrate
 */
import { readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import type { Pool, PoolClient } from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const DEFAULT_MIGRATIONS_DIR = join(__dirname, 'migrations');

// A migration id is the file stem: YYYYMMDD_HHMM_slug (lowercase slug).
const ID_RE = /^\d{8}_\d{4}_[a-z0-9][a-z0-9_]*$/;

export interface Migration {
  id: string;
  path: string;
  description: string;
  dependsOn: string[];
  upgrade: (client: PoolClient) => Promise<void>;
}

/** Discover and load migration modules from a directory, sorted by id. */
export async function loadMigrations(dir: string): Promise<Migration[]> {
  let files: string[];
  try {
    files = readdirSync(dir);
  } catch {
    return []; // No migrations directory yet — nothing to do.
  }

  const migrations: Migration[] = [];
  for (const file of files) {
    if (!file.endsWith('.ts') && !file.endsWith('.js')) continue;
    const id = file.replace(/\.(ts|js)$/, '');
    if (!ID_RE.test(id)) continue; // Skip README, helpers, etc.

    const mod = await import(pathToFileURL(join(dir, file)).href);
    if (typeof mod.upgrade !== 'function') {
      throw new Error(`Migration ${id} does not export an async upgrade(client) function`);
    }
    const dependsOn = mod.DEPENDS_ON
      ? Array.isArray(mod.DEPENDS_ON) ? mod.DEPENDS_ON : [mod.DEPENDS_ON]
      : [];
    migrations.push({
      id,
      path: join(dir, file),
      description: mod.DESCRIPTION ?? '',
      dependsOn,
      upgrade: mod.upgrade,
    });
  }

  return topoSort(migrations);
}

/** Lexicographic order by id, refined by a topological pass honouring dependsOn. */
function topoSort(migrations: Migration[]): Migration[] {
  const byId = new Map(migrations.map((m) => [m.id, m]));
  const sorted: Migration[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const visit = (m: Migration) => {
    if (visited.has(m.id)) return;
    if (visiting.has(m.id)) {
      throw new Error(`Circular migration dependency involving ${m.id}`);
    }
    visiting.add(m.id);
    for (const dep of m.dependsOn) {
      const depMig = byId.get(dep);
      if (!depMig) {
        throw new Error(`Migration ${m.id} depends on unknown migration ${dep}`);
      }
      visit(depMig);
    }
    visiting.delete(m.id);
    visited.add(m.id);
    sorted.push(m);
  };

  // Visit in lexicographic id order so independent migrations keep chronological order.
  for (const m of [...migrations].sort((a, b) => a.id.localeCompare(b.id))) {
    visit(m);
  }
  return sorted;
}

async function ensureAppliedTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS applied_migrations (
      id          TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function getAppliedIds(pool: Pool): Promise<Set<string>> {
  const { rows } = await pool.query<{ id: string }>('SELECT id FROM applied_migrations');
  return new Set(rows.map((r) => r.id));
}

export interface MigrateResult {
  applied: string[];
  alreadyApplied: number;
}

/**
 * Apply every discovered migration not already recorded in applied_migrations.
 * Each migration runs inside its own transaction alongside the bookkeeping row,
 * so a failure leaves the database on the last fully-applied migration.
 */
export async function runMigrations(
  pool: Pool,
  dir: string = DEFAULT_MIGRATIONS_DIR,
  log: (msg: string) => void = () => {},
): Promise<MigrateResult> {
  await ensureAppliedTable(pool);
  const applied = await getAppliedIds(pool);
  const migrations = await loadMigrations(dir);
  const pending = migrations.filter((m) => !applied.has(m.id));

  if (pending.length === 0) {
    log(`No pending migrations (${applied.size} already applied).`);
    return { applied: [], alreadyApplied: applied.size };
  }

  const appliedNow: string[] = [];
  for (const m of pending) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await m.upgrade(client);
      await client.query('INSERT INTO applied_migrations (id) VALUES ($1)', [m.id]);
      await client.query('COMMIT');
      appliedNow.push(m.id);
      log(`Applied ${m.id}${m.description ? ` — ${m.description}` : ''}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`Migration ${m.id} failed: ${(err as Error).message}`, { cause: err });
    } finally {
      client.release();
    }
  }

  return { applied: appliedNow, alreadyApplied: applied.size };
}

// CLI entry: `npm run migrate` / `npx tsx server/db/migrate.ts`
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { default: pool } = await import('./pool.js');
  try {
    const result = await runMigrations(pool, DEFAULT_MIGRATIONS_DIR, (m) => console.log(m));
    console.log(
      result.applied.length > 0
        ? `\n✓ Applied ${result.applied.length} migration(s).`
        : '\n✓ Database is up to date.',
    );
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('\n✗ Migration failed:', (err as Error).message);
    await pool.end();
    process.exit(1);
  }
}
