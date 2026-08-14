import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { getPlaceholderImageUrl } from '../../utils/imageUtils';

interface FoodCardProps {
  name: string;
  imageUrl: string | null;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  size?: 'md' | 'lg';
  responsive?: boolean;
  className?: string;
  /** 'full-bleed' fills the card with the photo and overlays the name, badge top-right. */
  variant?: 'stacked' | 'full-bleed';
  /** Full-bleed only: shows a dashed "+" badge to hint room remains for another pick. */
  showAddBadge?: boolean;
}

export function FoodCard({
  name,
  imageUrl,
  selected = false,
  disabled = false,
  onClick,
  size = 'lg',
  responsive = false,
  className = '',
  variant = 'stacked',
  showAddBadge = false,
}: FoodCardProps) {
  const [imageError, setImageError] = useState(false);
  const isClickable = !!onClick && !disabled;

  // Responsive sizing adapts to container width via CSS grid
  const sizeStyles = {
    md: responsive ? 'w-full min-w-[120px] h-auto aspect-[9/11]' : 'w-36 h-44',
    lg: responsive ? 'w-full min-w-[140px] h-auto aspect-[11/13]' : 'w-44 h-52',
  };

  const imageSizeStyles = {
    md: responsive ? 'aspect-[4/3]' : 'h-28',
    lg: responsive ? 'aspect-[4/3]' : 'h-36',
  };

  const handleClick = () => {
    if (isClickable && onClick) {
      onClick();
    }
  };

  const handleKeyDown = isClickable
    ? (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }
    : undefined;

  if (variant === 'full-bleed') {
    return (
      <div
        className={`kid-food-card ${className}`}
        data-variant="full-bleed"
        data-interactive={isClickable}
        data-selected={selected}
        data-disabled={disabled}
        onClick={handleClick}
        role={onClick ? 'button' : undefined}
        tabIndex={isClickable ? 0 : disabled ? -1 : undefined}
        onKeyDown={handleKeyDown}
        aria-label={onClick ? `Select ${name}` : name}
        aria-pressed={selected}
        aria-disabled={disabled}
      >
        <img
          src={imageError || !imageUrl ? getPlaceholderImageUrl() : imageUrl}
          alt=""
          className="kid-food-card-photo"
          onError={() => setImageError(true)}
        />
        <span className="kid-food-card-caption">{name}</span>

        {selected && (
          <div className="kid-selection-badge absolute top-2 right-2">
            <Check className="w-5 h-5 text-white" strokeWidth={3} />
          </div>
        )}

        {!selected && !disabled && showAddBadge && (
          <div className="kid-food-card-add-badge absolute top-2 right-2 w-7 h-7" aria-hidden="true">
            <Plus className="w-4 h-4" strokeWidth={3.5} />
          </div>
        )}

        {disabled && !selected && (
          <div className="absolute inset-0 bg-gray-900/25 flex items-center justify-center">
            <div className="bg-white/80 rounded-full p-2">
              <Check className="w-6 h-6 text-gray-500" strokeWidth={2} />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`
        ${sizeStyles[size]} ${className}
        kid-food-card
      `}
      data-interactive={isClickable}
      data-selected={selected}
      data-disabled={disabled}
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={isClickable ? 0 : disabled ? -1 : undefined}
      onKeyDown={handleKeyDown}
      aria-label={onClick ? `Select ${name}` : name}
      aria-pressed={selected}
      aria-disabled={disabled}
    >
      {/* Image */}
      <div className={`${imageSizeStyles[size]} bg-gray-100 overflow-hidden`}>
        <img
          src={imageError || !imageUrl ? getPlaceholderImageUrl() : imageUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      </div>

      {/* Name */}
      <div className="flex-1 flex items-center justify-center p-2">
        <span className="text-lg font-semibold text-gray-800 text-center leading-tight">
          {name}
        </span>
      </div>

      {/* Selection indicator */}
      {selected && (
        <div className="kid-selection-badge absolute top-2 right-2">
          <Check className="w-5 h-5 text-white" strokeWidth={3} />
        </div>
      )}

      {/* Disabled indicator - shows when item is selected elsewhere */}
      {disabled && !selected && (
        <div className="absolute inset-0 bg-gray-500/20 flex items-center justify-center">
          <div className="bg-white/80 rounded-full p-2">
            <Check className="w-6 h-6 text-gray-500" strokeWidth={2} />
          </div>
        </div>
      )}
    </div>
  );
}
