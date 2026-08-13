import { createContext, useContext, useCallback, useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { STORAGE_KEYS } from '../utils/storage';
import type { AppState, AppMode } from '../types';
import { useAuth } from './AuthContext';

const DEFAULT_STATE: AppState = {
  mode: 'kid',
  selectedKidId: null,
};

interface AppStateContextType extends AppState {
  isParentAuthenticated: boolean;
  grownUpCheckEnabled: boolean;
  setMode: (mode: AppMode) => void;
  enterParentMode: () => void;
  logoutParent: () => void;
  selectKid: (kidId: string | null) => void;
}

const AppStateContext = createContext<AppStateContextType | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useLocalStorage<AppState>(STORAGE_KEYS.APP_STATE, DEFAULT_STATE);
  const { household, user } = useAuth();
  const grownUpCheckEnabled = household?.grownUpCheckEnabled ?? false;

  // In-memory only: passing the grown-up check lasts for this page session and
  // no longer. Reopening the app, or a different account signing in on this
  // browser, gets challenged again.
  const [isParentAuthenticated, setIsParentAuthenticated] = useState(false);

  // This provider sits above the keyed session subtree in App.tsx, so it does
  // not remount when the signed-in user changes. Drop parent access explicitly
  // instead, or one household's unlocked session would carry into the next.
  const userId = user?.id ?? null;
  const lastUserId = useRef(userId);
  if (lastUserId.current !== userId) {
    lastUserId.current = userId;
    if (isParentAuthenticated) setIsParentAuthenticated(false);
  }

  const setMode = useCallback((mode: AppMode) => {
    // Reset access when switching to kid mode
    if (mode === 'kid') setIsParentAuthenticated(false);
    setState((prev) => ({ ...prev, mode }));
  }, [setState]);

  const enterParentMode = useCallback(() => {
    setIsParentAuthenticated(true);
    setState((prev) => ({ ...prev, mode: 'parent' }));
  }, [setState]);

  const logoutParent = useCallback(() => {
    setIsParentAuthenticated(false);
    setState((prev) => ({ ...prev, mode: 'kid' }));
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
        isParentAuthenticated,
        grownUpCheckEnabled,
        setMode,
        enterParentMode,
        logoutParent,
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
