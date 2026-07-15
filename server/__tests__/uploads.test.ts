import { describe, it, expect } from 'vitest';
import request from 'supertest';
import sharp from 'sharp';
import { createApp } from '../app.js';
import pool from '../db/pool.js';
import { createTenant, type TestTenant } from './helpers/tenant.js';

const app = createApp();

// Default per-household limit is 25 MB (UPLOAD_STORAGE_LIMIT_MB).
const STORAGE_LIMIT_BYTES = 25 * 1024 * 1024;

// Fill a household's quota by inserting an uploads row at the limit.
async function fillQuota(householdId: string) {
  await pool.query(
    `INSERT INTO uploads (household_id, filename, size_bytes) VALUES ($1, $2, $3)`,
    [householdId, `big-${householdId}.jpg`, STORAGE_LIMIT_BYTES],
  );
}

// A small valid PNG that the upload route can process with sharp.
async function tinyPng(): Promise<Buffer> {
  return sharp({
    create: { width: 20, height: 20, channels: 3, background: { r: 200, g: 100, b: 50 } },
  })
    .png()
    .toBuffer();
}

// Returns a supertest Test (thenable) synchronously so callers can chain
// .expect(); making this async would unwrap the Test into a Response.
function uploadImage(tenant: TestTenant, png: Buffer) {
  return request(app)
    .post('/api/uploads')
    .set('Cookie', tenant.cookie)
    .attach('image', png, { filename: 'test.png', contentType: 'image/png' });
}

describe('Upload isolation', () => {
  it('records an upload and counts it toward the owning household only', async () => {
    const alice = await createTenant('Alice');
    const bob = await createTenant('Bob');
    const png = await tinyPng();

    const res = await uploadImage(alice, png).expect(201);
    expect(res.body.filename).toMatch(/\.jpg$/);
    expect(res.body.storage.used).toBeGreaterThan(0);

    // Bob's quota is unaffected by Alice's upload.
    const bobStorage = await request(app).get('/api/uploads/storage').set('Cookie', bob.cookie).expect(200);
    expect(bobStorage.body.used).toBe(0);

    // Alice's quota reflects her upload.
    const aliceStorage = await request(app).get('/api/uploads/storage').set('Cookie', alice.cookie).expect(200);
    expect(aliceStorage.body.used).toBe(res.body.storage.used);
  });

  it("does not let another household delete a file it doesn't own (404)", async () => {
    const alice = await createTenant('Alice');
    const bob = await createTenant('Bob');
    const png = await tinyPng();

    const uploaded = await uploadImage(alice, png).expect(201);
    const filename = uploaded.body.filename;

    // Bob tries to delete Alice's file — rejected, and Alice still owns it.
    await request(app).delete(`/api/uploads/${filename}`).set('Cookie', bob.cookie).expect(404);

    const aliceStorage = await request(app).get('/api/uploads/storage').set('Cookie', alice.cookie).expect(200);
    expect(aliceStorage.body.used).toBeGreaterThan(0);

    // Alice can delete her own file.
    await request(app).delete(`/api/uploads/${filename}`).set('Cookie', alice.cookie).expect(200);
    const after = await request(app).get('/api/uploads/storage').set('Cookie', alice.cookie).expect(200);
    expect(after.body.used).toBe(0);
  });

  it('rejects deletes for unknown files (404)', async () => {
    const alice = await createTenant('Alice');
    // Well-formed but nonexistent filename.
    await request(app)
      .delete('/api/uploads/00000000-0000-0000-0000-000000000000.jpg')
      .set('Cookie', alice.cookie)
      .expect(404);
  });
});

describe('Upload quota enforcement', () => {
  it('returns 507 when the household is over quota, without affecting other households', async () => {
    const alice = await createTenant('Alice');
    const bob = await createTenant('Bob');
    const png = await tinyPng();

    await fillQuota(alice.householdId);

    // Alice is over quota → 507 with a storage payload.
    const res = await uploadImage(alice, png).expect(507);
    expect(res.body.storage.used).toBeGreaterThanOrEqual(STORAGE_LIMIT_BYTES);

    // Bob is unaffected and can still upload.
    await uploadImage(bob, png).expect(201);
  });

  it('blocks image generation when the household is over quota (507)', async () => {
    const alice = await createTenant('Alice');
    await fillQuota(alice.householdId);

    // The quota pre-check fires before any external fetch, so no network mock
    // is needed — an over-quota household gets 507.
    await request(app)
      .get('/api/image-generation/pollinations?prompt=pizza')
      .set('Cookie', alice.cookie)
      .expect(507);
  });
});
