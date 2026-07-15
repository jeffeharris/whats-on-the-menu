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
    await pool.query('DROP TABLE IF EXISTS mig_test_widget');
    // applied_migrations only exists once runMigrations has run at least once.
    await pool
      .query('DELETE FROM applied_migrations WHERE id = ANY($1)', [ids])
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
});
