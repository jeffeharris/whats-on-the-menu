import { useState, useRef, useEffect } from 'react';
import { Card } from '../common/Card';
import { getPlaceholderImageUrl } from '../../utils/imageUtils';
import { useFoodLibrary } from '../../contexts/FoodLibraryContext';
import type { MenuGroup, SelectionPreset, FoodItem } from '../../types';
import { SELECTION_PRESET_CONFIG } from '../../types';

interface MenuBuilderGroupProps {
  group: MenuGroup;
  onUpdate: (updates: Partial<MenuGroup>) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export function MenuBuilderGroup({
  group,
  onUpdate,
  onRemove,
  canRemove,
}: MenuBuilderGroupProps) {
  const { items } = useFoodLibrary();
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [labelValue, setLabelValue] = useState(group.label);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const labelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingLabel && labelInputRef.current) {
      labelInputRef.current.focus();
      labelInputRef.current.select();
    }
  }, [isEditingLabel]);

  const handleLabelSave = () => {
    const trimmed = labelValue.trim();
    if (trimmed) {
      onUpdate({ label: trimmed });
    } else {
      setLabelValue(group.label);
    }
    setIsEditingLabel(false);
  };

  const handleLabelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLabelSave();
    } else if (e.key === 'Escape') {
      setLabelValue(group.label);
      setIsEditingLabel(false);
    }
  };

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate({ selectionPreset: e.target.value as SelectionPreset });
  };

  const handleFoodToggle = (foodId: string) => {
    const currentIds = group.foodIds;
    if (currentIds.includes(foodId)) {
      onUpdate({ foodIds: currentIds.filter((id) => id !== foodId) });
    } else {
      onUpdate({ foodIds: [...currentIds, foodId] });
    }
  };

  const handleImageError = (id: string) => {
    setImageErrors((prev) => new Set(prev).add(id));
  };

  const presetConfig = SELECTION_PRESET_CONFIG[group.selectionPreset];

  return (
    <div className="mb-6 border border-gray-200 rounded-lg p-4 bg-white">
      {/* Header with label and preset */}
      <div className="flex items-center gap-3 mb-4">
        {/* Editable label */}
        <div className="flex-1 flex items-center gap-2">
          {isEditingLabel ? (
            <input
              ref={labelInputRef}
              type="text"
              value={labelValue}
              onChange={(e) => setLabelValue(e.target.value)}
              onBlur={handleLabelSave}
              onKeyDown={handleLabelKeyDown}
              className="text-lg font-semibold text-gray-800 px-2 py-1 border border-parent-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-parent-primary"
            />
          ) : (
            <button
              onClick={() => setIsEditingLabel(true)}
              className="text-lg font-semibold text-gray-800 hover:text-parent-primary transition-colors flex items-center gap-1"
            >
              {group.label}
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
        </div>

        {/* Preset selector */}
        <select
          value={group.selectionPreset}
          onChange={handlePresetChange}
          className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-parent-primary"
        >
          <option value="pick-1">Pick exactly 1 from</option>
          <option value="pick-1-2">Pick 1 or 2 from</option>
          <option value="pick-2">Pick exactly 2 from</option>
          <option value="pick-2-3">Pick 2 or 3 from</option>
        </select>

        {/* Remove button */}
        {canRemove && (
          <button
            onClick={onRemove}
            className="p-2 text-gray-400 hover:text-danger transition-colors"
            aria-label="Remove group"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Food selection grid */}
      {items.length === 0 ? (
        <p className="text-gray-500 text-center py-4">
          No food items yet. Add some in the Food Library!
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {items.map((item: FoodItem) => {
            const isSelected = group.foodIds.includes(item.id);
            const hasError = imageErrors.has(item.id);

            return (
              <Card
                key={item.id}
                onClick={() => handleFoodToggle(item.id)}
                selected={isSelected}
                mode="parent"
                padding="none"
                className="overflow-hidden relative"
              >
                <div className="h-16 md:h-20 bg-gray-100 overflow-hidden">
                  <img
                    src={hasError || !item.imageUrl ? getPlaceholderImageUrl() : item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={() => handleImageError(item.id)}
                  />
                </div>
                <div className="p-1 text-center">
                  <span className="text-xs font-medium text-gray-800 line-clamp-1">{item.name}</span>
                </div>
                {isSelected && (
                  <div className="absolute top-1 right-1 w-5 h-5 bg-parent-primary rounded-full flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-white"
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

      {/* Selection count and preset info */}
      <div className="mt-3 text-sm text-gray-500">
        Kids will {presetConfig.label.toLowerCase()} from {group.foodIds.length} {group.foodIds.length === 1 ? 'item' : 'items'} selected.
      </div>
    </div>
  );
}
