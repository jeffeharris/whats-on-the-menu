import type { PoolClient } from 'pg';

export const DESCRIPTION = 'Version active-menu selection rounds';
export const DEPENDS_ON = '20260814_1000_add_selection_approval_state';

export async function upgrade(client: PoolClient): Promise<void> {
  await client.query(`
    ALTER TABLE households
      ADD COLUMN IF NOT EXISTS selection_revision BIGINT NOT NULL DEFAULT 0
  `);
}
