import { createContext, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { STORAGE_KEYS } from '../utils/storage';
import type { AppState, AppMode } from '../types';

const DEFAULT_STATE: AppState = {
  mode: 'kid',
  isParentAuthenticated: false,
  parentPin: '1234', // Default PIN
  selectedKidId: null,
};

interface AppStateContextType extends AppState {
  setMode: (mode: AppMode) => void;
  authenticateParent: (pin: string) => boolean;
  logoutParent: () => void;
  setParentPin: (pin: string) => void;
  selectKid: (kidId: string | null) => void;
}

const AppStateContext = createContext<AppStateContextType | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useLocalStorage<AppState>(STORAGE_KEYS.APP_STATE, DEFAULT_STATE);

  const setMode = useCallback((mode: AppMode) => {
    setState((prev) => ({
      ...prev,
      mode,
      // Reset auth when switching to kid mode
      isParentAuthenticated: mode === 'kid' ? false : prev.isParentAuthenticated,
    }));
  }, [setState]);

  const authenticateParent = useCallback((pin: string): boolean => {
    if (pin === state.parentPin) {
      setState((prev) => ({
        ...prev,
        isParentAuthenticated: true,
        mode: 'parent',
      }));
      return true;
    }
    return false;
  }, [state.parentPin, setState]);

  const logoutParent = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isParentAuthenticated: false,
      mode: 'kid',
    }));
  }, [setState]);

  const setParentPin = useCallback((pin: string) => {
    setState((prev) => ({
      ...prev,
      parentPin: pin,
    }));
  }, [setState]);

  const selectKid = useCallback((kidId: string | null) => {
    setState((prev) => ({
      ...prev,
      selectedKidId: kidId,
    }));
  }, [setState]);

  return (
    <AppStateContext.Provider
      value={{
        ...state,
        setMode,
        authenticateParent,
        logoutParent,
        setParentPin,
        selectKid,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}
