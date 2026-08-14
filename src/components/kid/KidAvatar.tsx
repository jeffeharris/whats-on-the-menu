import type { AvatarColor, AvatarAnimal } from '../../types';
import { getAvatarImagePath } from '../../types';

interface KidAvatarProps {
  name: string;
  color: AvatarColor;
  avatarAnimal?: AvatarAnimal;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  selected?: boolean;
  onClick?: () => void;
  /** Overrides the default "Select {name}" / "{name}" label, e.g. for a switcher trigger. */
  ariaLabel?: string;
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

export function KidAvatar({ name, color, avatarAnimal, size = 'md', selected = false, onClick, ariaLabel }: KidAvatarProps) {
  const initial = name.charAt(0).toUpperCase();
  const isClickable = !!onClick;

  return (
    <div
      className={`
        ${sizeStyles[size]}
        ${colorStyles[color]}
        kid-avatar
        flex items-center justify-center
        font-bold text-white
        relative overflow-hidden
      `}
      data-interactive={isClickable}
      data-selected={selected}
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
      aria-label={ariaLabel ?? (isClickable ? `Select ${name}` : name)}
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
