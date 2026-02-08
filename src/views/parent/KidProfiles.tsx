import { useState } from 'react';
import { ArrowLeft, Plus, Pencil, Trash2, Users } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { KidProfileForm } from '../../components/parent/KidProfileForm';
import { KidAvatar } from '../../components/kid/KidAvatar';
import { useKidProfiles } from '../../contexts/KidProfilesContext';
import type { KidProfile, AvatarColor, AvatarAnimal } from '../../types';

interface KidProfilesProps {
  onBack: () => void;
}

export function KidProfiles({ onBack }: KidProfilesProps) {
  const { profiles, addProfile, updateProfile, deleteProfile } = useKidProfiles();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<KidProfile | null>(null);

  const handleSubmit = async (name: string, avatarColor: AvatarColor, avatarAnimal?: AvatarAnimal) => {
    if (editingProfile) {
      await updateProfile(editingProfile.id, { name, avatarColor, avatarAnimal });
    } else {
      await addProfile(name, avatarColor, avatarAnimal);
    }
    setIsFormOpen(false);
    setEditingProfile(null);
  };

  const handleEdit = (profile: KidProfile) => {
    setEditingProfile(profile);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this profile?')) {
      await deleteProfile(id);
    }
  };

  return (
    <div className="h-full bg-parent-bg flex flex-col overflow-hidden">
      <header className="flex-shrink-0 flex items-center gap-4 p-4 md:p-6 max-w-3xl mx-auto w-full">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-800 flex-1" style={{ fontFamily: 'var(--font-heading)' }}>
          Kid Profiles
        </h1>
        <Button variant="primary" size="sm" onClick={() => setIsFormOpen(true)}>
          <span className="flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            Add
          </span>
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 pt-0">
        <div className="max-w-lg mx-auto">
          {profiles.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-parent-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-parent-secondary/60" />
              </div>
              <p className="text-gray-500 text-lg" style={{ fontFamily: 'var(--font-heading)' }}>
                No kids added yet
              </p>
              <p className="text-gray-400 text-sm mt-1">Add your first kid to get started!</p>
              <Button variant="primary" className="mt-4" onClick={() => setIsFormOpen(true)}>
                <span className="flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  Add Your First Kid
                </span>
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="text-xs font-semibold tracking-widest uppercase text-gray-400"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {profiles.length} {profiles.length === 1 ? 'kid' : 'kids'}
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent" />
              </div>
              <div className="grid gap-3">
                {profiles.map((profile, index) => (
                  <Card
                    key={profile.id}
                    padding="sm"
                    className="fade-up-in"
                    style={{ animationDelay: `${Math.min(index * 60, 500)}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <KidAvatar name={profile.name} color={profile.avatarColor} avatarAnimal={profile.avatarAnimal} size="md" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 text-lg">{profile.name}</h3>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(profile)}
                          className="p-2 text-gray-500 hover:text-parent-primary transition-colors"
                          aria-label={`Edit ${profile.name}`}
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(profile.id)}
                          className="p-2 text-gray-500 hover:text-danger transition-colors"
                          aria-label={`Delete ${profile.name}`}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      <Modal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingProfile(null);
        }}
        title={editingProfile ? 'Edit Profile' : 'Add Kid'}
      >
        <KidProfileForm
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsFormOpen(false);
            setEditingProfile(null);
          }}
          initialValues={
            editingProfile
              ? {
                  name: editingProfile.name,
                  avatarColor: editingProfile.avatarColor,
                  avatarAnimal: editingProfile.avatarAnimal,
                }
              : undefined
          }
        />
      </Modal>
    </div>
  );
}
