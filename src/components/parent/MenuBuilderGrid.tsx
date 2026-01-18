import { useState } from 'react';
import { Card } from '../common/Card';
import { getPlaceholderImageUrl } from '../../utils/imageUtils';
import type { FoodItem } from '../../types';

interface MenuBuilderGridProps {
  items: FoodItem[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  minSelection?: number;
  maxSelection?: number;
  title: string;
}

export function MenuBuilderGrid({
  items,
  selectedIds,
  onSelectionChange,
  minSelection = 1,
  maxSelection = 4,
  title,
}: MenuBuilderGridProps) {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      // Remove from selection
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      // Add to selection if under max
      if (selectedIds.length < maxSelection) {
        onSelectionChange([...selectedIds, id]);
      }
    }
  };

  const handleImageError = (id: string) => {
    setImageErrors((prev) => new Set(prev).add(id));
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <span className="text-sm text-gray-500">
          {selectedIds.length}/{maxSelection} selected (min {minSelection})
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No items yet. Add some in the Food Library!
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
          {items.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            const hasError = imageErrors.has(item.id);

            return (
              <Card
                key={item.id}
                onClick={() => handleToggle(item.id)}
                selected={isSelected}
                mode="parent"
                padding="none"
                className="overflow-hidden relative"
              >
                <div className="h-24 md:h-28 bg-gray-100 overflow-hidden">
                  <img
                    src={hasError || !item.imageUrl ? getPlaceholderImageUrl() : item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={() => handleImageError(item.id)}
                  />
                </div>
                <div className="p-2 text-center">
                  <span className="text-sm font-medium text-gray-800">{item.name}</span>
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1 justify-center">
                      {item.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {isSelected && (
                  <div className="absolute top-1 right-1 w-6 h-6 bg-parent-primary rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
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
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
