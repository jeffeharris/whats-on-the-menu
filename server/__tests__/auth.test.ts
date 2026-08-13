import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { randomBytes } from 'crypto';
import { createApp } from '../app.js';
import pool from '../db/pool.js';
import { createTenant } from './helpers/tenant.js';
import { createMagicLinkToken, verifyMagicLinkToken } from '../db/queries/auth.js';

const app = createApp();

describe('Authentication wall', () => {
  it('rejects protected requests with no session cookie (401)', async () => {
    await request(app).get('/api/foods').expect(401);
    await request(app).get('/api/profiles').expect(401);
    await request(app).get('/api/menus').expect(401);
  });

  it('rejects an unknown/garbage session token (401)', async () => {
    await request(app).get('/api/foods').set('Cookie', 'session=not-a-real-token').expect(401);
  });

  it('rejects an expired session and does not leak data (401)', async () => {
    const tenant = await createTenant('Expired');
    const expiredToken = randomBytes(32).toString('hex');
    await pool.query(
      `INSERT INTO sessions (user_id, token, expires_at)
       VALUES ($1, $2, now() - interval '1 day')`,
      [tenant.userId, expiredToken],
    );

    await request(app).get('/api/foods').set('Cookie', `session=${expiredToken}`).expect(401);
  });

  it('accepts a valid session', async () => {
    const tenant = await createTenant('Valid');
    await request(app).get('/api/foods').set('Cookie', tenant.cookie).expect(200);
  });

  it('/api/auth/me returns 401 without a cookie', async () => {
    await request(app).get('/api/auth/me').expect(401);
  });
});

describe('Session cookie attributes', () => {
  it('sets SameSite=Lax so the cookie survives the click from an email client', async () => {
    // Regression guard. With SameSite=Strict the browser withholds the session
    // cookie on the cross-site navigation out of a mail client, so the app
    // booted unauthenticated off a magic link and rendered an empty library
    // over a household full of data.
    const tenant = await createTenant('Cookie');
    const token = await createMagicLinkToken(tenant.email);

    const res = await request(app).get(`/api/auth/verify?token=${token}`).expect(302);

    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    const sessionCookie = [...setCookie].find((c) => c.startsWith('session='));
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie).toMatch(/SameSite=Lax/i);
    expect(sessionCookie).not.toMatch(/SameSite=Strict/i);
    expect(sessionCookie).toMatch(/HttpOnly/i);
  });
});

describe('Magic link tokens', () => {
  it('are single-use: the second verification fails', async () => {
    const email = `magic-${randomBytes(4).toString('hex')}@example.com`;
    const token = await createMagicLinkToken(email);

    const first = await verifyMagicLinkToken(token);
    expect(first).toBe(email);

    const second = await verifyMagicLinkToken(token);
    expect(second).toBeNull();
  });

  it('reject unknown tokens', async () => {
    const result = await verifyMagicLinkToken('nonexistent-token');
    expect(result).toBeNull();
  });
});

describe('Login does not reveal whether an email exists', () => {
  it('returns success for an unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });
});
