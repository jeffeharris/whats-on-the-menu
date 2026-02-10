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
  getHouseholdPin,
  updateHouseholdPin,
  getHousehold,
} from '../db/queries/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { initializeHouseholdFoods } from '../db/queries/foods.js';
import { initializeHouseholdPresets } from '../db/queries/menus.js';
import { signupSchema, loginSchema, verifyPinSchema, updatePinSchema } from '../validation/schemas.js';
import { resend, APP_URL, EMAIL_FROM, emailTemplate } from '../email.js';

// ============================================================
// Email sending helper
// ============================================================

async function sendMagicLinkEmail(email: string, token: string): Promise<void> {
  const url = `${APP_URL}/auth/verify?token=${token}`;

  if (resend) {
    await resend.emails.send({
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
  } else {
    console.log(`\n  Magic link for ${email}: ${url}\n`);
  }
}

// ============================================================
// Cookie helper
// ============================================================

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function setSessionCookie(res: Response, token: string) {
  res.cookie('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_DURATION_MS,
    path: '/',
  });
}

// ============================================================
// Router
// ============================================================

const router = Router();

// POST /api/auth/signup
router.post('/signup', async (req: Request, res: Response) => {
  try {
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
    const household = await createHousehold(householdName || 'My Household', '1234');
    const user = await createUser(email, household.id, undefined, 'owner');
    await initializeHouseholdFoods(household.id);
    try { await initializeHouseholdPresets(household.id); } catch (e) { console.error('Non-fatal: failed to seed presets', e); }

    const token = await createMagicLinkToken(email);
    await sendMagicLinkEmail(email, token);

    res.json({ success: true });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
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
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to send login link' });
  }
});

// GET /api/auth/verify?token=xxx
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
    console.error('Verify error:', error);
    res.redirect(`${APP_URL}/login?error=invalid`);
  }
});

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response) => {
  try {
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
        ? { id: household.id, name: household.name }
        : null,
    });
  } catch (error) {
    console.error('Auth me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout (protected)
router.post('/logout', requireAuth, async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.session;
    if (token) {
      await deleteSession(token);
    }
    res.clearCookie('session');
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to log out' });
  }
});

// POST /api/auth/verify-pin (protected)
router.post('/verify-pin', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = verifyPinSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0].message });
    }
    const { pin } = result.data;
    const householdPin = await getHouseholdPin(req.householdId!);
    res.json({ valid: pin === householdPin });
  } catch (error) {
    console.error('Verify PIN error:', error);
    res.status(500).json({ error: 'Failed to verify PIN' });
  }
});

// POST /api/auth/update-pin (protected)
router.post('/update-pin', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = updatePinSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0].message });
    }
    const { currentPin, newPin } = result.data;

    const householdPin = await getHouseholdPin(req.householdId!);
    if (currentPin !== householdPin) {
      return res.status(403).json({ error: 'Current PIN is incorrect' });
    }

    await updateHouseholdPin(req.householdId!, newPin);
    res.json({ success: true });
  } catch (error) {
    console.error('Update PIN error:', error);
    res.status(500).json({ error: 'Failed to update PIN' });
  }
});

export default router;
