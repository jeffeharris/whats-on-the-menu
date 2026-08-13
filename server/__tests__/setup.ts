import { beforeEach, afterAll } from 'vitest';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// Force test mode before any app/pool module is imported.
process.env.NODE_ENV = 'test';

// Route file uploads to a throwaway directory so tests never touch data/uploads.
process.env.UPLOADS_DIR = mkdtempSync(join(tmpdir(), 'wotm-uploads-'));

// A test-only DATABASE_URL overrides the default one, if provided.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

const dbUrl = process.env.DATABASE_URL ?? '';

// SAFETY GUARD: refuse to run destructive TRUNCATEs against anything that
// isn't clearly a throwaway test database. The database name must contain
// "test". This makes it impossible to wipe the dev/prod database by accident.
const dbName = (() => {
  try {
    return new URL(dbUrl).pathname.replace(/^\//, '');
  } catch {
    return '';
  }
})();

if (!/test/i.test(dbName)) {
  throw new Error(
    `Refusing to run integration tests: DATABASE_URL database name "${dbName || '(unparseable)'}" ` +
      `does not contain "test". Point DATABASE_URL/TEST_DATABASE_URL at a throwaway test database.`,
  );
}

// Imported after the guard so the pool connects to the vetted test DB.
const { default: pool } = await import('../db/pool.js');

// Tables truncated between tests. seed_food_templates is intentionally NOT
// truncated — it is global reference data loaded once from schema.sql.
const APP_TABLES = [
  'households',
  'users',
  'sessions',
  'magic_link_tokens',
  'household_invitations',
  'food_items',
  'uploads',
  'image_generations',
  'kid_profiles',
  'menus',
  'kid_selections',
  'meal_records',
  'meal_selections',
  'meal_reviews',
  'shared_menus',
  'shared_menu_responses',
];

beforeEach(async () => {
  await pool.query(`TRUNCATE ${APP_TABLES.join(', ')} RESTART IDENTITY CASCADE`);
});

afterAll(async () => {
  await pool.end();
});
