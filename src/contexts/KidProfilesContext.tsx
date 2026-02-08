import { createContext, useContext, useCallback, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { profilesApi } from '../api/client';
import type { KidProfile, AvatarColor, AvatarAnimal } from '../types';

interface KidProfilesContextType {
  profiles: KidProfile[];
  loading: boolean;
  addProfile: (name: string, avatarColor: AvatarColor, avatarAnimal?: AvatarAnimal) => Promise<KidProfile>;
  updateProfile: (id: string, updates: Partial<Omit<KidProfile, 'id'>>) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  getProfile: (id: string) => KidProfile | undefined;
}

const KidProfilesContext = createContext<KidProfilesContextType | null>(null);

export function KidProfilesProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<KidProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    profilesApi.getAll()
      .then((data) => setProfiles(data.profiles))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const addProfile = useCallback(async (name: string, avatarColor: AvatarColor, avatarAnimal?: AvatarAnimal): Promise<KidProfile> => {
    const newProfile = await profilesApi.create(name, avatarColor, avatarAnimal);
    setProfiles((prev) => [...prev, newProfile]);
    return newProfile;
  }, []);

  const updateProfile = useCallback(async (id: string, updates: Partial<Omit<KidProfile, 'id'>>) => {
    const updated = await profilesApi.update(id, updates);
    setProfiles((prev) => prev.map((profile) => profile.id === id ? updated : profile));
  }, []);

  const deleteProfile = useCallback(async (id: string) => {
    await profilesApi.delete(id);
    setProfiles((prev) => prev.filter((profile) => profile.id !== id));
  }, []);

  const getProfile = useCallback((id: string): KidProfile | undefined => {
    return profiles.find((profile) => profile.id === id);
  }, [profiles]);

  return (
    <KidProfilesContext.Provider
      value={{
        profiles,
        loading,
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
