import { createContext, useContext, useCallback, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { mealsApi } from '../api/client';
import type { MealRecord, KidSelection, KidMealReview } from '../types';

interface MealHistoryContextType {
  meals: MealRecord[];
  loading: boolean;
  addMeal: (menuId: string, selections: KidSelection[], reviews: KidMealReview[]) => Promise<MealRecord>;
  getMeal: (id: string) => MealRecord | undefined;
  deleteMeal: (id: string) => Promise<void>;
}

const MealHistoryContext = createContext<MealHistoryContextType | null>(null);

export function MealHistoryProvider({ children }: { children: ReactNode }) {
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    mealsApi.getAll()
      .then((data) => setMeals(data.meals))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <MealHistoryContext.Provider
      value={{
        meals,
        loading,
        addMeal,
        getMeal,
        deleteMeal,
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
