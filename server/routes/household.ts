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
import pool from '../db/pool.js';
import { invitePartnerSchema } from '../validation/schemas.js';
import { resend, APP_URL, EMAIL_FROM, emailTemplate } from '../email.js';

// ============================================================
// Public router (no auth required)
// ============================================================

export const publicHouseholdRouter = Router();

// GET /api/household/invite-info?token=xxx
publicHouseholdRouter.get('/invite-info', async (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token is required' });
    }

    const info = await getInviteInfo(token);
    if (!info) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    res.json(info);
  } catch (error) {
    console.error('Invite info error:', error);
    res.status(500).json({ error: 'Failed to fetch invitation info' });
  }
});

// GET /api/household/accept-invite?token=xxx
// One-click invite acceptance: validates token, creates account if needed, accepts invite, creates session, redirects home
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
      const household = await createHousehold('My Household', '1234');
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

    // 4. Create session and set cookie
    const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
    const sessionToken = await createSession(user.id);
    res.cookie('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SESSION_DURATION_MS,
      path: '/',
    });

    // 5. Redirect home
    res.redirect(`${APP_URL}/`);
  } catch (error) {
    console.error('Accept invite error:', error);
    errorRedirect('invalid');
  }
});

// ============================================================
// Protected router (requires auth)
// ============================================================

const router = Router();

// POST /api/household/invite
router.post('/invite', async (req: Request, res: Response) => {
  try {
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

    const invitation = await createInvitation(req.householdId!, req.userId!, normalizedEmail);

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
      console.log(`\n  Invitation link for ${normalizedEmail}: ${inviteUrl}\n`);
    }

    res.json({ success: true, invitation });
  } catch (error: unknown) {
    const pgErr = error as { code?: string };
    if (pgErr.code === '23505') {
      return res.status(400).json({ error: 'An invitation is already pending for this email' });
    }
    console.error('Invite error:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

// GET /api/household/invitations
router.get('/invitations', async (req: Request, res: Response) => {
  try {
    const invitations = await getPendingInvitations(req.householdId!);
    res.json({ invitations });
  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

// DELETE /api/household/invitations/:id
router.delete('/invitations/:id', async (req: Request, res: Response) => {
  try {
    const revoked = await revokeInvitation(req.householdId!, req.params.id);
    if (!revoked) {
      return res.status(404).json({ error: 'Invitation not found or already processed' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Revoke invitation error:', error);
    res.status(500).json({ error: 'Failed to revoke invitation' });
  }
});

// GET /api/household/members
router.get('/members', async (req: Request, res: Response) => {
  try {
    const members = await getHouseholdMembers(req.householdId!);
    res.json({ members });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// DELETE /api/household/members/:userId
router.delete('/members/:userId', async (req: Request, res: Response) => {
  try {
    // Only owner can remove members
    const role = await getUserRole(req.householdId!, req.userId!);
    if (role !== 'owner') {
      return res.status(403).json({ error: 'Only the household owner can remove members' });
    }

    // Can't remove yourself
    if (req.params.userId === req.userId) {
      return res.status(400).json({ error: "You can't remove yourself. Use the leave option instead." });
    }

    const removed = await removeHouseholdMember(req.householdId!, req.params.userId);
    if (!removed) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json({ success: true });
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    if (err.statusCode === 400) {
      return res.status(400).json({ error: err.message });
    }
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// POST /api/household/leave
router.post('/leave', async (req: Request, res: Response) => {
  try {
    await leaveHousehold(req.householdId!, req.userId!);
    res.clearCookie('session');
    res.json({ success: true });
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    if (err.statusCode === 400) {
      return res.status(400).json({ error: err.message });
    }
    console.error('Leave household error:', error);
    res.status(500).json({ error: 'Failed to leave household' });
  }
});

export default router;
