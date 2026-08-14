import { createContext, useContext, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { mealsApi } from '../api/client';
import type { MealRecord, KidSelection, KidMealReview } from '../types';
import { useAuthedResource } from '../hooks/useAuthedResource';
import { useMenu } from './MenuContext';

const NO_MEALS: MealRecord[] = [];

interface MealHistoryContextType {
  meals: MealRecord[];
  loading: boolean;
  /**
   * True when the fetch failed. Star counts read 0 in this state, which is a
   * lie a kid will notice — branch on this before showing a total.
   */
  error: boolean;
  reload: () => void;
  addMeal: (menuId: string, selections: KidSelection[], reviews: KidMealReview[]) => Promise<MealRecord>;
  getMeal: (id: string) => MealRecord | undefined;
  deleteMeal: (id: string) => Promise<void>;
  getStarCountForKid: (kidId: string) => number;
  getTotalFamilyStars: () => number;
}

const MealHistoryContext = createContext<MealHistoryContextType | null>(null);

export function MealHistoryProvider({ children }: { children: ReactNode }) {
  const { activeMenu, loading: menuLoading } = useMenu();
  const {
    data: meals,
    setData: setMeals,
    loading,
    error,
    reload,
  } = useAuthedResource('meals', () => mealsApi.getAll().then((d) => d.meals), NO_MEALS);
  const previousActiveMenuId = useRef<string | null | undefined>(undefined);

  // MenuContext receives the household's real-time menu events. When an
  // active round becomes paused, refresh history so kid devices immediately
  // see the review, new stars, and updated food-wall statuses that caused it.
  useEffect(() => {
    if (menuLoading) return;

    const nextActiveMenuId = activeMenu?.id ?? null;
    const previousId = previousActiveMenuId.current;
    previousActiveMenuId.current = nextActiveMenuId;

    // `undefined` means this is the first resolved menu snapshot. Reloading
    // once when that snapshot is already paused closes the race where the
    // initial history request read just before meal completion committed.
    if (previousId !== null && nextActiveMenuId === null) {
      reload();
    }
  }, [activeMenu, menuLoading, reload]);

  const addMeal = useCallback(async (menuId: string, selections: KidSelection[], reviews: KidMealReview[]): Promise<MealRecord> => {
    const newMeal = await mealsApi.create(menuId, selections, reviews);
    // The real-time pause can trigger a canonical reload before this response
    // resolves on the parent device, so replace by id instead of duplicating it.
    setMeals((prev) => [newMeal, ...prev.filter((meal) => meal.id !== newMeal.id)]);
    return newMeal;
  }, [setMeals]);

  const getMeal = useCallback((id: string): MealRecord | undefined => {
    return meals.find((m) => m.id === id);
  }, [meals]);

  const deleteMeal = useCallback(async (id: string) => {
    await mealsApi.delete(id);
    setMeals((prev) => prev.filter((m) => m.id !== id));
  }, [setMeals]);

  const getStarCountForKid = useCallback((kidId: string): number => {
    return meals.reduce((count, meal) => {
      const review = meal.reviews.find((r) => r.kidId === kidId);
      return count + (review?.earnedStar ? 1 : 0);
    }, 0);
  }, [meals]);

  const getTotalFamilyStars = useCallback((): number => {
    return meals.reduce((count, meal) => {
      return count + meal.reviews.filter((r) => r.earnedStar).length;
    }, 0);
  }, [meals]);

  return (
    <MealHistoryContext.Provider
      value={{
        meals,
        loading,
        error,
        reload,
        addMeal,
        getMeal,
        deleteMeal,
        getStarCountForKid,
        getTotalFamilyStars,
      }}
    >
      {children}
    </MealHistoryContext.Provider>
  );
}

export function useMealHistory() {
  const context = useContext(MealHistoryContext);
  if (!context) {
    throw new Error('useMealHistory must be used within a MealHistoryProvider');
  }
  return context;
}
