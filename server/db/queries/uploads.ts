import pool from '../pool.js';

/** Total bytes stored by a household across all its uploads. */
export async function getHouseholdUploadBytes(householdId: string): Promise<number> {
  const { rows } = await pool.query<{ total: string | null }>(
    'SELECT COALESCE(SUM(size_bytes), 0)::bigint AS total FROM uploads WHERE household_id = $1',
    [householdId],
  );
  return Number(rows[0]?.total ?? 0);
}

/** Record a newly stored upload for a household. */
export async function recordUpload(
  householdId: string,
  filename: string,
  sizeBytes: number,
): Promise<void> {
  await pool.query(
    `INSERT INTO uploads (household_id, filename, size_bytes)
     VALUES ($1, $2, $3)
     ON CONFLICT (filename) DO UPDATE SET household_id = EXCLUDED.household_id, size_bytes = EXCLUDED.size_bytes`,
    [householdId, filename, sizeBytes],
  );
}

/** True if the filename belongs to the given household. */
export async function householdOwnsUpload(householdId: string, filename: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    'SELECT 1 FROM uploads WHERE household_id = $1 AND filename = $2',
    [householdId, filename],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * Delete a household's upload record (scoped — never deletes another
 * household's row). Returns true if a row was removed.
 */
export async function deleteUploadRecord(householdId: string, filename: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    'DELETE FROM uploads WHERE household_id = $1 AND filename = $2',
    [householdId, filename],
  );
  return (rowCount ?? 0) > 0;
}
