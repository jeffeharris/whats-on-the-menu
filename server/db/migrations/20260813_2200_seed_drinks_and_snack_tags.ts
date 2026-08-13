import type { PoolClient } from 'pg';

export const DESCRIPTION = 'Add drink seed foods and Snack tags to seed_food_templates';

/**
 * Ports docs/migrations/002-drink-seed-foods.sql into the startup runner.
 *
 * That file was written as a hand-run script and never applied to production,
 * so prod has been seeding new households from 46 templates carrying no Drink
 * or Snack tags at all — which is why the Drink group in every seeded starter
 * menu came out empty (initializeHouseholdPresets queries for ['Drink']), and
 * why the onboarding copy promising "48 kid-friendly foods" was wrong there.
 */
export async function upgrade(client: PoolClient): Promise<void> {
  // Idempotent: only insert the drinks that aren't already present.
  await client.query(`
    INSERT INTO seed_food_templates (name, tags, image_url)
    SELECT v.name, v.tags, v.image_url
    FROM (VALUES
      ('Water', ARRAY['Drink'], NULL::text),
      ('Apple Juice', ARRAY['Drink'], NULL::text)
    ) AS v(name, tags, image_url)
    WHERE NOT EXISTS (
      SELECT 1 FROM seed_food_templates s WHERE s.name = v.name
    )
  `);

  await client.query(`
    UPDATE seed_food_templates
      SET tags = ARRAY['Dairy', 'Drink']
      WHERE name = 'Milk' AND NOT ('Drink' = ANY(tags))
  `);

  await client.query(`
    UPDATE seed_food_templates
      SET tags = array_append(tags, 'Snack')
      WHERE name IN ('Crackers', 'Granola Bar', 'Cheese Stick', 'Raisins')
        AND NOT ('Snack' = ANY(tags))
  `);
}
