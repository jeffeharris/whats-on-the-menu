import pool from '../pool.js';
import { logger } from '../../logger.js';

interface KidSelection {
  kidId: string;
  selections: { [groupId: string]: string[] };
  timestamp: number;
}

type CompletionStatus = 'all' | 'some' | 'none' | null;

interface KidMealReview {
  kidId: string;
  completions: { [foodId: string]: CompletionStatus };
  earnedStar?: boolean;
}

interface MealRecord {
  id: string;
  menuId: string;
  date: number;
  selections: KidSelection[];
  reviews: KidMealReview[];
  completedAt: number;
}

/**
 * Reconstruct MealRecord objects from joined rows.
 * Each row has meal columns plus a meal_selection and meal_review joined.
 * Multiple rows per meal — group them by meal id.
 */
function rowsToMeals(rows: Record<string, unknown>[]): MealRecord[] {
  const mealsMap = new Map<string, {
    id: string;
    menuId: string;
    date: number;
    completedAt: number;
    selectionsMap: Map<string, KidSelection>;
    reviewsMap: Map<string, KidMealReview>;
  }>();

  for (const row of rows) {
    const mealId = row.meal_id as string;

    if (!mealsMap.has(mealId)) {
      mealsMap.set(mealId, {
        id: mealId,
        menuId: (row.menu_id as string) ?? '',
        date: Number(row.date_ms),
        completedAt: Number(row.completed_at_ms),
        selectionsMap: new Map(),
        reviewsMap: new Map(),
      });
    }

    const meal = mealsMap.get(mealId)!;

    // Add selection if present and not already added
    const selId = row.sel_id as string | null;
    if (selId && !meal.selectionsMap.has(selId)) {
      meal.selectionsMap.set(selId, {
        kidId: row.sel_kid_id as string,
        selections: (row.sel_selections as { [groupId: string]: string[] }) ?? {},
        timestamp: Number(row.date_ms),
      });
    }

    // Add review if present and not already added
    const revId = row.rev_id as string | null;
    if (revId && !meal.reviewsMap.has(revId)) {
      const review: KidMealReview = {
        kidId: row.rev_kid_id as string,
        completions: (row.rev_completions as { [foodId: string]: CompletionStatus }) ?? {},
      };
      if (row.rev_earned_star === true) {
        review.earnedStar = true;
      }
      meal.reviewsMap.set(revId, review);
    }
  }

  return Array.from(mealsMap.values()).map((m) => ({
    id: m.id,
    menuId: m.menuId,
    date: m.date,
    selections: Array.from(m.selectionsMap.values()),
    reviews: Array.from(m.reviewsMap.values()),
    completedAt: m.completedAt,
  }));
}

const MEAL_JOIN_QUERY = `
  SELECT
    mr.id          AS meal_id,
    mr.menu_id,
    EXTRACT(EPOCH FROM mr.date)         * 1000 AS date_ms,
    EXTRACT(EPOCH FROM mr.completed_at) * 1000 AS completed_at_ms,
    ms.id          AS sel_id,
    ms.kid_id      AS sel_kid_id,
    ms.selections  AS sel_selections,
    rv.id          AS rev_id,
    rv.kid_id      AS rev_kid_id,
    rv.completions AS rev_completions,
    rv.earned_star AS rev_earned_star
  FROM meal_records mr
  LEFT JOIN meal_selections ms ON ms.meal_id = mr.id
  LEFT JOIN meal_reviews    rv ON rv.meal_id = mr.id
`;

export async function getAllMeals(householdId: string): Promise<{ meals: MealRecord[] }> {
  const { rows } = await pool.query(
    `${MEAL_JOIN_QUERY}
     WHERE mr.household_id = $1
     ORDER BY mr.date DESC, mr.id, ms.id, rv.id`,
    [householdId],
  );
  return { meals: rowsToMeals(rows) };
}

export async function getMeal(householdId: string, id: string): Promise<MealRecord | null> {
  const { rows } = await pool.query(
    `${MEAL_JOIN_QUERY}
     WHERE mr.household_id = $1 AND mr.id = $2
     ORDER BY ms.id, rv.id`,
    [householdId, id],
  );
  if (rows.length === 0) return null;
  const meals = rowsToMeals(rows);
  return meals[0] ?? null;
}

export async function createMeal(
  householdId: string,
  menuId: string,
  selections: KidSelection[],
  reviews: KidMealReview[],
): Promise<MealRecord> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert meal_record
    const now = new Date();
    const { rows: mealRows } = await client.query(
      `INSERT INTO meal_records (household_id, menu_id, date, completed_at)
       VALUES ($1, $2, $3, $3)
       RETURNING id, EXTRACT(EPOCH FROM date) * 1000 AS date_ms,
                    EXTRACT(EPOCH FROM completed_at) * 1000 AS completed_at_ms`,
      [householdId, menuId, now],
    );
    const mealRow = mealRows[0];
    const mealId = mealRow.id as string;
    const dateMs = Number(mealRow.date_ms);
    const completedAtMs = Number(mealRow.completed_at_ms);

    // 2. Look up kid names for snapshots
    const allKidIds = new Set<string>();
    for (const s of selections) allKidIds.add(s.kidId);
    for (const r of reviews) allKidIds.add(r.kidId);

    const kidNameMap = new Map<string, string>();
    if (allKidIds.size > 0) {
      const kidIdArray = Array.from(allKidIds);
      const { rows: kidRows } = await client.query(
        'SELECT id, name FROM kid_profiles WHERE id = ANY($1) AND household_id = $2',
        [kidIdArray, householdId],
      );
      for (const kr of kidRows) {
        kidNameMap.set(kr.id as string, kr.name as string);
      }
    }

    // 3. Insert meal_selections
    const builtSelections: KidSelection[] = [];
    for (const sel of selections) {
      const kidName = kidNameMap.get(sel.kidId) ?? 'Unknown';
      await client.query(
        `INSERT INTO meal_selections (meal_id, kid_id, kid_name, selections)
         VALUES ($1, $2, $3, $4)`,
        [mealId, sel.kidId, kidName, JSON.stringify(sel.selections)],
      );
      builtSelections.push({
        kidId: sel.kidId,
        selections: sel.selections,
        timestamp: dateMs,
      });
    }

    // 4. Insert meal_reviews
    const builtReviews: KidMealReview[] = [];
    for (const rev of reviews) {
      const kidName = kidNameMap.get(rev.kidId) ?? 'Unknown';
      await client.query(
        `INSERT INTO meal_reviews (meal_id, kid_id, kid_name, completions, earned_star)
         VALUES ($1, $2, $3, $4, $5)`,
        [mealId, rev.kidId, kidName, JSON.stringify(rev.completions), rev.earnedStar ?? false],
      );
      const review: KidMealReview = {
        kidId: rev.kidId,
        completions: rev.completions,
      };
      if (rev.earnedStar) {
        review.earnedStar = true;
      }
      builtReviews.push(review);
    }

    await client.query('COMMIT');

    return {
      id: mealId,
      menuId,
      date: dateMs,
      selections: builtSelections,
      reviews: builtReviews,
      completedAt: completedAtMs,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, householdId, menuId }, 'Transaction failed in createMeal');
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteMeal(householdId: string, id: string): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM meal_records WHERE id = $1 AND household_id = $2',
    [id, householdId],
  );
  return (result.rowCount ?? 0) > 0;
}
