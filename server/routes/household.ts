import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  createInvitation,
  getInviteInfo,
  getPendingInvitations,
  revokeInvitation,
  getInvitationToken,
  acceptInvitation,
  acceptInvitationForNewUser,
  getHouseholdMembers,
  getUserRole,
  removeHouseholdMember,
  leaveHousehold,
  getInvitationByToken,
} from '../db/queries/household.js';
import {
  findUserByEmail,
  createUser,
  createHousehold,
  createSession,
} from '../db/queries/auth.js';
import { initializeHouseholdFoods } from '../db/queries/foods.js';
import { initializeHouseholdPresets, getPresets } from '../db/queries/menus.js';
import pool from '../db/pool.js';
import { invitePartnerSchema } from '../validation/schemas.js';
import { resend, APP_URL, EMAIL_FROM, emailTemplate } from '../email.js';
import { setSessionCookie } from './auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../logger.js';

// ============================================================
// Public router (no auth required)
// ============================================================

export const publicHouseholdRouter = Router();

// GET /api/household/invite-info?token=xxx
publicHouseholdRouter.get('/invite-info', asyncHandler(async (req, res) => {
  const { token } = req.query;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Token is required' });
  }

  const info = await getInviteInfo(token);
  if (!info) {
    return res.status(404).json({ error: 'Invitation not found' });
  }

  res.json(info);
}, 'Failed to fetch invitation info'));

// GET /api/household/accept-invite?token=xxx
// One-click invite acceptance: validates token, creates account if needed, accepts invite, creates session, redirects home
//
// Keeps its local try/catch: this endpoint answers a clicked email link, so
// failures must redirect the browser, not return JSON via the error middleware.
publicHouseholdRouter.get('/accept-invite', async (req: Request, res: Response) => {
  const { token } = req.query;
  const errorRedirect = (error: string) =>
    res.redirect(`${APP_URL}/invite/accept?token=${token || ''}&error=${error}`);

  try {
    if (!token || typeof token !== 'string') {
      return errorRedirect('invalid');
    }

    // 1. Validate invitation
    const invite = await getInvitationByToken(token);
    if (!invite) {
      return errorRedirect('invalid');
    }
    if (invite.status !== 'pending') {
      return errorRedirect('already-accepted');
    }
    if (invite.expiresAt < new Date()) {
      return errorRedirect('expired');
    }

    // 2. Find or create user
    let user = await findUserByEmail(invite.email);
    let orphanHouseholdId: string | null = null;

    if (!user) {
      // New user: create a temporary household + user, then we'll move them
      const household = await createHousehold('My Household');
      orphanHouseholdId = household.id;
      user = await createUser(invite.email, household.id, undefined, 'owner');
      await initializeHouseholdFoods(household.id);
    }

    // 3. Accept invitation
    let accepted: { householdId: string } | null;
    if (orphanHouseholdId) {
      // New user path
      accepted = await acceptInvitationForNewUser(token, user.id, invite.email);
      if (accepted) {
        // Clean up the orphan household
        await pool.query('DELETE FROM households WHERE id = $1', [orphanHouseholdId]);
      }
    } else {
      // Existing user path — moves them to the new household, deletes old sessions
      accepted = await acceptInvitation(token, user.id);
    }

    if (!accepted) {
      return errorRedirect('invalid');
    }

    // 3b. Seed presets on the target household if it has none yet
    // (deliberately non-fatal: acceptance must still succeed if seeding fails)
    try {
      const { presets } = await getPresets(accepted.householdId);
      const hasAnyPreset = Object.values(presets).some((p) => p !== null);
      if (!hasAnyPreset) {
        await initializeHouseholdPresets(accepted.householdId);
      }
    } catch (e) {
      logger.error({ err: e }, 'Non-fatal: failed to seed presets for invited household');
    }

    // 4. Create session and set cookie
    const sessionToken = await createSession(user.id);
    setSessionCookie(res, sessionToken);

    // 5. Redirect home
    res.redirect(`${APP_URL}/`);
  } catch (error) {
    logger.error({ err: error }, 'Accept invite error');
    errorRedirect('invalid');
  }
});

// ============================================================
// Protected router (requires auth)
// ============================================================

const router = Router();

// POST /api/household/invite
router.post('/invite', asyncHandler(async (req, res) => {
  const result = invitePartnerSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message });
  }

  const { email } = result.data;
  const normalizedEmail = email.toLowerCase().trim();

  // Check if already a member of this household (also catches self-invite)
  const members = await getHouseholdMembers(req.householdId!);
  if (members.some((m) => m.email === normalizedEmail)) {
    return res.status(400).json({ error: 'This person is already a member of your household' });
  }

  // Preserve the unique-violation mapping: a pending invitation for the same
  // email hits the partial unique index and must surface as a 400, not a 500.
  const invitation = await createInvitation(req.householdId!, req.userId!, normalizedEmail)
    .catch((error: unknown) => {
      if ((error as { code?: string }).code === '23505') {
        throw new AppError('An invitation is already pending for this email', 400);
      }
      throw error;
    });

  // Get token for the email link
  const token = await getInvitationToken(invitation.id);
  const inviteUrl = `${APP_URL}/api/household/accept-invite?token=${token}`;

  if (resend) {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: normalizedEmail,
      subject: "You're invited to join a household on What's On The Menu",
      html: emailTemplate({
        preheader: `${invitation.inviterEmail} invited you to their household`,
        heading: "You're invited!",
        body: `<p style="margin:0 0 8px 0;"><strong>${invitation.inviterEmail}</strong> has invited you to join their household on What's On The Menu.</p>
               <p style="margin:0;">Tap the button below to view the invitation and join their family account.</p>`,
        buttonText: 'Join household',
        buttonUrl: inviteUrl,
        footnote: 'This invitation expires in 7 days.',
      }),
    });
  } else {
    logger.info({ email: normalizedEmail, inviteUrl }, 'Invitation link (email sending not configured)');
  }

  res.json({ success: true, invitation });
}, 'Failed to send invitation'));

// GET /api/household/invitations
router.get('/invitations', asyncHandler(async (req, res) => {
  const invitations = await getPendingInvitations(req.householdId!);
  res.json({ invitations });
}, 'Failed to fetch invitations'));

// DELETE /api/household/invitations/:id
router.delete('/invitations/:id', asyncHandler(async (req, res) => {
  const revoked = await revokeInvitation(req.householdId!, req.params.id);
  if (!revoked) {
    return res.status(404).json({ error: 'Invitation not found or already processed' });
  }
  res.json({ success: true });
}, 'Failed to revoke invitation'));

// GET /api/household/members
router.get('/members', asyncHandler(async (req, res) => {
  const members = await getHouseholdMembers(req.householdId!);
  res.json({ members });
}, 'Failed to fetch members'));

// Preserve the 400 mapping for domain rules thrown by the query layer as
// Error objects tagged with statusCode 400 (e.g. removing/leaving as owner).
function rethrowMembershipError(error: unknown): never {
  const err = error as { statusCode?: number; message?: string };
  if (err.statusCode === 400) {
    throw new AppError(err.message ?? 'Bad request', 400);
  }
  throw error;
}

// DELETE /api/household/members/:userId
router.delete('/members/:userId', asyncHandler(async (req, res) => {
  // Only owner can remove members
  const role = await getUserRole(req.householdId!, req.userId!);
  if (role !== 'owner') {
    return res.status(403).json({ error: 'Only the household owner can remove members' });
  }

  // Can't remove yourself
  if (req.params.userId === req.userId) {
    return res.status(400).json({ error: "You can't remove yourself. Use the leave option instead." });
  }

  const removed = await removeHouseholdMember(req.householdId!, req.params.userId)
    .catch(rethrowMembershipError);
  if (!removed) {
    return res.status(404).json({ error: 'Member not found' });
  }
  res.json({ success: true });
}, 'Failed to remove member'));

// POST /api/household/leave
router.post('/leave', asyncHandler(async (req, res) => {
  await leaveHousehold(req.householdId!, req.userId!).catch(rethrowMembershipError);
  res.clearCookie('session');
  res.json({ success: true });
}, 'Failed to leave household'));

export default router;
