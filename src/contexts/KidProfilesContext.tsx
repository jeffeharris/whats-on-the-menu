import { createContext, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import { profilesApi } from '../api/client';
import type { KidProfile, AvatarColor, AvatarAnimal } from '../types';
import { useAuthedResource } from '../hooks/useAuthedResource';

const NO_PROFILES: KidProfile[] = [];

interface KidProfilesContextType {
  profiles: KidProfile[];
  loading: boolean;
  /** True when the fetch failed — do not render "no kids yet" in this state. */
  error: boolean;
  reload: () => void;
  addProfile: (name: string, avatarColor: AvatarColor, avatarAnimal?: AvatarAnimal) => Promise<KidProfile>;
  updateProfile: (id: string, updates: Partial<Omit<KidProfile, 'id'>>) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  getProfile: (id: string) => KidProfile | undefined;
}

const KidProfilesContext = createContext<KidProfilesContextType | null>(null);

export function KidProfilesProvider({ children }: { children: ReactNode }) {
  const {
    data: profiles,
    setData: setProfiles,
    loading,
    error,
    reload,
  } = useAuthedResource('profiles', () => profilesApi.getAll().then((d) => d.profiles), NO_PROFILES);

  const addProfile = useCallback(async (name: string, avatarColor: AvatarColor, avatarAnimal?: AvatarAnimal): Promise<KidProfile> => {
    const newProfile = await profilesApi.create(name, avatarColor, avatarAnimal);
    setProfiles((prev) => [...prev, newProfile]);
    return newProfile;
  }, [setProfiles]);

  const updateProfile = useCallback(async (id: string, updates: Partial<Omit<KidProfile, 'id'>>) => {
    const updated = await profilesApi.update(id, updates);
    setProfiles((prev) => prev.map((profile) => profile.id === id ? updated : profile));
  }, [setProfiles]);

  const deleteProfile = useCallback(async (id: string) => {
    await profilesApi.delete(id);
    setProfiles((prev) => prev.filter((profile) => profile.id !== id));
  }, [setProfiles]);

  const getProfile = useCallback((id: string): KidProfile | undefined => {
    return profiles.find((profile) => profile.id === id);
  }, [profiles]);

  return (
    <KidProfilesContext.Provider
      value={{
        profiles,
        loading,
        error,
        reload,
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
