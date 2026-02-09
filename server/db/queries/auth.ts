import { randomBytes } from 'crypto';
import pool from '../pool.js';

// ============================================================
// User queries
// ============================================================

export async function findUserByEmail(
  email: string
): Promise<{ id: string; email: string; household_id: string; display_name: string | null } | null> {
  const { rows } = await pool.query(
    'SELECT id, email, household_id, display_name FROM users WHERE email = $1',
    [email.toLowerCase().trim()]
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function createUser(
  email: string,
  householdId: string,
  displayName?: string,
  role: string = 'owner',
): Promise<{ id: string; email: string; household_id: string; display_name: string | null; role: string }> {
  const { rows } = await pool.query(
    `INSERT INTO users (email, household_id, display_name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, household_id, display_name, role`,
    [email.toLowerCase().trim(), householdId, displayName ?? null, role]
  );
  return rows[0];
}

export async function createHousehold(
  name: string,
  kidPin?: string
): Promise<{ id: string; name: string; kid_pin: string }> {
  const { rows } = await pool.query(
    `INSERT INTO households (name, kid_pin)
     VALUES ($1, $2)
     RETURNING id, name, kid_pin`,
    [name, kidPin ?? '1234']
  );
  return rows[0];
}

// ============================================================
// Session queries
// ============================================================

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  await pool.query(
    `INSERT INTO sessions (user_id, token, expires_at)
     VALUES ($1, $2, now() + interval '30 days')`,
    [userId, token]
  );
  return token;
}

export async function getSessionByToken(
  token: string
): Promise<{ userId: string; householdId: string; email: string; role: string } | null> {
  const { rows } = await pool.query(
    `SELECT s.user_id, u.household_id, u.email, u.role
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > now()`,
    [token]
  );
  if (rows.length === 0) return null;
  return {
    userId: rows[0].user_id,
    householdId: rows[0].household_id,
    email: rows[0].email,
    role: rows[0].role,
  };
}

export async function deleteSession(token: string): Promise<void> {
  await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
}

export async function deleteExpiredSessions(): Promise<number> {
  const result = await pool.query('DELETE FROM sessions WHERE expires_at <= now()');
  return result.rowCount ?? 0;
}

// ============================================================
// Magic link token queries
// ============================================================

export async function createMagicLinkToken(email: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  await pool.query(
    `INSERT INTO magic_link_tokens (email, token, expires_at)
     VALUES ($1, $2, now() + interval '15 minutes')`,
    [email.toLowerCase().trim(), token]
  );
  return token;
}

export async function verifyMagicLinkToken(token: string): Promise<string | null> {
  const { rows } = await pool.query(
    `UPDATE magic_link_tokens
     SET used_at = now()
     WHERE token = $1 AND expires_at > now() AND used_at IS NULL
     RETURNING email`,
    [token]
  );
  return rows.length > 0 ? rows[0].email : null;
}

export async function markMagicLinkTokenUsed(token: string): Promise<void> {
  await pool.query(
    'UPDATE magic_link_tokens SET used_at = now() WHERE token = $1',
    [token]
  );
}

// ============================================================
// Kid PIN queries
// ============================================================

export async function getHouseholdPin(householdId: string): Promise<string> {
  const { rows } = await pool.query(
    'SELECT kid_pin FROM households WHERE id = $1',
    [householdId]
  );
  return rows[0]?.kid_pin ?? '1234';
}

export async function updateHouseholdPin(householdId: string, newPin: string): Promise<void> {
  await pool.query(
    'UPDATE households SET kid_pin = $1 WHERE id = $2',
    [newPin, householdId]
  );
}

// ============================================================
// Household queries
// ============================================================

export async function getHousehold(
  householdId: string
): Promise<{ id: string; name: string; kid_pin: string } | null> {
  const { rows } = await pool.query(
    'SELECT id, name, kid_pin FROM households WHERE id = $1',
    [householdId]
  );
  return rows.length > 0 ? rows[0] : null;
}
