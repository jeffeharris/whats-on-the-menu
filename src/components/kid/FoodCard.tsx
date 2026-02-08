import { useState } from 'react';
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

  return (
    <div
      className={`
        ${className || sizeStyles[size]}
        relative
        bg-white rounded-2xl shadow-lg overflow-hidden
        flex flex-col
        ${isClickable ? 'cursor-pointer touch-feedback' : ''}
        ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
        ${selected ? 'ring-4 ring-kid-secondary scale-105' : ''}
        transition-all duration-150
      `}
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={isClickable ? 0 : disabled ? -1 : undefined}
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
        <div className="absolute top-2 right-2 w-8 h-8 bg-kid-secondary rounded-full flex items-center justify-center">
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}

      {/* Disabled indicator - shows when item is selected elsewhere */}
      {disabled && !selected && (
        <div className="absolute inset-0 bg-gray-500/20 flex items-center justify-center">
          <div className="bg-white/80 rounded-full p-2">
            <svg
              className="w-6 h-6 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
