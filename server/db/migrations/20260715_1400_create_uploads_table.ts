import type { PoolClient } from 'pg';

export const DESCRIPTION = 'Create uploads table for per-household image ownership + quota';

export async function upgrade(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS uploads (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      filename      TEXT NOT NULL UNIQUE,
      size_bytes    BIGINT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_uploads_household ON uploads(household_id)');
}
