import { createContext, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { STORAGE_KEYS } from '../utils/storage';
import { generateId } from '../utils/imageUtils';
import type { Menu, MenuState, KidSelection } from '../types';

const DEFAULT_STATE: MenuState = {
  currentMenu: null,
  selections: [],
};

interface MenuContextType {
  currentMenu: Menu | null;
  selections: KidSelection[];
  createMenu: (mains: string[], sides: string[]) => Menu;
  clearMenu: () => void;
  addSelection: (kidId: string, mainId: string | null, sideIds: string[]) => void;
  getSelectionForKid: (kidId: string) => KidSelection | undefined;
  clearSelections: () => void;
  hasKidSelected: (kidId: string) => boolean;
}

const MenuContext = createContext<MenuContextType | null>(null);

export function MenuProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useLocalStorage<MenuState>(STORAGE_KEYS.MENU, DEFAULT_STATE);

  const createMenu = useCallback((mains: string[], sides: string[]): Menu => {
    const newMenu: Menu = {
      id: generateId(),
      mains,
      sides,
    };
    setState((prev) => ({
      ...prev,
      currentMenu: newMenu,
      selections: [], // Clear selections when new menu is created
    }));
    return newMenu;
  }, [setState]);

  const clearMenu = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentMenu: null,
      selections: [],
    }));
  }, [setState]);

  const addSelection = useCallback((kidId: string, mainId: string | null, sideIds: string[]) => {
    const newSelection: KidSelection = {
      kidId,
      mainId,
      sideIds,
      timestamp: Date.now(),
    };
    setState((prev) => ({
      ...prev,
      selections: [
        // Remove any existing selection for this kid
        ...prev.selections.filter((s) => s.kidId !== kidId),
        newSelection,
      ],
    }));
  }, [setState]);

  const getSelectionForKid = useCallback((kidId: string): KidSelection | undefined => {
    return state.selections.find((s) => s.kidId === kidId);
  }, [state.selections]);

  const clearSelections = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selections: [],
    }));
  }, [setState]);

  const hasKidSelected = useCallback((kidId: string): boolean => {
    return state.selections.some((s) => s.kidId === kidId);
  }, [state.selections]);

  return (
    <MenuContext.Provider
      value={{
        currentMenu: state.currentMenu,
        selections: state.selections,
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
