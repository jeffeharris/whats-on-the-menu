import { randomBytes } from 'crypto';
import pool from '../pool.js';

// ============================================================
// Types
// ============================================================

export interface HouseholdMember {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
}

export interface HouseholdInvitation {
  id: string;
  householdId: string;
  invitedBy: string;
  inviterEmail: string;
  email: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export interface InviteInfo {
  householdName: string;
  inviterEmail: string;
  status: string;
  expired: boolean;
}

// ============================================================
// Invitation queries
// ============================================================

export async function createInvitation(
  householdId: string,
  invitedBy: string,
  email: string,
): Promise<HouseholdInvitation> {
  const token = randomBytes(32).toString('hex');
  const { rows } = await pool.query(
    `INSERT INTO household_invitations (household_id, invited_by, email, token, expires_at)
     VALUES ($1, $2, $3, $4, now() + interval '7 days')
     RETURNING id, household_id, invited_by, email, status, expires_at, created_at`,
    [householdId, invitedBy, email.toLowerCase().trim(), token],
  );
  const row = rows[0];
  // Fetch inviter email for the response
  const { rows: userRows } = await pool.query('SELECT email FROM users WHERE id = $1', [invitedBy]);
  return {
    id: row.id,
    householdId: row.household_id,
    invitedBy: row.invited_by,
    inviterEmail: userRows[0]?.email ?? '',
    email: row.email,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

export async function getInvitationByToken(
  token: string,
): Promise<{ id: string; householdId: string; email: string; status: string; expiresAt: Date } | null> {
  const { rows } = await pool.query(
    `SELECT id, household_id, email, status, expires_at
     FROM household_invitations
     WHERE token = $1`,
    [token],
  );
  if (rows.length === 0) return null;
  return {
    id: rows[0].id,
    householdId: rows[0].household_id,
    email: rows[0].email,
    status: rows[0].status,
    expiresAt: new Date(rows[0].expires_at),
  };
}

export async function getInviteInfo(token: string): Promise<InviteInfo | null> {
  const { rows } = await pool.query(
    `SELECT h.name AS household_name, u.email AS inviter_email, hi.status, hi.expires_at
     FROM household_invitations hi
     JOIN households h ON h.id = hi.household_id
     JOIN users u ON u.id = hi.invited_by
     WHERE hi.token = $1`,
    [token],
  );
  if (rows.length === 0) return null;
  return {
    householdName: rows[0].household_name,
    inviterEmail: rows[0].inviter_email,
    status: rows[0].status,
    expired: new Date(rows[0].expires_at) < new Date(),
  };
}

export async function getPendingInvitations(
  householdId: string,
): Promise<HouseholdInvitation[]> {
  const { rows } = await pool.query(
    `SELECT hi.id, hi.household_id, hi.invited_by, hi.email, hi.status, hi.expires_at, hi.created_at,
            u.email AS inviter_email
     FROM household_invitations hi
     JOIN users u ON u.id = hi.invited_by
     WHERE hi.household_id = $1 AND hi.status = 'pending' AND hi.expires_at > now()
     ORDER BY hi.created_at DESC`,
    [householdId],
  );
  return rows.map((row) => ({
    id: row.id,
    householdId: row.household_id,
    invitedBy: row.invited_by,
    inviterEmail: row.inviter_email,
    email: row.email,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }));
}

export async function revokeInvitation(
  householdId: string,
  invitationId: string,
): Promise<boolean> {
  const result = await pool.query(
    `UPDATE household_invitations
     SET status = 'revoked'
     WHERE id = $1 AND household_id = $2 AND status = 'pending'`,
    [invitationId, householdId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getInvitationToken(invitationId: string): Promise<string | null> {
  const { rows } = await pool.query(
    'SELECT token FROM household_invitations WHERE id = $1',
    [invitationId],
  );
  return rows.length > 0 ? rows[0].token : null;
}

export async function acceptInvitation(
  token: string,
  userId: string,
): Promise<{ householdId: string } | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock and validate the invitation
    const { rows: inviteRows } = await client.query(
      `SELECT id, household_id, email, status, expires_at
       FROM household_invitations
       WHERE token = $1
       FOR UPDATE`,
      [token],
    );

    if (inviteRows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const invite = inviteRows[0];

    if (invite.status !== 'pending' || new Date(invite.expires_at) < new Date()) {
      await client.query('ROLLBACK');
      return null;
    }

    // Mark invitation as accepted
    await client.query(
      `UPDATE household_invitations
       SET status = 'accepted', accepted_at = now()
       WHERE id = $1`,
      [invite.id],
    );

    // Move user to the new household
    await client.query(
      `UPDATE users SET household_id = $1, role = 'member' WHERE id = $2`,
      [invite.household_id, userId],
    );

    // Delete user's old sessions (forces re-auth with new household context)
    await client.query('DELETE FROM sessions WHERE user_id = $1', [userId]);

    await client.query('COMMIT');
    return { householdId: invite.household_id };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ============================================================
// Member queries
// ============================================================

export async function getHouseholdMembers(
  householdId: string,
): Promise<HouseholdMember[]> {
  const { rows } = await pool.query(
    `SELECT id, email, display_name, role
     FROM users
     WHERE household_id = $1
     ORDER BY created_at ASC`,
    [householdId],
  );
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
  }));
}

export async function getUserRole(
  householdId: string,
  userId: string,
): Promise<string | null> {
  const { rows } = await pool.query(
    'SELECT role FROM users WHERE id = $1 AND household_id = $2',
    [userId, householdId],
  );
  return rows.length > 0 ? rows[0].role : null;
}

export async function removeHouseholdMember(
  householdId: string,
  userId: string,
): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify user is in this household and not the owner
    const { rows: userRows } = await client.query(
      'SELECT id, role FROM users WHERE id = $1 AND household_id = $2 FOR UPDATE',
      [userId, householdId],
    );

    if (userRows.length === 0) {
      await client.query('ROLLBACK');
      return false;
    }

    if (userRows[0].role === 'owner') {
      await client.query('ROLLBACK');
      throw Object.assign(new Error('Cannot remove the household owner'), { statusCode: 400 });
    }

    // Create a new empty household for the removed user
    const { rows: newHousehold } = await client.query(
      `INSERT INTO households (name, kid_pin) VALUES ('My Household', '1234') RETURNING id`,
    );

    // Move user to their new household
    await client.query(
      `UPDATE users SET household_id = $1, role = 'owner' WHERE id = $2`,
      [newHousehold[0].id, userId],
    );

    // Delete their sessions (forces re-auth)
    await client.query('DELETE FROM sessions WHERE user_id = $1', [userId]);

    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function leaveHousehold(
  householdId: string,
  userId: string,
): Promise<boolean> {
  // Check role first — owner cannot leave
  const role = await getUserRole(householdId, userId);
  if (!role) return false;
  if (role === 'owner') {
    throw Object.assign(new Error('Household owner cannot leave. Transfer ownership first.'), { statusCode: 400 });
  }

  return removeHouseholdMember(householdId, userId);
}

// ============================================================
// Cleanup
// ============================================================

export async function expirePendingInvitations(): Promise<number> {
  const result = await pool.query(
    `UPDATE household_invitations
     SET status = 'expired'
     WHERE status = 'pending' AND expires_at <= now()`,
  );
  return result.rowCount ?? 0;
}

// ============================================================
// Helpers for auth flow (signup with invite token)
// ============================================================

export async function acceptInvitationForNewUser(
  token: string,
  userId: string,
  email: string,
): Promise<{ householdId: string } | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock and validate the invitation
    const { rows: inviteRows } = await client.query(
      `SELECT id, household_id, email, status, expires_at
       FROM household_invitations
       WHERE token = $1
       FOR UPDATE`,
      [token],
    );

    if (inviteRows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const invite = inviteRows[0];

    if (invite.status !== 'pending' || new Date(invite.expires_at) < new Date()) {
      await client.query('ROLLBACK');
      return null;
    }

    // Verify email matches
    if (invite.email.toLowerCase() !== email.toLowerCase().trim()) {
      await client.query('ROLLBACK');
      return null;
    }

    // Mark invitation as accepted
    await client.query(
      `UPDATE household_invitations SET status = 'accepted', accepted_at = now() WHERE id = $1`,
      [invite.id],
    );

    // Move user to the invitation's household
    await client.query(
      `UPDATE users SET household_id = $1, role = 'member' WHERE id = $2`,
      [invite.household_id, userId],
    );

    await client.query('COMMIT');
    return { householdId: invite.household_id };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
