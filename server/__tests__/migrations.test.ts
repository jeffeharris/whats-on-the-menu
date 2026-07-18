import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import pool from '../db/pool.js';
import { runMigrations, loadMigrations } from '../db/migrate.js';

// Two migrations: the second depends on the first and adds a column to the
// table the first creates. Ordering is therefore load-bearing.
const CREATE_WIDGET = `
import type { PoolClient } from 'pg';
export const DESCRIPTION = 'create mig_test_widget';
export async function upgrade(client: PoolClient): Promise<void> {
  await client.query('CREATE TABLE IF NOT EXISTS mig_test_widget (id SERIAL PRIMARY KEY)');
}
`;

const ADD_COLUMN = `
import type { PoolClient } from 'pg';
export const DESCRIPTION = 'add label to mig_test_widget';
export const DEPENDS_ON = '20260101_0000_create_widget';
export async function upgrade(client: PoolClient): Promise<void> {
  await client.query('ALTER TABLE mig_test_widget ADD COLUMN IF NOT EXISTS label TEXT');
}
`;

function makeMigrationsDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'wotm-migrations-'));
  // Written out of order on disk to prove ordering is by id, not readdir order.
  writeFileSync(join(dir, '20260102_0000_add_widget_col.ts'), ADD_COLUMN);
  writeFileSync(join(dir, '20260101_0000_create_widget.ts'), CREATE_WIDGET);
  writeFileSync(join(dir, 'README.md'), '# not a migration');
  return dir;
}

describe('migration runner', () => {
  const ids = ['20260101_0000_create_widget', '20260102_0000_add_widget_col'];

  afterEach(async () => {
    await pool.query('DROP TABLE IF EXISTS mig_test_widget, mig_test_fail_table, mig_test_never');
    // applied_migrations only exists once runMigrations has run at least once.
    // Test migration ids all start 2026010x; real migrations are 20260715_*.
    await pool
      .query("DELETE FROM applied_migrations WHERE id LIKE '2026010%'")
      .catch(() => {});
  });

  it('orders migrations by id and honours DEPENDS_ON', async () => {
    const dir = makeMigrationsDir();
    try {
      const loaded = await loadMigrations(dir);
      expect(loaded.map((m) => m.id)).toEqual(ids); // README skipped, correct order
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('applies pending migrations and records them', async () => {
    const dir = makeMigrationsDir();
    try {
      const result = await runMigrations(pool, dir);
      expect(result.applied).toEqual(ids);

      // Both the table and the dependent column exist.
      const col = await pool.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_name = 'mig_test_widget' AND column_name = 'label'`,
      );
      expect(col.rowCount).toBe(1);

      const applied = await pool.query('SELECT id FROM applied_migrations WHERE id = ANY($1)', [ids]);
      expect(applied.rowCount).toBe(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('is idempotent — a second run applies nothing', async () => {
    const dir = makeMigrationsDir();
    try {
      await runMigrations(pool, dir);
      const second = await runMigrations(pool, dir);
      expect(second.applied).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rolls back a failing migration and leaves prior migrations committed', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'wotm-migrations-fail-'));
    // First migration succeeds; second creates a table then throws; third would
    // run only if the second somehow succeeded.
    writeFileSync(join(dir, '20260101_0000_create_widget.ts'), CREATE_WIDGET);
    writeFileSync(
      join(dir, '20260102_0000_fails.ts'),
      `import type { PoolClient } from 'pg';
       export async function upgrade(client: PoolClient): Promise<void> {
         await client.query('CREATE TABLE mig_test_fail_table (id SERIAL PRIMARY KEY)');
         throw new Error('boom');
       }`,
    );
    writeFileSync(
      join(dir, '20260103_0000_never.ts'),
      `import type { PoolClient } from 'pg';
       export async function upgrade(client: PoolClient): Promise<void> {
         await client.query('CREATE TABLE mig_test_never (id SERIAL PRIMARY KEY)');
       }`,
    );

    try {
      await expect(runMigrations(pool, dir)).rejects.toThrow(/Migration 20260102_0000_fails failed/);

      // The first migration committed and is recorded.
      const applied = await pool.query("SELECT id FROM applied_migrations WHERE id LIKE '2026010%' ORDER BY id");
      expect(applied.rows.map((r) => r.id)).toEqual(['20260101_0000_create_widget']);
      const widget = await pool.query("SELECT to_regclass('mig_test_widget') AS t");
      expect(widget.rows[0].t).not.toBeNull();

      // The failing migration's partial work was rolled back and it is NOT recorded
      // (so a re-run retries it). The third migration never ran.
      const failTable = await pool.query("SELECT to_regclass('mig_test_fail_table') AS t");
      expect(failTable.rows[0].t).toBeNull();
      const neverTable = await pool.query("SELECT to_regclass('mig_test_never') AS t");
      expect(neverTable.rows[0].t).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
