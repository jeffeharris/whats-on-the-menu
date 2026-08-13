import { createContext, useContext, useCallback, useState, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { foodsApi, uploadsApi } from '../api/client';
import type { StorageStats } from '../api/client';
import type { FoodItem } from '../types';
import { PREDEFINED_TAGS } from '../types';
import { useAuth } from './AuthContext';

interface FoodLibraryContextType {
  items: FoodItem[];
  loading: boolean;
  error: boolean;
  reload: () => void;
  addItem: (name: string, tags: string[], imageUrl: string | null) => Promise<FoodItem>;
  updateItem: (id: string, updates: Partial<Omit<FoodItem, 'id'>>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  getItem: (id: string) => FoodItem | undefined;
  getItemsByTag: (tag: string) => FoodItem[];
  allTags: string[];
  storageStats: StorageStats | null;
  refreshStorageStats: () => Promise<void>;
}

const FoodLibraryContext = createContext<FoodLibraryContextType | null>(null);

export function FoodLibraryProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<FoodItem[]>([]);
  // Only "loading" if we're actually going to fetch. This provider mounts after
  // auth has resolved, so isAuthenticated is accurate at mount time.
  const [loading, setLoading] = useState(isAuthenticated);
  const [error, setError] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(false);
    setReloadCount((n) => n + 1);
  }, []);

  const refreshStorageStats = useCallback(async () => {
    try {
      const stats = await uploadsApi.getStorage();
      setStorageStats(stats);
    } catch (error) {
      console.error('Failed to fetch storage stats:', error);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    foodsApi.getAll()
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to fetch foods:', err);
        setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    uploadsApi.getStorage()
      .then((stats) => {
        if (!cancelled) setStorageStats(stats);
      })
      .catch((err) => console.error('Failed to fetch storage stats:', err));

    return () => { cancelled = true; };
  }, [isAuthenticated, reloadCount]);

  // Compute all unique tags from items + predefined tags
  const allTags = useMemo(() => {
    const tagsFromItems = new Set<string>();
    items.forEach((item) => {
      if (item.tags) {
        item.tags.forEach((tag) => tagsFromItems.add(tag));
      }
    });
    // Combine predefined tags with custom tags from items
    const combined = new Set([...PREDEFINED_TAGS, ...tagsFromItems]);
    return Array.from(combined).sort();
  }, [items]);

  const addItem = useCallback(async (name: string, tags: string[], imageUrl: string | null): Promise<FoodItem> => {
    const newItem = await foodsApi.create(name, tags, imageUrl);
    setItems((prev) => [...prev, newItem]);
    return newItem;
  }, []);

  const updateItem = useCallback(async (id: string, updates: Partial<Omit<FoodItem, 'id'>>) => {
    const updated = await foodsApi.update(id, updates);
    setItems((prev) => prev.map((item) => item.id === id ? updated : item));
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    await foodsApi.delete(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
    // Refresh storage stats since an uploaded image may have been deleted
    await refreshStorageStats();
  }, [refreshStorageStats]);

  const getItem = useCallback((id: string): FoodItem | undefined => {
    return items.find((item) => item.id === id);
  }, [items]);

  const getItemsByTag = useCallback((tag: string): FoodItem[] => {
    return items.filter((item) => item.tags?.includes(tag));
  }, [items]);

  return (
    <FoodLibraryContext.Provider
      value={{
        items,
        loading,
        error,
        reload,
        addItem,
        updateItem,
        deleteItem,
        getItem,
        getItemsByTag,
        allTags,
        storageStats,
        refreshStorageStats,
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
