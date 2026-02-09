import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { MenuBuilderGroup } from '../../components/parent/MenuBuilderGroup';
import { FoodItemForm } from '../../components/parent/FoodItemForm';
import { PresetSelector } from '../../components/parent/PresetSelector';
import { useFoodLibrary } from '../../contexts/FoodLibraryContext';
import { useMenu } from '../../contexts/MenuContext';
import { useAppState } from '../../contexts/AppStateContext';
import type { MenuGroup } from '../../types';
import { SELECTION_PRESET_CONFIG, PRESET_CONFIG } from '../../types';

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
  const { items, addItem } = useFoodLibrary();
  const {
    currentMenu,
    createMenu,
    clearMenu,
    currentPresetSlot,
    presets,
    saveCurrentAsPreset,
    startScratchMenu,
    loadPresetAsActive,
  } = useMenu();
  const { setMode } = useAppState();

  // Local state for editing groups
  const [groups, setGroups] = useState<MenuGroup[]>(
    currentMenu?.groups || DEFAULT_GROUPS
  );

  // State for quick-add food form
  const [isAddFoodOpen, setIsAddFoodOpen] = useState(false);
  const [prefillFoodName, setPrefillFoodName] = useState('');

  // Auto-save debounce timer ref
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync with current menu when it changes
  useEffect(() => {
    if (currentMenu?.groups) {
      setGroups(currentMenu.groups);
    }
  }, [currentMenu]);

  // Auto-save effect for presets with 1-second debounce
  useEffect(() => {
    if (!currentPresetSlot) return;

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Get the preset's current saved state
    const savedPreset = presets[currentPresetSlot];
    const savedGroups = savedPreset?.groups;

    // Check if there are actual changes
    if (savedGroups && JSON.stringify(groups) === JSON.stringify(savedGroups)) {
      return; // No changes, don't save
    }

    // Check if menu is valid (at least one group with items meeting preset minimum)
    const isValid = groups.length > 0 && groups.every((group) => {
      const presetConfig = SELECTION_PRESET_CONFIG[group.selectionPreset];
      return group.foodIds.length >= presetConfig.min;
    });

    if (!isValid) return; // Don't auto-save invalid menus

    // Debounce save
    autoSaveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        const presetName = savedPreset?.name || PRESET_CONFIG[currentPresetSlot].label;
        await saveCurrentAsPreset(currentPresetSlot, presetName, groups);
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setIsSaving(false);
      }
    }, 1000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [groups, currentPresetSlot, presets, saveCurrentAsPreset]);

  // Memoized updaters to prevent infinite loops in child useEffect
  // Each group gets a stable callback reference that only changes when groups array changes
  const groupIdKey = groups.map((g) => g.id).join(',');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIdKey]);

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

  // Check if there are changes from the saved menu/preset
  const hasChanges = useMemo(() => {
    if (currentPresetSlot) {
      const savedPreset = presets[currentPresetSlot];
      if (!savedPreset) return groups.some((g) => g.foodIds.length > 0);
      return JSON.stringify(groups) !== JSON.stringify(savedPreset.groups);
    }
    if (!currentMenu) return true;
    return JSON.stringify(groups) !== JSON.stringify(currentMenu.groups);
  }, [groups, currentMenu, currentPresetSlot, presets]);

  const handleSave = async () => {
    if (currentPresetSlot) {
      const presetName = presets[currentPresetSlot]?.name || PRESET_CONFIG[currentPresetSlot].label;
      await saveCurrentAsPreset(currentPresetSlot, presetName, groups);
    } else {
      await createMenu(groups);
    }
  };

  const handleLaunch = async () => {
    if (currentPresetSlot) {
      // For presets, save then set as active
      if (hasChanges && isValidMenu) {
        const presetName = presets[currentPresetSlot]?.name || PRESET_CONFIG[currentPresetSlot].label;
        await saveCurrentAsPreset(currentPresetSlot, presetName, groups);
      }
      await loadPresetAsActive(currentPresetSlot);
    } else {
      // For scratch menus, create and launch
      if (hasChanges && isValidMenu) {
        await createMenu(groups);
      }
    }
    setMode('kid');
  };

  const handleClear = async () => {
    if (confirm('Are you sure you want to clear the current menu?')) {
      await clearMenu();
      setGroups(DEFAULT_GROUPS);
    }
  };

  const handleScratchClick = () => {
    startScratchMenu();
    setGroups(DEFAULT_GROUPS);
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

  // Quick-add food handler
  const handleAddFood = useCallback((prefillName?: string) => {
    setPrefillFoodName(prefillName || '');
    setIsAddFoodOpen(true);
  }, []);

  const handleFoodSubmit = async (name: string, tags: string[], imageUrl: string | null) => {
    await addItem(name, tags, imageUrl);
    setIsAddFoodOpen(false);
    setPrefillFoodName('');
  };

  // Get current mode label
  const getModeLabel = () => {
    if (currentPresetSlot) {
      const presetName = presets[currentPresetSlot]?.name || PRESET_CONFIG[currentPresetSlot].label;
      return `Editing ${presetName}`;
    }
    return 'Building from Scratch';
  };

  return (
    <div className="h-full bg-parent-bg flex flex-col overflow-hidden">
      <header className="flex-shrink-0 flex items-center gap-4 p-4 md:p-6 max-w-3xl mx-auto w-full">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800 font-heading">Menu Builder</h1>
          <p className="text-sm text-gray-500 flex items-center gap-2">
            {getModeLabel()}
            {isSaving && <span className="text-parent-primary">Saving...</span>}
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 pt-0">
        <div className="max-w-2xl md:max-w-3xl mx-auto">
          {/* Preset selector */}
          <PresetSelector onScratchClick={handleScratchClick} />

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
                  <div key={group.id} className="animate-fade-up-in" style={{ animationDelay: `${group.order * 60}ms` }}>
                    <MenuBuilderGroup
                      group={group}
                      onUpdate={groupUpdaters[group.id]}
                      onRemove={() => handleRemoveGroup(group.id)}
                      onAddFood={handleAddFood}
                      canRemove={groups.length > 1}
                    />
                  </div>
                ))}

              {/* Add group button */}
              <button
                onClick={handleAddGroup}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-parent-primary hover:text-parent-primary transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
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
                {!currentPresetSlot && hasChanges && isValidMenu && (
                  <Button variant="secondary" fullWidth onClick={handleSave}>
                    Save Changes
                  </Button>
                )}

                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleLaunch}
                  disabled={!isValidMenu}
                >
                  {currentPresetSlot
                    ? `Launch ${presets[currentPresetSlot]?.name || PRESET_CONFIG[currentPresetSlot].label}`
                    : hasChanges
                      ? 'Save & Launch Kid Mode'
                      : 'Launch Kid Mode'
                  }
                </Button>

                {currentMenu && !currentPresetSlot && (
                  <Button variant="ghost" fullWidth onClick={handleClear}>
                    Clear Menu
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      <Modal
        isOpen={isAddFoodOpen}
        onClose={() => {
          setIsAddFoodOpen(false);
          setPrefillFoodName('');
        }}
        title="Add Food"
      >
        <FoodItemForm
          onSubmit={handleFoodSubmit}
          onCancel={() => {
            setIsAddFoodOpen(false);
            setPrefillFoodName('');
          }}
          initialValues={
            prefillFoodName
              ? { name: prefillFoodName, tags: [], imageUrl: null }
              : undefined
          }
        />
      </Modal>
    </div>
  );
}
