import { createContext, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import { sharedMenusApi } from '../api/client';
import type { SharedMenu, SharedMenuResponse, SharedMenuGroup } from '../types';
import { useAuthedResource } from '../hooks/useAuthedResource';

const NO_MENUS: SharedMenu[] = [];

interface SharedMenuContextType {
  menus: SharedMenu[];
  loading: boolean;
  /** True when the fetch failed — do not render "no shared menus yet". */
  error: boolean;
  reload: () => void;
  createMenu: (title: string, description: string | undefined, groups: SharedMenuGroup[]) => Promise<SharedMenu>;
  updateMenu: (id: string, updates: Partial<SharedMenu>) => Promise<void>;
  deleteMenu: (id: string) => Promise<void>;
  getResponses: (menuId: string) => Promise<SharedMenuResponse[]>;
  refreshMenus: () => Promise<void>;
}

const SharedMenuContext = createContext<SharedMenuContextType | null>(null);

export function SharedMenuProvider({ children }: { children: ReactNode }) {
  const {
    data: menus,
    setData: setMenus,
    loading,
    error,
    reload,
  } = useAuthedResource('shared menus', () => sharedMenusApi.getAll().then((d) => d.menus), NO_MENUS);

  const refreshMenus = useCallback(async () => {
    const data = await sharedMenusApi.getAll();
    setMenus(data.menus);
  }, [setMenus]);

  const createMenu = useCallback(async (title: string, description: string | undefined, groups: SharedMenuGroup[]): Promise<SharedMenu> => {
    const menu = await sharedMenusApi.create(title, description, groups);
    setMenus((prev) => [...prev, menu]);
    return menu;
  }, [setMenus]);

  const updateMenu = useCallback(async (id: string, updates: Partial<SharedMenu>) => {
    const updated = await sharedMenusApi.update(id, updates);
    setMenus((prev) => prev.map((m) => (m.id === id ? updated : m)));
  }, [setMenus]);

  const deleteMenu = useCallback(async (id: string) => {
    await sharedMenusApi.delete(id);
    setMenus((prev) => prev.filter((m) => m.id !== id));
  }, [setMenus]);

  const getResponses = useCallback(async (menuId: string): Promise<SharedMenuResponse[]> => {
    const data = await sharedMenusApi.getResponses(menuId);
    return data.responses;
  }, []);

  return (
    <SharedMenuContext.Provider
      value={{
        menus,
        loading,
        error,
        reload,
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
