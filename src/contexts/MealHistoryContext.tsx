import { createContext, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { STORAGE_KEYS } from '../utils/storage';
import { generateId } from '../utils/imageUtils';
import type { MealHistoryState, MealRecord, KidSelection, KidMealReview } from '../types';

const DEFAULT_STATE: MealHistoryState = {
  meals: [],
};

interface MealHistoryContextType {
  meals: MealRecord[];
  addMeal: (menuId: string, selections: KidSelection[], reviews: KidMealReview[]) => MealRecord;
  getMeal: (id: string) => MealRecord | undefined;
  deleteMeal: (id: string) => void;
}

const MealHistoryContext = createContext<MealHistoryContextType | null>(null);

export function MealHistoryProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useLocalStorage<MealHistoryState>(STORAGE_KEYS.MEAL_HISTORY, DEFAULT_STATE);

  const addMeal = useCallback((menuId: string, selections: KidSelection[], reviews: KidMealReview[]): MealRecord => {
    const now = Date.now();
    const newMeal: MealRecord = {
      id: generateId(),
      menuId,
      date: now,
      selections,
      reviews,
      completedAt: now,
    };
    setState((prev) => ({
      ...prev,
      meals: [newMeal, ...prev.meals],
    }));
    return newMeal;
  }, [setState]);

  const getMeal = useCallback((id: string): MealRecord | undefined => {
    return state.meals.find((m) => m.id === id);
  }, [state.meals]);

  const deleteMeal = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      meals: prev.meals.filter((m) => m.id !== id),
    }));
  }, [setState]);

  return (
    <MealHistoryContext.Provider
      value={{
        meals: state.meals,
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
