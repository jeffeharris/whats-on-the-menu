import { Router } from 'express';
import type { Request, Response } from 'express';
import { Resend } from 'resend';
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

// ============================================================
// Email sending helper
// ============================================================

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

async function sendMagicLinkEmail(email: string, token: string): Promise<void> {
  const url = `${APP_URL}/auth/verify?token=${token}`;

  if (resend) {
    await resend.emails.send({
      from: "What's On The Menu <noreply@whatsonthemenu.app>",
      to: email,
      subject: 'Your login link',
      html: `<p>Click <a href="${url}">here</a> to log in to What's On The Menu.</p><p>This link expires in 15 minutes.</p><p>If you didn't request this, you can safely ignore this email.</p>`,
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
    sameSite: 'lax',
    maxAge: SESSION_DURATION_MS,
    path: '/',
  });
}

// ============================================================
// Basic email validation
// ============================================================

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============================================================
// Router
// ============================================================

const router = Router();

// POST /api/auth/signup
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, householdName } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'A valid email is required' });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'An account with that email already exists' });
    }

    const household = await createHousehold(householdName || 'My Household', '1234');
    await createUser(email, household.id);

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
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'A valid email is required' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      // Don't reveal whether the email exists — just log a warning
      console.warn(`Login attempt for unknown email: ${email}`);
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
    const { pin } = req.body;
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
    const { currentPin, newPin } = req.body;

    const householdPin = await getHouseholdPin(req.householdId!);
    if (currentPin !== householdPin) {
      return res.status(403).json({ error: 'Current PIN is incorrect' });
    }

    if (!/^\d{4}$/.test(newPin)) {
      return res.status(400).json({ error: 'New PIN must be exactly 4 digits' });
    }

    await updateHouseholdPin(req.householdId!, newPin);
    res.json({ success: true });
  } catch (error) {
    console.error('Update PIN error:', error);
    res.status(500).json({ error: 'Failed to update PIN' });
  }
});

export default router;
