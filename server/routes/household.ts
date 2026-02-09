import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  createInvitation,
  getInviteInfo,
  getPendingInvitations,
  revokeInvitation,
  getInvitationToken,
  acceptInvitation,
  getHouseholdMembers,
  getUserRole,
  removeHouseholdMember,
  leaveHousehold,
  getInvitationByToken,
} from '../db/queries/household.js';
import { invitePartnerSchema, acceptInvitationSchema } from '../validation/schemas.js';
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
    const inviteUrl = `${APP_URL}/invite/accept?token=${token}`;

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
          buttonText: 'View invitation',
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

// POST /api/household/accept
router.post('/accept', async (req: Request, res: Response) => {
  try {
    const result = acceptInvitationSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0].message });
    }

    const { token } = result.data;

    // Validate invitation
    const invite = await getInvitationByToken(token);
    if (!invite) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invite.status !== 'pending') {
      return res.status(400).json({ error: 'This invitation has already been used or revoked' });
    }

    if (invite.expiresAt < new Date()) {
      return res.status(400).json({ error: 'This invitation has expired. Please ask for a new one.' });
    }

    // Check if user is already in the target household
    const members = await getHouseholdMembers(invite.householdId);
    if (members.some((m) => m.id === req.userId)) {
      return res.status(400).json({ error: 'You are already a member of this household' });
    }

    const accepted = await acceptInvitation(token, req.userId!);
    if (!accepted) {
      return res.status(400).json({ error: 'Failed to accept invitation' });
    }

    // Clear session cookie since sessions were deleted during acceptance
    res.clearCookie('session');
    res.json({ success: true, householdId: accepted.householdId });
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

export default router;
