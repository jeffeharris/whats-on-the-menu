import { Check } from 'lucide-react';
import { Card } from '../common/Card';
import { getPlaceholderImageUrl } from '../../utils/imageUtils';
import type { FoodItem } from '../../types';

interface FoodGridItemProps {
  item: FoodItem;
  imageError: boolean;
  onImageError: (id: string) => void;
  onEdit: (item: FoodItem) => void;
  isSelectable?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  animationDelay?: number;
}

export function FoodGridItem({
  item, imageError, onImageError, onEdit,
  isSelectable, isSelected, onToggleSelect, animationDelay = 0,
}: FoodGridItemProps) {
  const handleClick = () => {
    if (isSelectable && onToggleSelect) {
      onToggleSelect(item.id);
    } else {
      onEdit(item);
    }
  };

  return (
    <Card
      padding="none"
      className="overflow-hidden fade-up-in"
      style={{ animationDelay: `${animationDelay}ms` }}
      onClick={handleClick}
      selected={isSelected}
    >
      <div className="relative">
        <div className="aspect-square w-full overflow-hidden bg-gray-100">
          <img
            src={imageError || !item.imageUrl ? getPlaceholderImageUrl() : item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={() => onImageError(item.id)}
          />
        </div>
        {isSelectable && (
          <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2
                          flex items-center justify-center transition-colors
                          ${isSelected
                            ? 'bg-parent-primary border-parent-primary'
                            : 'bg-white/80 border-gray-300 backdrop-blur-sm'
                          }`}>
            {isSelected && <Check className="w-4 h-4 text-white" />}
          </div>
        )}
      </div>
      <div className="p-2.5">
        <h3 className="font-medium text-gray-800 text-sm truncate">{item.name}</h3>
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {item.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full text-[10px]">
                {tag}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="text-[10px] text-gray-400">+{item.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
