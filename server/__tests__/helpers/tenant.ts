import { randomBytes } from 'crypto';
import pool from '../../db/pool.js';

export interface TestTenant {
  readonly householdId: string;
  readonly userId: string;
  readonly email: string;
  readonly sessionToken: string;
  readonly role: 'owner' | 'member';
  /** Cookie header value to authenticate as this tenant's user. */
  readonly cookie: string;
}

export interface CreateTenantOptions {
  /** Role of the created user. Defaults to 'owner' (a lone household user). */
  role?: 'owner' | 'member';
}

/**
 * Create a fully-formed tenant (household + user + active session) directly in
 * the database, bypassing the magic-link email flow. Returns everything a test
 * needs to make authenticated requests as this household.
 */
export async function createTenant(
  namePrefix = 'House',
  options: CreateTenantOptions = {},
): Promise<TestTenant> {
  const role = options.role ?? 'owner';
  const suffix = randomBytes(4).toString('hex');
  const email = `${namePrefix.toLowerCase()}-${suffix}@example.com`;

  const household = await pool.query(
    `INSERT INTO households (name, kid_pin) VALUES ($1, $2) RETURNING id`,
    [`${namePrefix} ${suffix}`, '1234'],
  );
  const householdId = household.rows[0].id as string;

  const user = await pool.query(
    `INSERT INTO users (email, household_id, role) VALUES ($1, $2, $3) RETURNING id`,
    [email, householdId, role],
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
    role,
    cookie: `session=${sessionToken}`,
  };
}

/**
 * Add an additional member user (with their own session) to an existing
 * household — useful for testing owner-only vs member permissions.
 */
export async function addMember(
  householdId: string,
  role: 'owner' | 'member' = 'member',
): Promise<{ userId: string; cookie: string; email: string }> {
  const suffix = randomBytes(4).toString('hex');
  const email = `member-${suffix}@example.com`;
  const user = await pool.query(
    `INSERT INTO users (email, household_id, role) VALUES ($1, $2, $3) RETURNING id`,
    [email, householdId, role],
  );
  const userId = user.rows[0].id as string;
  const sessionToken = randomBytes(32).toString('hex');
  await pool.query(
    `INSERT INTO sessions (user_id, token, expires_at)
     VALUES ($1, $2, now() + interval '30 days')`,
    [userId, sessionToken],
  );
  return { userId, cookie: `session=${sessionToken}`, email };
}
