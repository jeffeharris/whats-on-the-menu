import type { PoolClient } from 'pg';

export const DESCRIPTION = 'Persist active-menu selection approval state and selection update times';

export async function upgrade(client: PoolClient): Promise<void> {
  await client.query(`
    ALTER TABLE households
      ADD COLUMN IF NOT EXISTS selection_status TEXT NOT NULL DEFAULT 'open'
  `);

  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'households_selection_status_check'
          AND conrelid = 'households'::regclass
      ) THEN
        ALTER TABLE households
          ADD CONSTRAINT households_selection_status_check
          CHECK (selection_status IN ('open', 'approved'));
      END IF;
    END
    $$
  `);

  await client.query(`
    ALTER TABLE kid_selections
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  `);
}
