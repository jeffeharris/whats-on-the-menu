import { useState } from 'react';
import { getPlaceholderImageUrl } from '../../utils/imageUtils';

interface FoodCardProps {
  name: string;
  imageUrl: string | null;
  selected?: boolean;
  onClick?: () => void;
  size?: 'md' | 'lg';
  responsive?: boolean;
}

export function FoodCard({
  name,
  imageUrl,
  selected = false,
  onClick,
  size = 'lg',
  responsive = false,
}: FoodCardProps) {
  const [imageError, setImageError] = useState(false);
  const isClickable = !!onClick;

  // Responsive sizing adapts to container width via CSS grid
  const sizeStyles = {
    md: responsive ? 'w-full min-w-[120px] h-auto aspect-[9/11]' : 'w-36 h-44',
    lg: responsive ? 'w-full min-w-[140px] h-auto aspect-[11/13]' : 'w-44 h-52',
  };

  const imageSizeStyles = {
    md: responsive ? 'aspect-[4/3]' : 'h-28',
    lg: responsive ? 'aspect-[4/3]' : 'h-36',
  };

  return (
    <div
      className={`
        ${sizeStyles[size]}
        relative
        bg-white rounded-2xl shadow-lg overflow-hidden
        flex flex-col
        ${isClickable ? 'cursor-pointer touch-feedback' : ''}
        ${selected ? 'ring-4 ring-kid-secondary scale-105' : ''}
        transition-all duration-150
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
      aria-pressed={selected}
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
    </div>
  );
}
