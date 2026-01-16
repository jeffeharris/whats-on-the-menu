import { createContext, useContext, useCallback, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { menusApi } from '../api/client';
import type { Menu, KidSelection } from '../types';

interface MenuContextType {
  currentMenu: Menu | null;
  selections: KidSelection[];
  loading: boolean;
  createMenu: (mains: string[], sides: string[]) => Promise<Menu>;
  clearMenu: () => Promise<void>;
  addSelection: (kidId: string, mainId: string | null, sideIds: string[]) => Promise<void>;
  getSelectionForKid: (kidId: string) => KidSelection | undefined;
  clearSelections: () => Promise<void>;
  hasKidSelected: (kidId: string) => boolean;
}

const MenuContext = createContext<MenuContextType | null>(null);

export function MenuProvider({ children }: { children: ReactNode }) {
  const [currentMenu, setCurrentMenu] = useState<Menu | null>(null);
  const [selections, setSelections] = useState<KidSelection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    menusApi.getActive()
      .then((data) => {
        if (data.menu) {
          setCurrentMenu({
            id: data.menu.id,
            mains: data.menu.mains,
            sides: data.menu.sides,
          });
        }
        setSelections(data.selections);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const createMenu = useCallback(async (mains: string[], sides: string[]): Promise<Menu> => {
    const savedMenu = await menusApi.create(mains, sides, 'Menu');
    const newMenu: Menu = {
      id: savedMenu.id,
      mains: savedMenu.mains,
      sides: savedMenu.sides,
    };
    setCurrentMenu(newMenu);
    setSelections([]);
    return newMenu;
  }, []);

  const clearMenu = useCallback(async () => {
    await menusApi.setActive(null);
    setCurrentMenu(null);
    setSelections([]);
  }, []);

  const addSelection = useCallback(async (kidId: string, mainId: string | null, sideIds: string[]) => {
    const newSelection = await menusApi.addSelection(kidId, mainId, sideIds);
    setSelections((prev) => [
      ...prev.filter((s) => s.kidId !== kidId),
      newSelection,
    ]);
  }, []);

  const getSelectionForKid = useCallback((kidId: string): KidSelection | undefined => {
    return selections.find((s) => s.kidId === kidId);
  }, [selections]);

  const clearSelections = useCallback(async () => {
    await menusApi.clearSelections();
    setSelections([]);
  }, []);

  const hasKidSelected = useCallback((kidId: string): boolean => {
    return selections.some((s) => s.kidId === kidId);
  }, [selections]);

  return (
    <MenuContext.Provider
      value={{
        currentMenu,
        selections,
        loading,
        createMenu,
        clearMenu,
        addSelection,
        getSelectionForKid,
        clearSelections,
        hasKidSelected,
      }}
    >
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu() {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error('useMenu must be used within a MenuProvider');
  }
  return context;
}
