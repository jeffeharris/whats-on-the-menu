import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { sharedMenusApi } from '../api/client';
import type { SharedMenu, SharedMenuResponse, SharedMenuGroup } from '../types';

interface SharedMenuContextType {
  menus: SharedMenu[];
  loading: boolean;
  createMenu: (title: string, description: string | undefined, groups: SharedMenuGroup[]) => Promise<SharedMenu>;
  updateMenu: (id: string, updates: Partial<SharedMenu>) => Promise<void>;
  deleteMenu: (id: string) => Promise<void>;
  getResponses: (menuId: string) => Promise<SharedMenuResponse[]>;
  refreshMenus: () => Promise<void>;
}

const SharedMenuContext = createContext<SharedMenuContextType | null>(null);

export function SharedMenuProvider({ children }: { children: ReactNode }) {
  const [menus, setMenus] = useState<SharedMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const initialLoadDone = useRef(false);

  const refreshMenus = useCallback(async () => {
    try {
      const data = await sharedMenusApi.getAll();
      setMenus(data.menus);
    } catch (error) {
      console.error('Failed to load shared menus:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;
    refreshMenus();
  }, [refreshMenus]);

  const createMenu = useCallback(async (title: string, description: string | undefined, groups: SharedMenuGroup[]): Promise<SharedMenu> => {
    const menu = await sharedMenusApi.create(title, description, groups);
    setMenus((prev) => [...prev, menu]);
    return menu;
  }, []);

  const updateMenu = useCallback(async (id: string, updates: Partial<SharedMenu>) => {
    const updated = await sharedMenusApi.update(id, updates);
    setMenus((prev) => prev.map((m) => (m.id === id ? updated : m)));
  }, []);

  const deleteMenu = useCallback(async (id: string) => {
    await sharedMenusApi.delete(id);
    setMenus((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const getResponses = useCallback(async (menuId: string): Promise<SharedMenuResponse[]> => {
    const data = await sharedMenusApi.getResponses(menuId);
    return data.responses;
  }, []);

  return (
    <SharedMenuContext.Provider
      value={{
        menus,
        loading,
        createMenu,
        updateMenu,
        deleteMenu,
        getResponses,
        refreshMenus,
      }}
    >
      {children}
    </SharedMenuContext.Provider>
  );
}

export function useSharedMenu() {
  const context = useContext(SharedMenuContext);
  if (!context) {
    throw new Error('useSharedMenu must be used within SharedMenuProvider');
  }
  return context;
}
