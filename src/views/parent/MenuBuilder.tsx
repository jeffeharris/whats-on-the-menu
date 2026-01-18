import { useState, useEffect, useMemo } from 'react';
import { Button } from '../../components/common/Button';
import { MenuBuilderGroup } from '../../components/parent/MenuBuilderGroup';
import { useFoodLibrary } from '../../contexts/FoodLibraryContext';
import { useMenu } from '../../contexts/MenuContext';
import { useAppState } from '../../contexts/AppStateContext';
import type { MenuGroup } from '../../types';
import { SELECTION_PRESET_CONFIG } from '../../types';

interface MenuBuilderProps {
  onBack: () => void;
}

// Generate a unique ID for new groups
function generateGroupId(): string {
  return `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Default groups when starting fresh
const DEFAULT_GROUPS: MenuGroup[] = [
  {
    id: 'main-group',
    label: 'Main Dishes',
    foodIds: [],
    selectionPreset: 'pick-1',
    order: 0,
  },
  {
    id: 'side-group',
    label: 'Side Dishes',
    foodIds: [],
    selectionPreset: 'pick-1-2',
    order: 1,
  },
];

export function MenuBuilder({ onBack }: MenuBuilderProps) {
  const { items } = useFoodLibrary();
  const { currentMenu, createMenu, clearMenu } = useMenu();
  const { setMode } = useAppState();

  // Local state for editing groups
  const [groups, setGroups] = useState<MenuGroup[]>(
    currentMenu?.groups || DEFAULT_GROUPS
  );

  // Sync with current menu when it changes
  useEffect(() => {
    if (currentMenu?.groups) {
      setGroups(currentMenu.groups);
    }
  }, [currentMenu]);

  // Memoized updaters to prevent infinite loops in child useEffect
  // Each group gets a stable callback reference that only changes when groups array changes
  const groupUpdaters = useMemo(() => {
    const updaters: Record<string, (updates: Partial<MenuGroup>) => void> = {};
    groups.forEach((g) => {
      updaters[g.id] = (updates: Partial<MenuGroup>) => {
        setGroups((prev) =>
          prev.map((grp) => (grp.id === g.id ? { ...grp, ...updates } : grp))
        );
      };
    });
    return updaters;
  }, [groups.map((g) => g.id).join(',')]);

  const handleRemoveGroup = (groupId: string) => {
    setGroups((prev) => {
      const filtered = prev.filter((g) => g.id !== groupId);
      // Re-order remaining groups
      return filtered.map((g, idx) => ({ ...g, order: idx }));
    });
  };

  const handleAddGroup = () => {
    const newGroup: MenuGroup = {
      id: generateGroupId(),
      label: 'New Group',
      foodIds: [],
      selectionPreset: 'pick-1',
      order: groups.length,
    };
    setGroups((prev) => [...prev, newGroup]);
  };

  // Check if menu is valid (at least one group with at least 2 items meeting preset min)
  const isValidMenu = groups.length > 0 && groups.every((group) => {
    const presetConfig = SELECTION_PRESET_CONFIG[group.selectionPreset];
    // Need at least enough items to meet minimum selection requirement
    return group.foodIds.length >= presetConfig.min;
  });

  // Check if there are changes from the saved menu
  const hasChanges = !currentMenu ||
    JSON.stringify(groups) !== JSON.stringify(currentMenu.groups);

  const handleSave = async () => {
    await createMenu(groups);
  };

  const handleLaunch = async () => {
    if (hasChanges && isValidMenu) {
      await createMenu(groups);
    }
    setMode('kid');
  };

  const handleClear = async () => {
    if (confirm('Are you sure you want to clear the current menu?')) {
      await clearMenu();
      setGroups(DEFAULT_GROUPS);
    }
  };

  // Validation message
  const getValidationMessage = () => {
    if (groups.length === 0) {
      return 'Add at least one group to create a menu';
    }
    for (const group of groups) {
      const presetConfig = SELECTION_PRESET_CONFIG[group.selectionPreset];
      if (group.foodIds.length < presetConfig.min) {
        return `"${group.label}" needs at least ${presetConfig.min} item(s) for kids to ${presetConfig.label.toLowerCase()}`;
      }
    }
    return null;
  };

  const validationMessage = getValidationMessage();

  return (
    <div className="h-full bg-parent-bg flex flex-col overflow-hidden">
      <header className="flex-shrink-0 flex items-center gap-4 p-4 md:p-6 max-w-3xl mx-auto w-full">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Go back"
        >
          <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-800 flex-1">Menu Builder</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 pt-0">
        <div className="max-w-2xl md:max-w-3xl mx-auto">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                You need to add some food items first!
              </p>
              <Button variant="primary" onClick={onBack}>
                Go to Food Library
              </Button>
            </div>
          ) : (
            <>
              {/* Menu groups */}
              {groups
                .sort((a, b) => a.order - b.order)
                .map((group) => (
                  <MenuBuilderGroup
                    key={group.id}
                    group={group}
                    onUpdate={groupUpdaters[group.id]}
                    onRemove={() => handleRemoveGroup(group.id)}
                    canRemove={groups.length > 1}
                  />
                ))}

              {/* Add group button */}
              <button
                onClick={handleAddGroup}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-parent-primary hover:text-parent-primary transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Another Group
              </button>

              {/* Validation message */}
              {validationMessage && (
                <p className="text-center text-warning mt-4">
                  {validationMessage}
                </p>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-3 mt-8">
                {hasChanges && isValidMenu && (
                  <Button variant="secondary" fullWidth onClick={handleSave}>
                    Save Changes
                  </Button>
                )}

                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleLaunch}
                  disabled={!isValidMenu && !currentMenu}
                >
                  {currentMenu && !hasChanges ? 'Launch Kid Mode' : 'Save & Launch Kid Mode'}
                </Button>

                {currentMenu && (
                  <Button variant="ghost" fullWidth onClick={handleClear}>
                    Clear Menu
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
