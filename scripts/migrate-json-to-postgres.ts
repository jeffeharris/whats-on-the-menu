/**
 * migrate-json-to-postgres.ts
 *
 * Standalone migration script that reads JSON data files from data/ and
 * inserts them into the PostgreSQL database defined in DATABASE_URL.
 *
 * Usage:
 *   npx tsx scripts/migrate-json-to-postgres.ts
 *
 * The script is idempotent — it TRUNCATEs all tables at the start of the
 * transaction so it can be run multiple times safely.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import pg from 'pg';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

const DEFAULT_HOUSEHOLD_ID = '00000000-0000-0000-0000-000000000000';
const HOUSEHOLD_NAME = process.env.HOUSEHOLD_NAME || 'Harris Family';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readJsonFileSafe<T>(filename: string, defaultValue: T): T {
  const filepath = join(DATA_DIR, filename);
  if (!existsSync(filepath)) {
    console.warn(`  ⚠  ${filename} not found — skipping`);
    return defaultValue;
  }
  try {
    const raw = readFileSync(filepath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`  ⚠  Failed to parse ${filename} — skipping`, err);
    return defaultValue;
  }
}

function tsToIso(ms: number | undefined | null): string | null {
  if (ms == null || ms === 0) return null;
  return new Date(ms).toISOString();
}

// ---------------------------------------------------------------------------
// Legacy migration helpers (same logic as route files)
// ---------------------------------------------------------------------------

interface LegacyFoodItem {
  id: string;
  name: string;
  imageUrl: string | null;
  tags?: string[];
  category?: 'main' | 'side';
}

function migrateFood(food: LegacyFoodItem): { name: string; imageUrl: string | null; tags: string[] } {
  let tags = food.tags || [];
  if ((!tags || tags.length === 0) && food.category) {
    // Convert legacy category to tag
    if (food.category === 'main') {
      tags = ['Protein'];
    } else if (food.category === 'side') {
      tags = ['Veggie'];
    }
  }
  return { name: food.name, imageUrl: food.imageUrl || null, tags };
}

interface LegacyMenuGroup {
  id: string;
  label: string;
  foodIds: string[];
  selectionPreset: string;
  order: number;
  filterTags?: string[];
  excludeTags?: string[];
}

interface LegacySavedMenu {
  id: string;
  name: string;
  groups?: LegacyMenuGroup[];
  createdAt: number;
  updatedAt: number;
  presetSlot?: string;
  mains?: string[];
  sides?: string[];
}

function migrateMenu(menu: LegacySavedMenu): { groups: LegacyMenuGroup[] } {
  if (menu.groups && Array.isArray(menu.groups) && menu.groups.length > 0) {
    return { groups: menu.groups };
  }
  const groups: LegacyMenuGroup[] = [];
  if (menu.mains && menu.mains.length > 0) {
    groups.push({
      id: 'main-group',
      label: 'Main Dishes',
      foodIds: menu.mains,
      selectionPreset: 'pick-1',
      order: 0,
    });
  }
  if (menu.sides && menu.sides.length > 0) {
    groups.push({
      id: 'side-group',
      label: 'Side Dishes',
      foodIds: menu.sides,
      selectionPreset: 'pick-1-2',
      order: 1,
    });
  }
  return { groups };
}

interface LegacyGroupSelections {
  [groupId: string]: string[];
}

interface LegacyKidSelection {
  kidId: string;
  selections?: LegacyGroupSelections;
  timestamp: number;
  mainId?: string | null;
  sideIds?: string[];
}

function migrateSelection(sel: LegacyKidSelection): LegacyGroupSelections {
  if (sel.selections && typeof sel.selections === 'object' && Object.keys(sel.selections).length > 0) {
    return sel.selections;
  }
  const selections: LegacyGroupSelections = {};
  if (sel.mainId !== undefined) {
    selections['main-group'] = sel.mainId ? [sel.mainId] : [];
  }
  if (sel.sideIds !== undefined) {
    selections['side-group'] = sel.sideIds || [];
  }
  return selections;
}

interface LegacyKidMealReview {
  kidId: string;
  completions?: { [foodId: string]: string | null };
  earnedStar?: boolean;
  mainCompletion?: string | null;
  sideCompletions?: { [sideId: string]: string | null };
}

function migrateReviewCompletions(review: LegacyKidMealReview): { [foodId: string]: string | null } {
  if (review.completions && typeof review.completions === 'object' && Object.keys(review.completions).length > 0) {
    return review.completions;
  }
  // Migrate from legacy mainCompletion / sideCompletions
  const completions: { [foodId: string]: string | null } = {};
  // We don't know the mainId here, so we skip mainCompletion unless we match it up.
  // For legacy reviews the mainCompletion is keyed by the food id already in some cases.
  // Best effort: if mainCompletion exists but we have no id, we can't map it.
  if (review.sideCompletions) {
    for (const [foodId, status] of Object.entries(review.sideCompletions)) {
      completions[foodId] = status;
    }
  }
  return completions;
}

// Remap food IDs inside a groups JSONB structure
function remapGroupsFoodIds(groups: LegacyMenuGroup[], foodIdMap: Map<string, string>): LegacyMenuGroup[] {
  return groups.map((g) => ({
    ...g,
    foodIds: g.foodIds.map((oldId) => {
      const newId = foodIdMap.get(oldId);
      if (!newId) {
        console.warn(`    ⚠  Food id ${oldId} not found in mapping — keeping as-is`);
        return oldId;
      }
      return newId;
    }),
  }));
}

// Remap food IDs inside a selections JSONB structure
function remapSelectionsJsonb(
  selections: LegacyGroupSelections,
  foodIdMap: Map<string, string>,
): LegacyGroupSelections {
  const result: LegacyGroupSelections = {};
  for (const [groupId, foodIds] of Object.entries(selections)) {
    result[groupId] = foodIds.map((oldId) => {
      const newId = foodIdMap.get(oldId);
      if (!newId) {
        console.warn(`    ⚠  Food id ${oldId} not found in selection mapping — keeping as-is`);
        return oldId;
      }
      return newId;
    });
  }
  return result;
}

// Remap food IDs in completions keys
function remapCompletionsKeys(
  completions: { [foodId: string]: string | null },
  foodIdMap: Map<string, string>,
): { [foodId: string]: string | null } {
  const result: { [foodId: string]: string | null } = {};
  for (const [oldFoodId, status] of Object.entries(completions)) {
    const newId = foodIdMap.get(oldFoodId);
    if (!newId) {
      console.warn(`    ⚠  Food id ${oldFoodId} not found in completions mapping — keeping as-is`);
      result[oldFoodId] = status;
    } else {
      result[newId] = status;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// JSON data shape types
// ---------------------------------------------------------------------------

interface FoodsData {
  items: LegacyFoodItem[];
}

interface ProfileData {
  id: string;
  name: string;
  avatarColor: string;
  avatarAnimal?: string;
}

interface ProfilesData {
  profiles: ProfileData[];
}

interface MenusData {
  menus: LegacySavedMenu[];
  activeMenuId: string | null;
  selections: LegacyKidSelection[];
}

interface MealRecord {
  id: string;
  menuId: string;
  date: number;
  selections: LegacyKidSelection[];
  reviews: LegacyKidMealReview[];
  completedAt: number;
}

interface MealsData {
  meals: MealRecord[];
}

interface SharedMenuData {
  id: string;
  token: string;
  title: string;
  description?: string;
  groups: unknown[];
  createdAt: number;
  isActive: boolean;
}

interface SharedMenuResponseData {
  id: string;
  menuId: string;
  respondentName: string;
  selections: { [groupId: string]: string[] };
  timestamp: number;
}

interface SharedMenusData {
  menus: SharedMenuData[];
  responses: SharedMenuResponseData[];
}

// ---------------------------------------------------------------------------
// Main migration
// ---------------------------------------------------------------------------

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ------------------------------------------------------------------
    // Idempotency: truncate all tables (CASCADE handles FKs)
    // ------------------------------------------------------------------
    console.log('Truncating existing data...');
    await client.query(`
      TRUNCATE
        shared_menu_responses,
        shared_menus,
        meal_reviews,
        meal_selections,
        meal_records,
        kid_selections,
        menus,
        kid_profiles,
        food_items,
        households
      CASCADE
    `);

    // ------------------------------------------------------------------
    // 1. Insert default household
    // ------------------------------------------------------------------
    console.log(`\nCreating household "${HOUSEHOLD_NAME}"...`);
    await client.query(
      `INSERT INTO households (id, name) VALUES ($1, $2)`,
      [DEFAULT_HOUSEHOLD_ID, HOUSEHOLD_NAME],
    );

    // ------------------------------------------------------------------
    // 2. Foods
    // ------------------------------------------------------------------
    console.log('\nMigrating foods...');
    const foodsData = readJsonFileSafe<FoodsData>('foods.json', { items: [] });
    const foodIdMap = new Map<string, string>(); // old → new
    let foodCount = 0;

    for (const food of foodsData.items) {
      const newId = randomUUID();
      const migrated = migrateFood(food);
      foodIdMap.set(food.id, newId);

      await client.query(
        `INSERT INTO food_items (id, household_id, name, image_url, tags, legacy_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [newId, DEFAULT_HOUSEHOLD_ID, migrated.name, migrated.imageUrl, migrated.tags, food.id],
      );
      foodCount++;
    }
    console.log(`  ✓ ${foodCount} foods migrated`);

    // ------------------------------------------------------------------
    // 3. Profiles
    // ------------------------------------------------------------------
    console.log('\nMigrating profiles...');
    const profilesData = readJsonFileSafe<ProfilesData>('profiles.json', { profiles: [] });
    const profileIdMap = new Map<string, string>(); // old → new
    const profileNameMap = new Map<string, string>(); // old → name
    let profileCount = 0;

    for (const profile of profilesData.profiles) {
      const newId = randomUUID();
      profileIdMap.set(profile.id, newId);
      profileNameMap.set(profile.id, profile.name);

      await client.query(
        `INSERT INTO kid_profiles (id, household_id, name, avatar_color, avatar_animal, legacy_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [newId, DEFAULT_HOUSEHOLD_ID, profile.name, profile.avatarColor, profile.avatarAnimal || null, profile.id],
      );
      profileCount++;
    }
    console.log(`  ✓ ${profileCount} profiles migrated`);

    // ------------------------------------------------------------------
    // 4. Menus
    // ------------------------------------------------------------------
    console.log('\nMigrating menus...');
    const menusData = readJsonFileSafe<MenusData>('menus.json', { menus: [], activeMenuId: null, selections: [] });
    const menuIdMap = new Map<string, string>(); // old → new
    let menuCount = 0;

    for (const menu of menusData.menus) {
      const newId = randomUUID();
      menuIdMap.set(menu.id, newId);

      const { groups } = migrateMenu(menu);
      const remappedGroups = remapGroupsFoodIds(groups, foodIdMap);

      const createdAt = tsToIso(menu.createdAt) || new Date().toISOString();
      const updatedAt = tsToIso(menu.updatedAt) || createdAt;

      await client.query(
        `INSERT INTO menus (id, household_id, name, groups, preset_slot, legacy_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          newId,
          DEFAULT_HOUSEHOLD_ID,
          menu.name || 'Menu',
          JSON.stringify(remappedGroups),
          menu.presetSlot || null,
          menu.id,
          createdAt,
          updatedAt,
        ],
      );
      menuCount++;
    }

    // Set active menu
    if (menusData.activeMenuId) {
      const newActiveId = menuIdMap.get(menusData.activeMenuId);
      if (newActiveId) {
        await client.query(
          `UPDATE households SET active_menu_id = $1 WHERE id = $2`,
          [newActiveId, DEFAULT_HOUSEHOLD_ID],
        );
        console.log(`  ✓ Active menu set`);
      } else {
        console.warn(`  ⚠  Active menu id ${menusData.activeMenuId} not found in mapping`);
      }
    }
    console.log(`  ✓ ${menuCount} menus migrated`);

    // ------------------------------------------------------------------
    // 5. Kid Selections (ephemeral current selections)
    // ------------------------------------------------------------------
    console.log('\nMigrating kid selections...');
    let selectionCount = 0;

    for (const sel of menusData.selections) {
      const newKidId = profileIdMap.get(sel.kidId);
      if (!newKidId) {
        console.warn(`  ⚠  Kid id ${sel.kidId} not found — skipping selection`);
        continue;
      }

      const migratedSelections = migrateSelection(sel);
      const remappedSelections = remapSelectionsJsonb(migratedSelections, foodIdMap);

      await client.query(
        `INSERT INTO kid_selections (household_id, kid_id, selections)
         VALUES ($1, $2, $3)
         ON CONFLICT (household_id, kid_id) DO UPDATE SET selections = EXCLUDED.selections`,
        [DEFAULT_HOUSEHOLD_ID, newKidId, JSON.stringify(remappedSelections)],
      );
      selectionCount++;
    }
    console.log(`  ✓ ${selectionCount} kid selections migrated`);

    // ------------------------------------------------------------------
    // 6. Meals (with selections and reviews as child rows)
    // ------------------------------------------------------------------
    console.log('\nMigrating meals...');
    const mealsData = readJsonFileSafe<MealsData>('meals.json', { meals: [] });
    let mealCount = 0;
    let mealSelectionCount = 0;
    let mealReviewCount = 0;

    for (const meal of mealsData.meals) {
      const newMealId = randomUUID();
      const newMenuId = menuIdMap.get(meal.menuId) || null;

      if (!newMenuId) {
        console.warn(`  ⚠  Meal ${meal.id}: menu ${meal.menuId} not found — menu_id will be NULL`);
      }

      const mealDate = tsToIso(meal.date) || new Date().toISOString();
      const completedAt = tsToIso(meal.completedAt) || mealDate;

      await client.query(
        `INSERT INTO meal_records (id, household_id, menu_id, date, completed_at, legacy_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [newMealId, DEFAULT_HOUSEHOLD_ID, newMenuId, mealDate, completedAt, meal.id],
      );
      mealCount++;

      // Meal selections
      for (const sel of meal.selections || []) {
        const newKidId = profileIdMap.get(sel.kidId) || null;
        const kidName = profileNameMap.get(sel.kidId) || 'Unknown';

        if (!newKidId) {
          console.warn(`    ⚠  Meal selection: kid ${sel.kidId} not found — kid_id will be NULL`);
        }

        const migratedSelections = migrateSelection(sel);
        const remappedSelections = remapSelectionsJsonb(migratedSelections, foodIdMap);

        await client.query(
          `INSERT INTO meal_selections (meal_id, kid_id, kid_name, selections)
           VALUES ($1, $2, $3, $4)`,
          [newMealId, newKidId, kidName, JSON.stringify(remappedSelections)],
        );
        mealSelectionCount++;
      }

      // Meal reviews
      for (const review of meal.reviews || []) {
        const newKidId = profileIdMap.get(review.kidId) || null;
        const kidName = profileNameMap.get(review.kidId) || 'Unknown';

        if (!newKidId) {
          console.warn(`    ⚠  Meal review: kid ${review.kidId} not found — kid_id will be NULL`);
        }

        const migratedCompletions = migrateReviewCompletions(review);
        const remappedCompletions = remapCompletionsKeys(migratedCompletions, foodIdMap);

        await client.query(
          `INSERT INTO meal_reviews (meal_id, kid_id, kid_name, completions, earned_star)
           VALUES ($1, $2, $3, $4, $5)`,
          [newMealId, newKidId, kidName, JSON.stringify(remappedCompletions), review.earnedStar || false],
        );
        mealReviewCount++;
      }
    }
    console.log(`  ✓ ${mealCount} meals migrated`);
    console.log(`  ✓ ${mealSelectionCount} meal selections migrated`);
    console.log(`  ✓ ${mealReviewCount} meal reviews migrated`);

    // ------------------------------------------------------------------
    // 7. Shared Menus
    // ------------------------------------------------------------------
    console.log('\nMigrating shared menus...');
    const sharedData = readJsonFileSafe<SharedMenusData>('shared-menus.json', { menus: [], responses: [] });
    const sharedMenuIdMap = new Map<string, string>(); // old → new
    let sharedMenuCount = 0;

    for (const sm of sharedData.menus) {
      const newId = randomUUID();
      sharedMenuIdMap.set(sm.id, newId);

      const createdAt = tsToIso(sm.createdAt) || new Date().toISOString();

      await client.query(
        `INSERT INTO shared_menus (id, household_id, token, title, description, groups, is_active, legacy_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          newId,
          DEFAULT_HOUSEHOLD_ID,
          sm.token,
          sm.title,
          sm.description || null,
          JSON.stringify(sm.groups),
          sm.isActive,
          sm.id,
          createdAt,
        ],
      );
      sharedMenuCount++;
    }
    console.log(`  ✓ ${sharedMenuCount} shared menus migrated`);

    // ------------------------------------------------------------------
    // 8. Shared Menu Responses
    // ------------------------------------------------------------------
    console.log('\nMigrating shared menu responses...');
    let sharedResponseCount = 0;

    for (const resp of sharedData.responses) {
      const newMenuId = sharedMenuIdMap.get(resp.menuId);
      if (!newMenuId) {
        console.warn(`  ⚠  Shared response ${resp.id}: menu ${resp.menuId} not found — skipping`);
        continue;
      }

      const createdAt = tsToIso(resp.timestamp) || new Date().toISOString();

      await client.query(
        `INSERT INTO shared_menu_responses (menu_id, respondent_name, selections, created_at)
         VALUES ($1, $2, $3, $4)`,
        [newMenuId, resp.respondentName, JSON.stringify(resp.selections), createdAt],
      );
      sharedResponseCount++;
    }
    console.log(`  ✓ ${sharedResponseCount} shared menu responses migrated`);

    // ------------------------------------------------------------------
    // Verify counts
    // ------------------------------------------------------------------
    console.log('\n--- Verification ---');
    const counts = await Promise.all([
      client.query('SELECT count(*) FROM households'),
      client.query('SELECT count(*) FROM food_items'),
      client.query('SELECT count(*) FROM kid_profiles'),
      client.query('SELECT count(*) FROM menus'),
      client.query('SELECT count(*) FROM kid_selections'),
      client.query('SELECT count(*) FROM meal_records'),
      client.query('SELECT count(*) FROM meal_selections'),
      client.query('SELECT count(*) FROM meal_reviews'),
      client.query('SELECT count(*) FROM shared_menus'),
      client.query('SELECT count(*) FROM shared_menu_responses'),
    ]);

    const labels = [
      'households', 'food_items', 'kid_profiles', 'menus', 'kid_selections',
      'meal_records', 'meal_selections', 'meal_reviews', 'shared_menus', 'shared_menu_responses',
    ];
    const expected = [
      1, foodCount, profileCount, menuCount, selectionCount,
      mealCount, mealSelectionCount, mealReviewCount, sharedMenuCount, sharedResponseCount,
    ];

    let allMatch = true;
    for (let i = 0; i < labels.length; i++) {
      const actual = parseInt(counts[i].rows[0].count, 10);
      const ok = actual === expected[i];
      if (!ok) allMatch = false;
      console.log(`  ${ok ? '✓' : '✗'}  ${labels[i]}: ${actual} rows (expected ${expected[i]})`);
    }

    if (!allMatch) {
      throw new Error('Row count mismatch — aborting');
    }

    // ------------------------------------------------------------------
    // Commit
    // ------------------------------------------------------------------
    await client.query('COMMIT');
    console.log('\n✓ Migration complete!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n✗ Migration FAILED — transaction rolled back');
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
