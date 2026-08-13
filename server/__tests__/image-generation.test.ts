// Caps are read from the environment when the route module is first imported,
// so set small limits *before* the dynamic import below.
process.env.IMAGE_GEN_DAILY_LIMIT_HOUSEHOLD = '2';
process.env.IMAGE_GEN_DAILY_LIMIT_GLOBAL = '3';
process.env.RUNWARE_API_KEY = 'test-key-not-used';

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import pool from '../db/pool.js';
import { createTenant, type TestTenant } from './helpers/tenant.js';
import {
  reserveGeneration,
  releaseGeneration,
  countHouseholdGenerations,
} from '../db/queries/image-generations.js';

const { createApp } = await import('../app.js');
const app = createApp();

const WINDOW_MS = 24 * 60 * 60 * 1000;

/** Burn `count` of a household's daily allowance without calling the provider. */
async function fillQuota(tenant: TestTenant, count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    await pool.query(
      'INSERT INTO image_generations (household_id, model) VALUES ($1, $2)',
      [tenant.householdId, 'test-model'],
    );
  }
}

function generate(tenant: TestTenant) {
  return request(app)
    .post('/api/image-generation/runware')
    .set('Cookie', tenant.cookie)
    .send({ prompt: 'a friendly cartoon apple' });
}

describe('Image generation cost caps', () => {
  it('rejects a household over its daily cap before calling the provider', async () => {
    const alice = await createTenant('Alice');
    await fillQuota(alice, 2);

    const res = await generate(alice).expect(429);
    expect(res.body.error).toMatch(/all 2 AI images/i);
  });

  it('counts each household separately', async () => {
    const alice = await createTenant('Alice');
    const bob = await createTenant('Bob');

    await fillQuota(alice, 2);

    expect(await countHouseholdGenerations(alice.householdId, WINDOW_MS)).toBe(2);
    expect(await countHouseholdGenerations(bob.householdId, WINDOW_MS)).toBe(0);

    // Bob is under his own cap, so he is not blocked by Alice's usage.
    const reservation = await reserveGeneration(bob.householdId, 'm', 2, 100, WINDOW_MS);
    expect(reservation.ok).toBe(true);
  });

  it('enforces the global cap even when a household is under its own', async () => {
    const alice = await createTenant('Alice');
    const bob = await createTenant('Bob');
    const carol = await createTenant('Carol');

    // 3 generations across two households reaches the global cap of 3.
    await fillQuota(alice, 2);
    await fillQuota(bob, 1);

    // Carol has used nothing, but the global budget is gone.
    const res = await generate(carol).expect(429);
    expect(res.body.error).toMatch(/busy right now/i);
  });

  it('ignores generations outside the rolling window', async () => {
    const alice = await createTenant('Alice');
    await pool.query(
      `INSERT INTO image_generations (household_id, model, created_at)
       VALUES ($1, $2, now() - interval '25 hours')`,
      [alice.householdId, 'test-model'],
    );

    expect(await countHouseholdGenerations(alice.householdId, WINDOW_MS)).toBe(0);
  });

  it('releases a reservation so a failed generation is not charged to the user', async () => {
    const alice = await createTenant('Alice');

    const reservation = await reserveGeneration(alice.householdId, 'm', 2, 100, WINDOW_MS);
    expect(reservation.ok).toBe(true);
    expect(await countHouseholdGenerations(alice.householdId, WINDOW_MS)).toBe(1);

    if (reservation.ok) {
      await releaseGeneration(reservation.id);
    }
    expect(await countHouseholdGenerations(alice.householdId, WINDOW_MS)).toBe(0);
  });

  it('reports remaining allowance for the household', async () => {
    const alice = await createTenant('Alice');
    await fillQuota(alice, 1);

    const res = await request(app)
      .get('/api/image-generation/usage')
      .set('Cookie', alice.cookie)
      .expect(200);

    expect(res.body).toMatchObject({ used: 1, limit: 2, remaining: 1, enabled: true });
  });

  it('requires authentication', async () => {
    await request(app).post('/api/image-generation/runware').send({ prompt: 'x' }).expect(401);
    await request(app).get('/api/image-generation/usage').expect(401);
  });
});
