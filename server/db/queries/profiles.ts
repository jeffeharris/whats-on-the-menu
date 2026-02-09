import pool from '../pool.js';

interface KidProfile {
  id: string;
  name: string;
  avatarColor: string;
  avatarAnimal?: string;
}

/** Map a snake_case DB row to a camelCase KidProfile. */
function rowToProfile(row: Record<string, unknown>): KidProfile {
  const profile: KidProfile = {
    id: row.id as string,
    name: row.name as string,
    avatarColor: row.avatar_color as string,
  };
  if (row.avatar_animal != null) {
    profile.avatarAnimal = row.avatar_animal as string;
  }
  return profile;
}

export async function getAllProfiles(householdId: string): Promise<{ profiles: KidProfile[] }> {
  const { rows } = await pool.query(
    'SELECT id, name, avatar_color, avatar_animal FROM kid_profiles WHERE household_id = $1 ORDER BY created_at',
    [householdId],
  );
  return { profiles: rows.map(rowToProfile) };
}

export async function createProfile(
  householdId: string,
  name: string,
  avatarColor: string,
  avatarAnimal?: string,
): Promise<KidProfile> {
  const { rows } = await pool.query(
    `INSERT INTO kid_profiles (household_id, name, avatar_color, avatar_animal)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, avatar_color, avatar_animal`,
    [householdId, name, avatarColor, avatarAnimal ?? null],
  );
  return rowToProfile(rows[0]);
}

export async function updateProfile(
  householdId: string,
  id: string,
  updates: Record<string, unknown>,
): Promise<KidProfile | null> {
  // Build SET clause from allowed fields
  const fieldMap: Record<string, string> = {
    name: 'name',
    avatarColor: 'avatar_color',
    avatarAnimal: 'avatar_animal',
  };

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  for (const [camel, column] of Object.entries(fieldMap)) {
    if (camel in updates) {
      setClauses.push(`${column} = $${paramIndex}`);
      values.push(updates[camel]);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) {
    // Nothing to update — just return the existing profile
    const { rows } = await pool.query(
      'SELECT id, name, avatar_color, avatar_animal FROM kid_profiles WHERE id = $1 AND household_id = $2',
      [id, householdId],
    );
    return rows.length > 0 ? rowToProfile(rows[0]) : null;
  }

  values.push(id);          // $N
  values.push(householdId); // $N+1

  const { rows } = await pool.query(
    `UPDATE kid_profiles
     SET ${setClauses.join(', ')}
     WHERE id = $${paramIndex} AND household_id = $${paramIndex + 1}
     RETURNING id, name, avatar_color, avatar_animal`,
    values,
  );

  return rows.length > 0 ? rowToProfile(rows[0]) : null;
}

export async function deleteProfile(householdId: string, id: string): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM kid_profiles WHERE id = $1 AND household_id = $2',
    [id, householdId],
  );
  return (result.rowCount ?? 0) > 0;
}
