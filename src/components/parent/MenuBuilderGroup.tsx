import { useState, useRef, useEffect, useMemo } from 'react';
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
  const { items, allTags } = useFoodLibrary();
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [labelValue, setLabelValue] = useState(group.label);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const labelInputRef = useRef<HTMLInputElement>(null);

  // Track ALL selections including filtered-out ones (for remembering)
  const [allSelectedIds, setAllSelectedIds] = useState<Set<string>>(() => new Set(group.foodIds));

  // Track the group ID to detect when switching to a different group (menu load)
  const prevGroupIdRef = useRef(group.id);

  // Sync allSelectedIds when group.foodIds changes externally (e.g., loading saved menu)
  useEffect(() => {
    // If group ID changed, this is a new group - fully sync
    if (prevGroupIdRef.current !== group.id) {
      setAllSelectedIds(new Set(group.foodIds));
      prevGroupIdRef.current = group.id;
    } else {
      // Same group - only add new IDs (preserve hidden selections)
      setAllSelectedIds((prev) => {
        const newSet = new Set(prev);
        group.foodIds.forEach((id) => newSet.add(id));
        return newSet;
      });
    }
  }, [group.id, group.foodIds]);

  useEffect(() => {
    if (isEditingLabel && labelInputRef.current) {
      labelInputRef.current.focus();
      labelInputRef.current.select();
    }
  }, [isEditingLabel]);

  // Filter items based on filterTags (include) and excludeTags
  const filteredItems = useMemo(() => {
    const includeTags = group.filterTags || [];
    const excludeTags = group.excludeTags || [];

    return items.filter((item) => {
      // If excludeTags are set, hide items that have any of them
      if (excludeTags.length > 0 && item.tags?.some((tag) => excludeTags.includes(tag))) {
        return false;
      }
      // If includeTags are set, only show items that have at least one
      if (includeTags.length > 0 && !item.tags?.some((tag) => includeTags.includes(tag))) {
        return false;
      }
      return true;
    });
  }, [items, group.filterTags, group.excludeTags]);

  // Get the set of filtered item IDs for quick lookup
  const filteredItemIds = useMemo(() => new Set(filteredItems.map((i) => i.id)), [filteredItems]);

  // Compute effective foodIds (only items that pass the filter)
  const effectiveFoodIds = useMemo(() => {
    return [...allSelectedIds].filter((id) => filteredItemIds.has(id));
  }, [allSelectedIds, filteredItemIds]);

  // Update group.foodIds when effectiveFoodIds changes
  useEffect(() => {
    const currentSorted = [...group.foodIds].sort().join(',');
    const effectiveSorted = [...effectiveFoodIds].sort().join(',');
    if (currentSorted !== effectiveSorted) {
      onUpdate({ foodIds: effectiveFoodIds });
    }
  }, [effectiveFoodIds, group.foodIds, onUpdate]);

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

  // 3-state toggle: neutral → include → exclude → neutral
  const handleFilterTagToggle = (tag: string) => {
    const includeTags = group.filterTags || [];
    const excludeTags = group.excludeTags || [];

    const isIncluded = includeTags.includes(tag);
    const isExcluded = excludeTags.includes(tag);

    if (!isIncluded && !isExcluded) {
      // Neutral → Include
      onUpdate({ filterTags: [...includeTags, tag] });
    } else if (isIncluded) {
      // Include → Exclude
      const newInclude = includeTags.filter((t) => t !== tag);
      onUpdate({
        filterTags: newInclude.length > 0 ? newInclude : undefined,
        excludeTags: [...excludeTags, tag]
      });
    } else {
      // Exclude → Neutral
      const newExclude = excludeTags.filter((t) => t !== tag);
      onUpdate({ excludeTags: newExclude.length > 0 ? newExclude : undefined });
    }
  };

  const handleFoodToggle = (foodId: string) => {
    setAllSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(foodId)) {
        newSet.delete(foodId);
      } else {
        newSet.add(foodId);
      }
      return newSet;
    });
  };

  const handleImageError = (id: string) => {
    setImageErrors((prev) => new Set(prev).add(id));
  };

  const presetConfig = SELECTION_PRESET_CONFIG[group.selectionPreset];

  // Count of hidden selected items
  const hiddenSelectedCount = [...allSelectedIds].filter((id) => !filteredItemIds.has(id)).length;

  return (
    <div className="mb-6 border border-gray-200 rounded-lg p-4 bg-white">
      {/* Header with label and preset */}
      <div className="flex items-center gap-3 mb-3">
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

      {/* Tag filter chips */}
      <div className="mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Filter:</span>
          {allTags.map((tag) => {
            const isIncluded = group.filterTags?.includes(tag);
            const isExcluded = group.excludeTags?.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => handleFilterTagToggle(tag)}
                className={`
                  px-2 py-0.5 rounded-full text-xs transition-colors
                  ${isIncluded
                    ? 'bg-success text-white'
                    : isExcluded
                      ? 'bg-danger text-white line-through'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
                title={isIncluded ? 'Including (click to exclude)' : isExcluded ? 'Excluding (click to reset)' : 'Click to include'}
              >
                {isIncluded && '+ '}
                {isExcluded && '- '}
                {tag}
              </button>
            );
          })}
          {((group.filterTags && group.filterTags.length > 0) || (group.excludeTags && group.excludeTags.length > 0)) && (
            <button
              onClick={() => onUpdate({ filterTags: undefined, excludeTags: undefined })}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Food selection grid */}
      {items.length === 0 ? (
        <p className="text-gray-500 text-center py-4">
          No food items yet. Add some in the Food Library!
        </p>
      ) : filteredItems.length === 0 ? (
        <p className="text-gray-500 text-center py-4">
          No foods match the selected tags.
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {filteredItems.map((item: FoodItem) => {
            const isSelected = allSelectedIds.has(item.id);
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
        Kids will {presetConfig.label.toLowerCase()} from {effectiveFoodIds.length} {effectiveFoodIds.length === 1 ? 'item' : 'items'} selected.
        {hiddenSelectedCount > 0 && (
          <span className="text-warning ml-1">
            ({hiddenSelectedCount} hidden by filter)
          </span>
        )}
      </div>
    </div>
  );
}
