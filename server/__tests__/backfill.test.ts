import { describe, it, expect } from 'vitest';
import pool from '../db/pool.js';
import { createTenant } from './helpers/tenant.js';
import { upgrade as backfillUploads } from '../db/migrations/20260715_1410_backfill_uploads.js';

async function addFood(householdId: string, imageUrl: string) {
  await pool.query(
    `INSERT INTO food_items (household_id, name, image_url) VALUES ($1, $2, $3)`,
    [householdId, 'Food', imageUrl],
  );
}

async function addSharedMenuWithOption(householdId: string, token: string, optionImageUrl: string) {
  const groups = [
    { id: 'g1', label: 'Dinner', selectionPreset: 'pick-1', order: 0, options: [
      { id: 'o1', text: 'Item', imageUrl: optionImageUrl, order: 0 },
    ] },
  ];
  await pool.query(
    `INSERT INTO shared_menus (household_id, token, title, groups) VALUES ($1, $2, $3, $4)`,
    [householdId, token, 'Shared', JSON.stringify(groups)],
  );
}

async function runBackfill() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await backfillUploads(client);
    await client.query('COMMIT');
  } finally {
    client.release();
  }
}

describe('backfill_uploads migration', () => {
  it('attributes each /uploads/ reference to the correct household, across sources, deduped', async () => {
    const alice = await createTenant('Alice');
    const bob = await createTenant('Bob');

    // Alice: one food image.
    await addFood(alice.householdId, '/uploads/alice-image-1234567890.jpg');
    // Bob: a food image, a shared-menu option image, and a filename referenced by BOTH.
    await addFood(bob.householdId, '/uploads/bob-image-1234567890.jpg');
    await addSharedMenuWithOption(bob.householdId, 'tok-bob-1', '/uploads/bob-shared-1234567890.jpg');
    await addFood(bob.householdId, '/uploads/bob-dup-1234567890.jpg');
    await addSharedMenuWithOption(bob.householdId, 'tok-bob-2', '/uploads/bob-dup-1234567890.jpg');
    // A non-/uploads/ image (seed path) must be ignored.
    await addFood(bob.householdId, '/food-images/seed.jpg');

    await runBackfill();

    const { rows } = await pool.query(
      'SELECT household_id, filename FROM uploads ORDER BY filename',
    );

    // Alice's file → Alice; no cross-attribution.
    const alicePng = rows.filter((r) => r.filename.startsWith('alice-'));
    expect(alicePng).toHaveLength(1);
    expect(alicePng[0].household_id).toBe(alice.householdId);

    // Bob's food + shared-menu option both adopted, under Bob.
    const bobRows = rows.filter((r) => r.household_id === bob.householdId);
    const bobNames = bobRows.map((r) => r.filename).sort();
    expect(bobNames).toEqual([
      'bob-dup-1234567890.jpg',
      'bob-image-1234567890.jpg',
      'bob-shared-1234567890.jpg',
    ]);

    // The duplicate (food + shared option, same filename) produced exactly one row.
    const dupRows = rows.filter((r) => r.filename === 'bob-dup-1234567890.jpg');
    expect(dupRows).toHaveLength(1);

    // The /food-images/ reference was not adopted.
    expect(rows.some((r) => r.filename === 'seed.jpg')).toBe(false);
  });

  it('is idempotent — re-running does not duplicate or reassign rows', async () => {
    const alice = await createTenant('Alice');
    await addFood(alice.householdId, '/uploads/alice-image-1234567890.jpg');

    await runBackfill();
    await runBackfill();

    const { rows } = await pool.query('SELECT household_id FROM uploads');
    expect(rows).toHaveLength(1);
    expect(rows[0].household_id).toBe(alice.householdId);
  });
});
