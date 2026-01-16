import { useState } from 'react';
import { Button } from '../common/Button';
import { KidAvatar } from '../kid/KidAvatar';
import type { AvatarColor } from '../../types';

interface KidProfileFormProps {
  onSubmit: (name: string, avatarColor: AvatarColor) => void;
  onCancel: () => void;
  initialValues?: {
    name: string;
    avatarColor: AvatarColor;
  };
}

const AVATAR_COLORS: AvatarColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'];

export function KidProfileForm({ onSubmit, onCancel, initialValues }: KidProfileFormProps) {
  const [name, setName] = useState(initialValues?.name || '');
  const [avatarColor, setAvatarColor] = useState<AvatarColor>(initialValues?.avatarColor || 'blue');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim(), avatarColor);
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
        <div className="flex flex-wrap gap-3 justify-center">
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
              <KidAvatar name={name || '?'} color={color} size="sm" />
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="flex justify-center py-4">
        <div className="text-center">
          <KidAvatar name={name || '?'} color={avatarColor} size="lg" />
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
