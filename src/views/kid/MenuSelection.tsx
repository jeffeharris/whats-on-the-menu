import { useState, useMemo } from 'react';
import { Button } from '../../components/common/Button';
import { FoodCard } from '../../components/kid/FoodCard';
import { CategorySection } from '../../components/kid/CategorySection';
import { KidAvatar } from '../../components/kid/KidAvatar';
import { useFoodLibrary } from '../../contexts/FoodLibraryContext';
import { useKidProfiles } from '../../contexts/KidProfilesContext';
import { useMenu } from '../../contexts/MenuContext';
import type { GroupSelections } from '../../types';
import { SELECTION_PRESET_CONFIG } from '../../types';

interface MenuSelectionProps {
  kidId: string;
  onComplete: () => void;
  onBack: () => void;
}

export function MenuSelection({ kidId, onComplete, onBack }: MenuSelectionProps) {
  const { getItem } = useFoodLibrary();
  const { getProfile } = useKidProfiles();
  const { currentMenu, addSelection, getSelectionForKid } = useMenu();

  const kid = getProfile(kidId);
  const existingSelection = getSelectionForKid(kidId);

  // Initialize selections from existing selection or empty
  const [selections, setSelections] = useState<GroupSelections>(() => {
    if (existingSelection?.selections) {
      return existingSelection.selections;
    }
    // Initialize empty selections for each group
    const initial: GroupSelections = {};
    currentMenu?.groups.forEach((group) => {
      initial[group.id] = [];
    });
    return initial;
  });

  if (!currentMenu || !kid) {
    return null;
  }

  // Get all food IDs selected across all groups (for cross-group exclusion)
  const allSelectedFoodIds = useMemo(() => {
    const allIds = new Set<string>();
    Object.values(selections).forEach((ids) => {
      ids.forEach((id) => allIds.add(id));
    });
    return allIds;
  }, [selections]);

  // Handle food selection within a group
  const handleFoodSelect = (groupId: string, foodId: string) => {
    const group = currentMenu.groups.find((g) => g.id === groupId);
    if (!group) return;

    const presetConfig = SELECTION_PRESET_CONFIG[group.selectionPreset];
    const currentGroupSelections = selections[groupId] || [];

    setSelections((prev) => {
      const newSelections = { ...prev };

      // If food is already selected in THIS group, deselect it
      if (currentGroupSelections.includes(foodId)) {
        newSelections[groupId] = currentGroupSelections.filter((id) => id !== foodId);
        return newSelections;
      }

      // If food is selected in ANOTHER group, deselect it there first (cross-group exclusion)
      for (const [gId, gSelections] of Object.entries(newSelections)) {
        if (gId !== groupId && gSelections.includes(foodId)) {
          newSelections[gId] = gSelections.filter((id) => id !== foodId);
        }
      }

      // If at max selections for this group, replace oldest selection
      if (currentGroupSelections.length >= presetConfig.max) {
        // For pick-1 presets, just replace the selection
        if (presetConfig.max === 1) {
          newSelections[groupId] = [foodId];
        } else {
          // Remove first item and add new one
          newSelections[groupId] = [...currentGroupSelections.slice(1), foodId];
        }
      } else {
        // Add to selections
        newSelections[groupId] = [...currentGroupSelections, foodId];
      }

      return newSelections;
    });
  };

  // Check if all groups meet their minimum selection requirements
  const canConfirm = currentMenu.groups.every((group) => {
    const presetConfig = SELECTION_PRESET_CONFIG[group.selectionPreset];
    const groupSelections = selections[group.id] || [];
    return groupSelections.length >= presetConfig.min;
  });

  // Get user-friendly message for what's still needed
  const getRequirementsMessage = () => {
    for (const group of currentMenu.groups) {
      const presetConfig = SELECTION_PRESET_CONFIG[group.selectionPreset];
      const groupSelections = selections[group.id] || [];
      if (groupSelections.length < presetConfig.min) {
        const needed = presetConfig.min - groupSelections.length;
        return `Pick ${needed} more from ${group.label}!`;
      }
    }
    return "All done!";
  };

  const handleConfirm = async () => {
    await addSelection(kidId, selections);
    onComplete();
  };

  // Sort groups by order
  const sortedGroups = [...currentMenu.groups].sort((a, b) => a.order - b.order);

  return (
    <div className="h-full bg-kid-bg flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-4 p-4 md:p-6 pb-0 max-w-3xl mx-auto w-full">
        <button
          onClick={onBack}
          className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          aria-label="Go back"
        >
          <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-3 flex-1">
          <KidAvatar name={kid.name} color={kid.avatarColor} avatarAnimal={kid.avatarAnimal} size="md" />
          <div>
            <p className="text-gray-500 text-sm">Picking for</p>
            <h1 className="text-2xl font-bold text-gray-800">{kid.name}</h1>
          </div>
        </div>
      </header>

      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pt-4">
        {sortedGroups.map((group) => {
          const presetConfig = SELECTION_PRESET_CONFIG[group.selectionPreset];
          const groupSelections = selections[group.id] || [];
          const foodItems = group.foodIds.map((id) => getItem(id)).filter(Boolean);

          // Generate kid-friendly title
          const title = `Pick your ${group.label.toLowerCase()}!`;

          return (
            <CategorySection
              key={group.id}
              title={title}
              subtitle={presetConfig.label}
            >
              {foodItems.map((item) => {
                if (!item) return null;

                const isSelected = groupSelections.includes(item.id);
                // Check if this food is selected in another group (for visual feedback)
                const isSelectedElsewhere = !isSelected && allSelectedFoodIds.has(item.id);

                return (
                  <FoodCard
                    key={item.id}
                    name={item.name}
                    imageUrl={item.imageUrl}
                    selected={isSelected}
                    disabled={isSelectedElsewhere}
                    onClick={() => handleFoodSelect(group.id, item.id)}
                    responsive
                  />
                );
              })}
            </CategorySection>
          );
        })}
      </main>

      {/* Fixed Footer */}
      <footer className="flex-shrink-0 p-4 md:p-6 bg-kid-bg border-t border-kid-primary/10">
        <div className="max-w-xl mx-auto">
          <Button
            mode="kid"
            variant="primary"
            size="touch"
            fullWidth
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            {canConfirm ? "All done!" : getRequirementsMessage()}
          </Button>
        </div>
      </footer>
    </div>
  );
}
