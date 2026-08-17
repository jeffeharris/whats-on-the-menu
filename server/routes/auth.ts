import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  findUserByEmail,
  createUser,
  createHousehold,
  createSession,
  getSessionByToken,
  deleteSession,
  createMagicLinkToken,
  verifyMagicLinkToken,
  setGrownUpCheck,
  getHousehold,
} from '../db/queries/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { initializeHouseholdFoods } from '../db/queries/foods.js';
import { initializeHouseholdPresets } from '../db/queries/menus.js';
import { signupSchema, loginSchema, grownUpCheckSchema } from '../validation/schemas.js';
import { resend, APP_URL, EMAIL_FROM, emailTemplate } from '../email.js';
import { logger } from '../logger.js';

// ============================================================
// Email sending helper
// ============================================================

async function sendMagicLinkEmail(email: string, token: string): Promise<void> {
  const url = `${APP_URL}/auth/verify?token=${token}`;

  if (resend) {
    // The SDK never throws on API errors — it resolves { data, error } even
    // on failure — so a failed send would otherwise pass silently and the
    // caller would report success despite no email going out.
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: 'Your login link',
      html: emailTemplate({
        preheader: 'Click to log in to your family account',
        heading: 'Log in to your account',
        body: '<p style="margin:0;">Tap the button below to sign in to your What\'s On The Menu account.</p>',
        buttonText: 'Log in',
        buttonUrl: url,
        footnote: 'This link expires in 15 minutes.',
      }),
    });
    if (error) {
      logger.error({ err: error }, 'Resend failed to send magic link email');
    }
  } else {
    logger.info({ email, url }, 'Magic link (email sending not configured)');
  }
}

// ============================================================
// Cookie helper
// ============================================================

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Single source of truth for the session cookie.
 *
 * Every flow that signs a user in — magic link, household invite — arrives here
 * through a link in an email, so they share one set of constraints and must
 * share this helper. The accept-invite route used to keep its own inline copy,
 * which silently missed the change below.
 */
export function setSessionCookie(res: Response, token: string) {
  res.cookie('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    // 'lax' is the conventional choice for a session cookie and costs nothing
    // here: it still withholds the cookie on cross-site POST/PUT/DELETE, and
    // every authenticated GET in this API is read-only.
    //
    // Note for anyone tracing the empty-library bug back to this line: 'strict'
    // did NOT cause it. Production logs from that incident show 'strict'
    // cookies being sent normally on the app's same-origin XHRs — the requests
    // that 401'd simply had no session yet. The bug was entirely client-side
    // provider mount ordering. This is defence in depth, not the fix.
    sameSite: 'lax',
    maxAge: SESSION_DURATION_MS,
    path: '/',
  });
}

// ============================================================
// Router
// ============================================================

const router = Router();

// POST /api/auth/signup
router.post('/signup', asyncHandler(async (req, res) => {
  const result = signupSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message });
  }
  const { email, householdName } = result.data;

  const existing = await findUserByEmail(email);
  if (existing) {
    return res.status(400).json({ error: 'An account with that email already exists' });
  }

  // Create household + user
  const household = await createHousehold(householdName || 'My Household');
  await createUser(email, household.id, undefined, 'owner');
  await initializeHouseholdFoods(household.id);
  // Deliberately non-fatal: signup must still succeed if preset seeding fails.
  try { await initializeHouseholdPresets(household.id); } catch (e) { logger.error({ err: e }, 'Non-fatal: failed to seed presets'); }

  const token = await createMagicLinkToken(email);
  await sendMagicLinkEmail(email, token);

  res.json({ success: true });
}, 'Failed to create account'));

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message });
  }
  const { email } = result.data;

  const user = await findUserByEmail(email);
  if (!user) {
    // Don't reveal whether the email exists — add delay to prevent timing attacks
    const delay = 100 + Math.floor(Math.random() * 50);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return res.json({ success: true });
  }

  const token = await createMagicLinkToken(email);
  await sendMagicLinkEmail(email, token);

  res.json({ success: true });
}, 'Failed to send login link'));

// GET /api/auth/verify?token=xxx
//
// Keeps its local try/catch: this endpoint answers a clicked email link, so
// failures must redirect the browser, not return JSON via the error middleware.
router.get('/verify', async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.redirect(`${APP_URL}/login?error=invalid`);
    }

    const email = await verifyMagicLinkToken(token);
    if (!email) {
      return res.redirect(`${APP_URL}/login?error=invalid`);
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.redirect(`${APP_URL}/login?error=invalid`);
    }

    const sessionToken = await createSession(user.id);
    setSessionCookie(res, sessionToken);

    res.redirect(`${APP_URL}/`);
  } catch (error) {
    logger.error({ err: error }, 'Verify error');
    res.redirect(`${APP_URL}/login?error=invalid`);
  }
});

// GET /api/auth/me
router.get('/me', asyncHandler(async (req, res) => {
  const token = req.cookies?.session;

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const session = await getSessionByToken(token);
  if (!session) {
    res.clearCookie('session');
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const household = await getHousehold(session.householdId);

  res.json({
    user: {
      id: session.userId,
      email: session.email,
      displayName: null, // Could be fetched from users table if needed
      role: session.role,
    },
    household: household
      ? { id: household.id, name: household.name, grownUpCheckEnabled: household.grownup_check_enabled }
      : null,
  });
}, 'Internal server error'));

// POST /api/auth/logout (protected)
router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  const token = req.cookies?.session;
  if (token) {
    await deleteSession(token);
  }
  res.clearCookie('session');
  res.json({ success: true });
}, 'Failed to log out'));

// PUT /api/auth/grownup-check (protected) — turn the grown-up check on or off
//
// There is no PIN to supply. Kid mode gates parent access with a random
// challenge spelled out in words, which an adult reads and a pre-reader
// cannot, so nothing secret is stored or compared. The caller is already an
// authenticated member of this household, which is the actual access control.
router.put('/grownup-check', requireAuth, asyncHandler(async (req, res) => {
  const result = grownUpCheckSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message });
  }
  await setGrownUpCheck(req.householdId!, result.data.enabled);
  res.json({ success: true, grownUpCheckEnabled: result.data.enabled });
}, 'Failed to update the grown-up check'));

export default router;
