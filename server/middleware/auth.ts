import type { Request, Response, NextFunction } from 'express';
import { getSessionByToken } from '../db/queries/auth.js';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.session;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const session = await getSessionByToken(token);

    if (!session) {
      res.clearCookie('session');
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    req.userId = session.userId;
    req.householdId = session.householdId;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
