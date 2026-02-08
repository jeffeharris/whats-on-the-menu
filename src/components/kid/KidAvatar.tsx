import type { AvatarColor, AvatarAnimal } from '../../types';
import { getAvatarImagePath } from '../../types';

interface KidAvatarProps {
  name: string;
  color: AvatarColor;
  avatarAnimal?: AvatarAnimal;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  selected?: boolean;
  onClick?: () => void;
}

const colorStyles: Record<AvatarColor, string> = {
  red: 'bg-avatar-red',
  orange: 'bg-avatar-orange',
  yellow: 'bg-avatar-yellow',
  green: 'bg-avatar-green',
  teal: 'bg-avatar-teal',
  blue: 'bg-avatar-blue',
  purple: 'bg-avatar-purple',
  pink: 'bg-avatar-pink',
};

const sizeStyles = {
  sm: 'w-10 h-10 text-lg',
  md: 'w-16 h-16 text-2xl',
  lg: 'w-24 h-24 text-4xl',
  xl: 'w-32 h-32 text-5xl',
  '2xl': 'w-40 h-40 text-6xl',
};

export function KidAvatar({ name, color, avatarAnimal, size = 'md', selected = false, onClick }: KidAvatarProps) {
  const initial = name.charAt(0).toUpperCase();
  const isClickable = !!onClick;

  return (
    <div
      className={`
        ${sizeStyles[size]}
        ${colorStyles[color]}
        rounded-full
        flex items-center justify-center
        font-bold text-white
        shadow-lg
        relative overflow-hidden
        ${isClickable ? 'cursor-pointer touch-feedback hover:scale-105 transition-transform' : ''}
        ${selected ? 'ring-4 ring-kid-accent ring-offset-2' : ''}
      `}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      aria-label={isClickable ? `Select ${name}` : name}
    >
      {avatarAnimal ? (
        <img
          src={getAvatarImagePath(avatarAnimal)}
          alt={avatarAnimal}
          className="w-[85%] h-[85%] object-contain"
          draggable={false}
        />
      ) : (
        initial
      )}
    </div>
  );
}
