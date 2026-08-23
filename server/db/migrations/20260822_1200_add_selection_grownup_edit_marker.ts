import type { PoolClient } from 'pg';

export const DESCRIPTION = 'Mark plates a grown-up has edited';

export async function upgrade(client: PoolClient): Promise<void> {
  // Additions announce themselves -- they land in a group labelled "Added by a
  // grown-up". A substitution does not: a swapped side is indistinguishable
  // from the kid's own pick. updated_at cannot stand in, because a kid's own
  // write bumps it too, so the fact needs its own column.
  await client.query(`
    ALTER TABLE kid_selections
      ADD COLUMN IF NOT EXISTS edited_by_grownup_at TIMESTAMPTZ
  `);
}
