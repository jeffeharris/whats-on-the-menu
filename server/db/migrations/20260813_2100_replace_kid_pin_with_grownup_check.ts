import type { PoolClient } from 'pg';

export const DESCRIPTION = 'Replace households.kid_pin with a boolean grownup_check_enabled flag';

/**
 * Kid mode used to gate parent access with a stored 4-digit PIN. It now shows a
 * random challenge spelled out in words ("four one nine two"), which an adult
 * reads and a pre-reader cannot — so there is no secret left to store.
 *
 * Keeping the column would leave real PINs sitting in the database for a check
 * that no longer consults them, so it goes. The flag preserves the only piece
 * of state that still matters: whether the household wants the check at all.
 */
export async function upgrade(client: PoolClient): Promise<void> {
  await client.query(`
    ALTER TABLE households
      ADD COLUMN IF NOT EXISTS grownup_check_enabled BOOLEAN NOT NULL DEFAULT false
  `);

  // A non-null kid_pin meant the gate was on; preserve each household's choice.
  const { rows } = await client.query<{ exists: boolean }>(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'households' AND column_name = 'kid_pin'
    ) AS exists
  `);

  if (rows[0]?.exists) {
    await client.query(`
      UPDATE households
        SET grownup_check_enabled = (kid_pin IS NOT NULL)
    `);
    await client.query('ALTER TABLE households DROP COLUMN IF EXISTS kid_pin');
  }
}
