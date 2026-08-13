import pool from '../pool.js';

// Advisory-lock key shared by every cap check, so the count-then-insert below
// is serialized across concurrent requests and the cap can't be overshot by a
// burst. Held only for the duration of the reserving transaction.
const CAP_LOCK_KEY = 'image_generations_cap';

export type ReservationResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'household_limit' | 'global_limit' };

/**
 * Atomically check the rolling-window caps and, if there is room, record the
 * generation. Returns the new row's id so the caller can release it again if
 * the upstream provider call fails (i.e. nothing was actually bought).
 */
export async function reserveGeneration(
  householdId: string,
  model: string,
  householdLimit: number,
  globalLimit: number,
  windowMs: number,
): Promise<ReservationResult> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [CAP_LOCK_KEY]);

    const since = new Date(Date.now() - windowMs);

    const { rows: householdRows } = await client.query<{ count: string }>(
      'SELECT COUNT(*)::bigint AS count FROM image_generations WHERE household_id = $1 AND created_at >= $2',
      [householdId, since],
    );
    if (Number(householdRows[0]?.count ?? 0) >= householdLimit) {
      await client.query('ROLLBACK');
      return { ok: false, reason: 'household_limit' };
    }

    const { rows: globalRows } = await client.query<{ count: string }>(
      'SELECT COUNT(*)::bigint AS count FROM image_generations WHERE created_at >= $1',
      [since],
    );
    if (Number(globalRows[0]?.count ?? 0) >= globalLimit) {
      await client.query('ROLLBACK');
      return { ok: false, reason: 'global_limit' };
    }

    const { rows } = await client.query<{ id: string }>(
      'INSERT INTO image_generations (household_id, model) VALUES ($1, $2) RETURNING id',
      [householdId, model],
    );
    await client.query('COMMIT');
    return { ok: true, id: rows[0].id };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Give back a reservation whose provider call never produced an image. */
export async function releaseGeneration(id: string): Promise<void> {
  await pool.query('DELETE FROM image_generations WHERE id = $1', [id]);
}

/** How many generations a household has used in the rolling window. */
export async function countHouseholdGenerations(
  householdId: string,
  windowMs: number,
): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    'SELECT COUNT(*)::bigint AS count FROM image_generations WHERE household_id = $1 AND created_at >= $2',
    [householdId, new Date(Date.now() - windowMs)],
  );
  return Number(rows[0]?.count ?? 0);
}
