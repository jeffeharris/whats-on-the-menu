import type { PoolClient } from 'pg';

export const DESCRIPTION = 'Create image_generations table for per-household + global generation caps';

export async function upgrade(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS image_generations (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      model         TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await client.query(
    'CREATE INDEX IF NOT EXISTS idx_image_generations_household_created ON image_generations(household_id, created_at DESC)',
  );
  await client.query(
    'CREATE INDEX IF NOT EXISTS idx_image_generations_created ON image_generations(created_at DESC)',
  );
}
