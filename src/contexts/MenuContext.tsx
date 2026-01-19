import { createContext, useContext, useCallback, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { menusApi } from '../api/client';
import type { Menu, KidSelection, MenuGroup, GroupSelections, PresetSlot, SavedMenu } from '../types';

type Presets = Record<PresetSlot, SavedMenu | null>;

interface MenuContextType {
  currentMenu: Menu | null;
  selections: KidSelection[];
  selectionsLocked: boolean;
  loading: boolean;
  // Preset state
  presets: Presets;
  currentPresetSlot: PresetSlot | null;
  presetsLoading: boolean;
  // Original menu methods
  createMenu: (groups: MenuGroup[]) => Promise<Menu>;
  clearMenu: () => Promise<void>;
  addSelection: (kidId: string, selections: GroupSelections) => Promise<void>;
  getSelectionForKid: (kidId: string) => KidSelection | undefined;
  clearSelections: () => Promise<void>;
  hasKidSelected: (kidId: string) => boolean;
  lockSelections: () => void;
  unlockAndClearSelections: () => Promise<void>;
  updateMenuGroup: (groupId: string, updates: Partial<MenuGroup>) => void;
  addMenuGroup: () => void;
  removeMenuGroup: (groupId: string) => void;
  // Preset methods
  loadPreset: (slot: PresetSlot) => void;
  saveCurrentAsPreset: (slot: PresetSlot, name: string, groups: MenuGroup[]) => Promise<void>;
  clearPreset: (slot: PresetSlot) => Promise<void>;
  copyPreset: (fromSlot: PresetSlot, toSlot: PresetSlot) => Promise<void>;
  renamePreset: (slot: PresetSlot, name: string) => Promise<void>;
  loadPresetAsActive: (slot: PresetSlot) => Promise<void>;
  setCurrentPresetSlot: (slot: PresetSlot | null) => void;
  startScratchMenu: () => void;
}

const MenuContext = createContext<MenuContextType | null>(null);

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

export function MenuProvider({ children }: { children: ReactNode }) {
  const [currentMenu, setCurrentMenu] = useState<Menu | null>(null);
  const [selections, setSelections] = useState<KidSelection[]>([]);
  const [selectionsLocked, setSelectionsLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  // Preset state
  const [presets, setPresets] = useState<Presets>({
    breakfast: null,
    snack: null,
    dinner: null,
    custom: null,
  });
  const [currentPresetSlot, setCurrentPresetSlot] = useState<PresetSlot | null>(null);
  const [presetsLoading, setPresetsLoading] = useState(true);

  // Track if initial load has happened
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    Promise.all([
      menusApi.getActive(),
      menusApi.getPresets(),
    ])
      .then(([activeData, presetsData]) => {
        if (activeData.menu) {
          setCurrentMenu({
            id: activeData.menu.id,
            groups: activeData.menu.groups,
          });
          // If the active menu is a preset, set currentPresetSlot
          if (activeData.menu.presetSlot) {
            setCurrentPresetSlot(activeData.menu.presetSlot);
          }
        }
        setSelections(activeData.selections);
        setPresets(presetsData.presets);
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false);
        setPresetsLoading(false);
      });
  }, []);

  const createMenu = useCallback(async (groups: MenuGroup[]): Promise<Menu> => {
    const savedMenu = await menusApi.create(groups, 'Menu');
    const newMenu: Menu = {
      id: savedMenu.id,
      groups: savedMenu.groups,
    };
    setCurrentMenu(newMenu);
    setSelections([]);
    return newMenu;
  }, []);

  const clearMenu = useCallback(async () => {
    await menusApi.setActive(null);
    setCurrentMenu(null);
    setSelections([]);
    setCurrentPresetSlot(null);
  }, []);

  const addSelection = useCallback(async (kidId: string, groupSelections: GroupSelections) => {
    const newSelection = await menusApi.addSelection(kidId, groupSelections);
    setSelections((prev) => [
      ...prev.filter((s) => s.kidId !== kidId),
      newSelection,
    ]);
  }, []);

  const getSelectionForKid = useCallback((kidId: string): KidSelection | undefined => {
    return selections.find((s) => s.kidId === kidId);
  }, [selections]);

  const clearSelections = useCallback(async () => {
    await menusApi.clearSelections();
    setSelections([]);
  }, []);

  const hasKidSelected = useCallback((kidId: string): boolean => {
    return selections.some((s) => s.kidId === kidId);
  }, [selections]);

  const lockSelections = useCallback(() => {
    setSelectionsLocked(true);
  }, []);

  const unlockAndClearSelections = useCallback(async () => {
    await menusApi.clearSelections();
    setSelections([]);
    setSelectionsLocked(false);
  }, []);

  // Local state updates for menu building (before saving)
  const updateMenuGroup = useCallback((groupId: string, updates: Partial<MenuGroup>) => {
    setCurrentMenu((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        groups: prev.groups.map((g) =>
          g.id === groupId ? { ...g, ...updates } : g
        ),
      };
    });
  }, []);

  const addMenuGroup = useCallback(() => {
    setCurrentMenu((prev) => {
      if (!prev) return prev;
      const newGroup: MenuGroup = {
        id: generateGroupId(),
        label: 'New Group',
        foodIds: [],
        selectionPreset: 'pick-1',
        order: prev.groups.length,
      };
      return {
        ...prev,
        groups: [...prev.groups, newGroup],
      };
    });
  }, []);

  const removeMenuGroup = useCallback((groupId: string) => {
    setCurrentMenu((prev) => {
      if (!prev) return prev;
      const filteredGroups = prev.groups.filter((g) => g.id !== groupId);
      // Re-order remaining groups
      return {
        ...prev,
        groups: filteredGroups.map((g, idx) => ({ ...g, order: idx })),
      };
    });
  }, []);

  // Preset methods
  const loadPreset = useCallback((slot: PresetSlot) => {
    const preset = presets[slot];
    if (preset) {
      setCurrentMenu({
        id: preset.id,
        groups: JSON.parse(JSON.stringify(preset.groups)), // Deep clone to avoid mutations
      });
      setCurrentPresetSlot(slot);
    } else {
      // Empty preset - start with default groups
      setCurrentMenu({
        id: `new-${slot}`,
        groups: JSON.parse(JSON.stringify(DEFAULT_GROUPS)),
      });
      setCurrentPresetSlot(slot);
    }
  }, [presets]);

  const saveCurrentAsPreset = useCallback(async (slot: PresetSlot, name: string, groups: MenuGroup[]) => {
    const savedMenu = await menusApi.updatePreset(slot, name, groups);
    setPresets((prev) => ({
      ...prev,
      [slot]: savedMenu,
    }));
    setCurrentMenu({
      id: savedMenu.id,
      groups: savedMenu.groups,
    });
  }, []);

  const clearPreset = useCallback(async (slot: PresetSlot) => {
    await menusApi.deletePreset(slot);
    setPresets((prev) => ({
      ...prev,
      [slot]: null,
    }));
    if (currentPresetSlot === slot) {
      setCurrentMenu(null);
      setCurrentPresetSlot(null);
    }
  }, [currentPresetSlot]);

  const copyPreset = useCallback(async (fromSlot: PresetSlot, toSlot: PresetSlot) => {
    const copiedMenu = await menusApi.copyPreset(fromSlot, toSlot);
    setPresets((prev) => ({
      ...prev,
      [toSlot]: copiedMenu,
    }));
  }, []);

  const renamePreset = useCallback(async (slot: PresetSlot, name: string) => {
    const preset = presets[slot];
    if (!preset) return;
    const savedMenu = await menusApi.updatePreset(slot, name, preset.groups);
    setPresets((prev) => ({
      ...prev,
      [slot]: savedMenu,
    }));
  }, [presets]);

  const loadPresetAsActive = useCallback(async (slot: PresetSlot) => {
    const preset = presets[slot];
    if (!preset) return;

    await menusApi.setActive(preset.id);
    setCurrentMenu({
      id: preset.id,
      groups: preset.groups,
    });
    setSelections([]);
    setCurrentPresetSlot(slot);
  }, [presets]);

  const startScratchMenu = useCallback(() => {
    setCurrentMenu({
      id: 'scratch',
      groups: JSON.parse(JSON.stringify(DEFAULT_GROUPS)),
    });
    setCurrentPresetSlot(null);
  }, []);

  return (
    <MenuContext.Provider
      value={{
        currentMenu,
        selections,
        selectionsLocked,
        loading,
        presets,
        currentPresetSlot,
        presetsLoading,
        createMenu,
        clearMenu,
        addSelection,
        getSelectionForKid,
        clearSelections,
        hasKidSelected,
        lockSelections,
        unlockAndClearSelections,
        updateMenuGroup,
        addMenuGroup,
        removeMenuGroup,
        loadPreset,
        saveCurrentAsPreset,
        clearPreset,
        copyPreset,
        renamePreset,
        loadPresetAsActive,
        setCurrentPresetSlot,
        startScratchMenu,
      }}
    >
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu() {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error('useMenu must be used within a MenuProvider');
  }
  return context;
}
