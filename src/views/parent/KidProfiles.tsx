import { useState } from 'react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { KidProfileForm } from '../../components/parent/KidProfileForm';
import { KidAvatar } from '../../components/kid/KidAvatar';
import { useKidProfiles } from '../../contexts/KidProfilesContext';
import type { KidProfile, AvatarColor } from '../../types';

interface KidProfilesProps {
  onBack: () => void;
}

export function KidProfiles({ onBack }: KidProfilesProps) {
  const { profiles, addProfile, updateProfile, deleteProfile } = useKidProfiles();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<KidProfile | null>(null);

  const handleSubmit = (name: string, avatarColor: AvatarColor) => {
    if (editingProfile) {
      updateProfile(editingProfile.id, { name, avatarColor });
    } else {
      addProfile(name, avatarColor);
    }
    setIsFormOpen(false);
    setEditingProfile(null);
  };

  const handleEdit = (profile: KidProfile) => {
    setEditingProfile(profile);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this profile?')) {
      deleteProfile(id);
    }
  };

  return (
    <div className="min-h-screen bg-parent-bg p-4">
      <header className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Go back"
        >
          <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-800 flex-1">Kid Profiles</h1>
        <Button variant="primary" size="sm" onClick={() => setIsFormOpen(true)}>
          Add Kid
        </Button>
      </header>

      <div className="max-w-lg mx-auto">
        {profiles.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-gray-500 mb-4">No kids added yet</p>
            <Button variant="primary" onClick={() => setIsFormOpen(true)}>
              Add Your First Kid
            </Button>
          </Card>
        ) : (
          <div className="grid gap-3">
            {profiles.map((profile) => (
              <Card key={profile.id} padding="sm" className="flex items-center gap-4">
                <KidAvatar name={profile.name} color={profile.avatarColor} size="md" />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 text-lg">{profile.name}</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(profile)}
                    className="p-2 text-gray-500 hover:text-parent-primary transition-colors"
                    aria-label={`Edit ${profile.name}`}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(profile.id)}
                    className="p-2 text-gray-500 hover:text-danger transition-colors"
                    aria-label={`Delete ${profile.name}`}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

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
                }
              : undefined
          }
        />
      </Modal>
    </div>
  );
}
