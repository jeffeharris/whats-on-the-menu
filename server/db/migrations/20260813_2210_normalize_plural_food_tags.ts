import type { PoolClient } from 'pg';

export const DESCRIPTION = "Normalize food_items tags 'Drinks'/'Snacks' to the canonical singular";

export const DEPENDS_ON = '20260813_2200_seed_drinks_and_snack_tags';

/**
 * PREDEFINED_TAGS and every tag query use the singular 'Drink' and 'Snack', but
 * production food_items only ever got the plurals. Nothing matched: the Drink
 * group in seeded menus was empty, and the tag filter listed both spellings as
 * if they were different categories.
 *
 * Only these two are touched. Households have genuine custom tags ('Sandwich',
 * 'Pasta' in production) which are theirs to name and are left alone.
 *
 * The rewrite de-duplicates while preserving each tag's first position, so a
 * row that somehow carried both spellings collapses to one without its tags
 * being reordered.
 */
export async function upgrade(client: PoolClient): Promise<void> {
  await client.query(`
    UPDATE food_items f
    SET tags = sub.new_tags
    FROM (
      SELECT fi.id,
             ARRAY(
               SELECT g.tag FROM (
                 SELECT CASE
                          WHEN u.t = 'Drinks' THEN 'Drink'
                          WHEN u.t = 'Snacks' THEN 'Snack'
                          ELSE u.t
                        END AS tag,
                        MIN(u.ord) AS ord
                 FROM unnest(fi.tags) WITH ORDINALITY AS u(t, ord)
                 GROUP BY 1
               ) g
               ORDER BY g.ord
             ) AS new_tags
      FROM food_items fi
      WHERE fi.tags && ARRAY['Drinks', 'Snacks']
    ) sub
    WHERE f.id = sub.id
  `);
}
