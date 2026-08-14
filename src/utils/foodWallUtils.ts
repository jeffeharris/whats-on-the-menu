import type { MealRecord } from '../types';
import { getAllFoodIds } from './completionUtils';

export interface FoodWallFood {
  foodId: string;
  /** Marked Tried it, Some, or All at least once. */
  tried: boolean;
  /** Number of completed meals this food was served to the kid in. */
  servedCount: number;
  /** Most recent meal date (ms) this food was served, if any. */
  lastServedAt: number | null;
}

/**
 * A food enters the wall the first time it appears in a completed meal for
 * that kid, and lands in "tried" if any review ever marked it Tried it, Some,
 * or All. It only falls in "still to try" if it came back untouched every
 * time it was served — tried is tried, it never reverts.
 */
export function computeFoodWall(meals: MealRecord[], kidId: string): FoodWallFood[] {
  const servedCount = new Map<string, number>();
  const lastServedAt = new Map<string, number>();
  const triedEver = new Set<string>();
  const firstSeenOrder: string[] = [];

  meals.forEach((meal) => {
    const selection = meal.selections.find((s) => s.kidId === kidId);
    if (!selection) return;
    const review = meal.reviews.find((r) => r.kidId === kidId);

    getAllFoodIds(selection).forEach((foodId) => {
      if (!servedCount.has(foodId)) firstSeenOrder.push(foodId);
      servedCount.set(foodId, (servedCount.get(foodId) ?? 0) + 1);

      const servedAt = meal.date ?? meal.completedAt;
      if (servedAt != null && servedAt > (lastServedAt.get(foodId) ?? 0)) {
        lastServedAt.set(foodId, servedAt);
      }

      const status = review?.completions?.[foodId];
      if (status === 'tried' || status === 'some' || status === 'all') {
        triedEver.add(foodId);
      }
    });
  });

  // Tried foods first, so the collage fills top-to-bottom in the same order
  // the wall's copy describes: things tasted, then things still to try.
  const tried = firstSeenOrder.filter((id) => triedEver.has(id));
  const untried = firstSeenOrder.filter((id) => !triedEver.has(id));

  return [...tried, ...untried].map((foodId) => ({
    foodId,
    tried: triedEver.has(foodId),
    servedCount: servedCount.get(foodId) ?? 0,
    lastServedAt: lastServedAt.get(foodId) ?? null,
  }));
}
