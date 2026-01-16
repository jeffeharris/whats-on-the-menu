import { createContext, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { STORAGE_KEYS } from '../utils/storage';
import { generateId } from '../utils/imageUtils';
import type { KidProfile, KidProfilesState, AvatarColor } from '../types';

const DEFAULT_STATE: KidProfilesState = {
  profiles: [],
};

interface KidProfilesContextType {
  profiles: KidProfile[];
  addProfile: (name: string, avatarColor: AvatarColor) => KidProfile;
  updateProfile: (id: string, updates: Partial<Omit<KidProfile, 'id'>>) => void;
  deleteProfile: (id: string) => void;
  getProfile: (id: string) => KidProfile | undefined;
}

const KidProfilesContext = createContext<KidProfilesContextType | null>(null);

export function KidProfilesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useLocalStorage<KidProfilesState>(STORAGE_KEYS.KID_PROFILES, DEFAULT_STATE);

  const addProfile = useCallback((name: string, avatarColor: AvatarColor): KidProfile => {
    const newProfile: KidProfile = {
      id: generateId(),
      name,
      avatarColor,
    };
    setState((prev) => ({
      profiles: [...prev.profiles, newProfile],
    }));
    return newProfile;
  }, [setState]);

  const updateProfile = useCallback((id: string, updates: Partial<Omit<KidProfile, 'id'>>) => {
    setState((prev) => ({
      profiles: prev.profiles.map((profile) =>
        profile.id === id ? { ...profile, ...updates } : profile
      ),
    }));
  }, [setState]);

  const deleteProfile = useCallback((id: string) => {
    setState((prev) => ({
      profiles: prev.profiles.filter((profile) => profile.id !== id),
    }));
  }, [setState]);

  const getProfile = useCallback((id: string): KidProfile | undefined => {
    return state.profiles.find((profile) => profile.id === id);
  }, [state.profiles]);

  return (
    <KidProfilesContext.Provider
      value={{
        profiles: state.profiles,
        addProfile,
        updateProfile,
        deleteProfile,
        getProfile,
      }}
    >
      {children}
    </KidProfilesContext.Provider>
  );
}

export function useKidProfiles() {
  const context = useContext(KidProfilesContext);
  if (!context) {
    throw new Error('useKidProfiles must be used within a KidProfilesProvider');
  }
  return context;
}
