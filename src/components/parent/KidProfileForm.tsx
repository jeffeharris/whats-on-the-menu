import { useState } from 'react';
import { Button } from '../common/Button';
import { KidAvatar } from '../kid/KidAvatar';
import type { AvatarColor, AvatarAnimal } from '../../types';
import { AVATAR_ANIMALS } from '../../types';

interface KidProfileFormProps {
  onSubmit: (name: string, avatarColor: AvatarColor, avatarAnimal?: AvatarAnimal) => void;
  onCancel: () => void;
  initialValues?: {
    name: string;
    avatarColor: AvatarColor;
    avatarAnimal?: AvatarAnimal;
  };
}

const AVATAR_COLORS: AvatarColor[] = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink'];

export function KidProfileForm({ onSubmit, onCancel, initialValues }: KidProfileFormProps) {
  const [name, setName] = useState(initialValues?.name || '');
  const [avatarColor, setAvatarColor] = useState<AvatarColor>(initialValues?.avatarColor || 'blue');
  const [avatarAnimal, setAvatarAnimal] = useState<AvatarAnimal | undefined>(initialValues?.avatarAnimal);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim(), avatarColor, avatarAnimal);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name input */}
      <div>
        <label htmlFor="kid-name" className="block text-sm font-medium text-gray-700 mb-1">
          Name
        </label>
        <input
          id="kid-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Emma, Jack"
          className="
            w-full px-4 py-2 rounded-lg border border-gray-300
            focus:outline-none focus:ring-2 focus:ring-parent-primary focus:border-transparent
          "
          required
        />
      </div>

      {/* Avatar color selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Avatar Color
        </label>
        <div className="grid grid-cols-4 gap-3 justify-items-center">
          {AVATAR_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setAvatarColor(color)}
              className={`
                rounded-full p-1 transition-all
                ${avatarColor === color ? 'ring-2 ring-offset-2 ring-parent-primary' : ''}
              `}
              aria-label={`Select ${color} color`}
              aria-pressed={avatarColor === color}
            >
              <KidAvatar name=" " color={color} size="sm" />
            </button>
          ))}
        </div>
      </div>

      {/* Animal avatar selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Animal Avatar
        </label>
        <div className="grid grid-cols-4 gap-3">
          {/* None option - shows initial letter */}
          <button
            type="button"
            onClick={() => setAvatarAnimal(undefined)}
            className={`
              flex flex-col items-center gap-1 p-2 rounded-xl transition-all
              ${avatarAnimal === undefined ? 'ring-2 ring-parent-primary bg-parent-primary/5' : 'hover:bg-gray-50'}
            `}
            aria-label="No animal avatar"
            aria-pressed={avatarAnimal === undefined}
          >
            <KidAvatar name={name || '?'} color={avatarColor} size="sm" />
            <span className="text-xs text-gray-500">None</span>
          </button>
          {AVATAR_ANIMALS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setAvatarAnimal(id)}
              className={`
                flex flex-col items-center gap-1 p-2 rounded-xl transition-all
                ${avatarAnimal === id ? 'ring-2 ring-parent-primary bg-parent-primary/5' : 'hover:bg-gray-50'}
              `}
              aria-label={`Select ${label} avatar`}
              aria-pressed={avatarAnimal === id}
            >
              <KidAvatar name={name || '?'} color={avatarColor} avatarAnimal={id} size="sm" />
              <span className="text-xs text-gray-500">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="flex justify-center py-4">
        <div className="text-center">
          <KidAvatar name={name || '?'} color={avatarColor} avatarAnimal={avatarAnimal} size="lg" />
          <p className="mt-2 font-semibold text-gray-800">{name || 'Preview'}</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" variant="primary" className="flex-1" disabled={!name.trim()}>
          {initialValues ? 'Save' : 'Add Kid'}
        </Button>
      </div>
    </form>
  );
}
