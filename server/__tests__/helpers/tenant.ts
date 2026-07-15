import { randomBytes } from 'crypto';
import pool from '../../db/pool.js';

export interface TestTenant {
  householdId: string;
  userId: string;
  email: string;
  sessionToken: string;
  /** Cookie header value to authenticate as this tenant's user. */
  cookie: string;
}

/**
 * Create a fully-formed tenant (household + user + active session) directly in
 * the database, bypassing the magic-link email flow. Returns everything a test
 * needs to make authenticated requests as this household.
 */
export async function createTenant(namePrefix = 'House'): Promise<TestTenant> {
  const suffix = randomBytes(4).toString('hex');
  const email = `${namePrefix.toLowerCase()}-${suffix}@example.com`;

  const household = await pool.query(
    `INSERT INTO households (name, kid_pin) VALUES ($1, $2) RETURNING id`,
    [`${namePrefix} ${suffix}`, '1234'],
  );
  const householdId = household.rows[0].id as string;

  const user = await pool.query(
    `INSERT INTO users (email, household_id) VALUES ($1, $2) RETURNING id`,
    [email, householdId],
  );
  const userId = user.rows[0].id as string;

  const sessionToken = randomBytes(32).toString('hex');
  await pool.query(
    `INSERT INTO sessions (user_id, token, expires_at)
     VALUES ($1, $2, now() + interval '30 days')`,
    [userId, sessionToken],
  );

  return {
    householdId,
    userId,
    email,
    sessionToken,
    cookie: `session=${sessionToken}`,
  };
}
