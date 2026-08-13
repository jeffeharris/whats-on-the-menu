import { createContext, useContext, useCallback, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { mealsApi } from '../api/client';
import type { MealRecord, KidSelection, KidMealReview } from '../types';
import { useAuth } from './AuthContext';

interface MealHistoryContextType {
  meals: MealRecord[];
  loading: boolean;
  addMeal: (menuId: string, selections: KidSelection[], reviews: KidMealReview[]) => Promise<MealRecord>;
  getMeal: (id: string) => MealRecord | undefined;
  deleteMeal: (id: string) => Promise<void>;
  getStarCountForKid: (kidId: string) => number;
  getTotalFamilyStars: () => number;
}

const MealHistoryContext = createContext<MealHistoryContextType | null>(null);

export function MealHistoryProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [loading, setLoading] = useState(isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    mealsApi.getAll()
      .then((data) => {
        if (!cancelled) setMeals(data.meals);
      })
      .catch((err) => console.error('Failed to fetch meals:', err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const addMeal = useCallback(async (menuId: string, selections: KidSelection[], reviews: KidMealReview[]): Promise<MealRecord> => {
    const newMeal = await mealsApi.create(menuId, selections, reviews);
    setMeals((prev) => [newMeal, ...prev]);
    return newMeal;
  }, []);

  const getMeal = useCallback((id: string): MealRecord | undefined => {
    return meals.find((m) => m.id === id);
  }, [meals]);

  const deleteMeal = useCallback(async (id: string) => {
    await mealsApi.delete(id);
    setMeals((prev) => prev.filter((m) => m.id !== id));
  }, []);

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
