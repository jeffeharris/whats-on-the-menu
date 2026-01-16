import { createContext, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { STORAGE_KEYS } from '../utils/storage';
import { generateId } from '../utils/imageUtils';
import type { FoodItem, FoodLibraryState, FoodCategory } from '../types';

const DEFAULT_STATE: FoodLibraryState = {
  items: [],
};

interface FoodLibraryContextType {
  items: FoodItem[];
  addItem: (name: string, category: FoodCategory, imageUrl: string | null) => FoodItem;
  updateItem: (id: string, updates: Partial<Omit<FoodItem, 'id'>>) => void;
  deleteItem: (id: string) => void;
  getItem: (id: string) => FoodItem | undefined;
  getItemsByCategory: (category: FoodCategory) => FoodItem[];
}

const FoodLibraryContext = createContext<FoodLibraryContextType | null>(null);

export function FoodLibraryProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useLocalStorage<FoodLibraryState>(STORAGE_KEYS.FOOD_LIBRARY, DEFAULT_STATE);

  const addItem = useCallback((name: string, category: FoodCategory, imageUrl: string | null): FoodItem => {
    const newItem: FoodItem = {
      id: generateId(),
      name,
      category,
      imageUrl,
    };
    setState((prev) => ({
      items: [...prev.items, newItem],
    }));
    return newItem;
  }, [setState]);

  const updateItem = useCallback((id: string, updates: Partial<Omit<FoodItem, 'id'>>) => {
    setState((prev) => ({
      items: prev.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    }));
  }, [setState]);

  const deleteItem = useCallback((id: string) => {
    setState((prev) => ({
      items: prev.items.filter((item) => item.id !== id),
    }));
  }, [setState]);

  const getItem = useCallback((id: string): FoodItem | undefined => {
    return state.items.find((item) => item.id === id);
  }, [state.items]);

  const getItemsByCategory = useCallback((category: FoodCategory): FoodItem[] => {
    return state.items.filter((item) => item.category === category);
  }, [state.items]);

  return (
    <FoodLibraryContext.Provider
      value={{
        items: state.items,
        addItem,
        updateItem,
        deleteItem,
        getItem,
        getItemsByCategory,
      }}
    >
      {children}
    </FoodLibraryContext.Provider>
  );
}

export function useFoodLibrary() {
  const context = useContext(FoodLibraryContext);
  if (!context) {
    throw new Error('useFoodLibrary must be used within a FoodLibraryProvider');
  }
  return context;
}
