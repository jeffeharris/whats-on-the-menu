import { createContext, useContext, useCallback, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { menusApi } from '../api/client';
import type { Menu, KidSelection, MenuGroup, GroupSelections, PresetSlot, SavedMenu, SelectionStatus } from '../types';
import { useAuth } from './AuthContext';

type Presets = Record<PresetSlot, SavedMenu | null>;

interface MenuContextType {
  /** The menu currently launched for kids and persisted on the household. */
  activeMenu: Menu | null;
  /** The menu or preset currently selected in the parent editor. */
  currentMenu: Menu | null;
  selections: KidSelection[];
  selectionStatus: SelectionStatus;
  selectionRevision: number;
  selectionsLocked: boolean;
  loading: boolean;
  // Preset state
  presets: Presets;
  currentPresetSlot: PresetSlot | null;
  presetsLoading: boolean;
  /**
   * True when the preset fetch failed, so `presets` holds nulls we could not
   * verify. Callers MUST NOT treat those nulls as "this slot is empty" —
   * saving over one destroys whatever the server actually had.
   */
  presetsError: boolean;
  reloadPresets: () => void;
  refreshActiveMenu: () => Promise<SavedMenu | null>;
  // Original menu methods
  createMenu: (groups: MenuGroup[]) => Promise<Menu>;
  activateMenu: (menuId: string) => Promise<void>;
  clearMenu: () => Promise<void>;
  addSelection: (
    kidId: string,
    selections: GroupSelections,
    menuId: string,
    selectionRevision: number
  ) => Promise<void>;
  getSelectionForKid: (kidId: string) => KidSelection | undefined;
  clearSelections: () => Promise<void>;
  hasKidSelected: (kidId: string) => boolean;
  approveSelections: () => Promise<void>;
  unlockSelections: () => Promise<void>;
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
  const { isAuthenticated } = useAuth();
  const [activeMenu, setActiveMenu] = useState<Menu | null>(null);
  const [currentMenu, setCurrentMenu] = useState<Menu | null>(null);
  const [selections, setSelections] = useState<KidSelection[]>([]);
  const [selectionStatus, setSelectionStatus] = useState<SelectionStatus>('open');
  const [selectionRevision, setSelectionRevision] = useState(0);
  const [loading, setLoading] = useState(isAuthenticated);
  const selectionsLocked = selectionStatus === 'approved';

  // Preset state
  const [presets, setPresets] = useState<Presets>({
    breakfast: null,
    snack: null,
    dinner: null,
    custom: null,
  });
  const [currentPresetSlot, setCurrentPresetSlot] = useState<PresetSlot | null>(null);
  const [presetsLoading, setPresetsLoading] = useState(isAuthenticated);
  const [presetsError, setPresetsError] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);
  const editorInitializedRef = useRef(false);
  const editorPresetVersionRef = useRef<number | null>(null);
  const activeRefreshVersionRef = useRef(0);
  const presetsRefreshVersionRef = useRef(0);

  const reloadPresets = useCallback(() => {
    // Guarded so reload can never latch a spinner the effect won't clear.
    if (!isAuthenticated) return;
    setPresetsLoading(true);
    setPresetsError(false);
    setReloadCount((n) => n + 1);
  }, [isAuthenticated]);

  const applyActiveMenuData = useCallback((activeData: Awaited<ReturnType<typeof menusApi.getActive>>) => {
    const nextActiveMenu = activeData.menu ? {
      id: activeData.menu.id,
      groups: activeData.menu.groups,
    } : null;
    setActiveMenu(nextActiveMenu);
    // The editor starts on the launched menu, but subsequent device events must
    // not replace a preset or scratch draft the parent is working on.
    if (!editorInitializedRef.current) {
      editorInitializedRef.current = true;
      setCurrentMenu(nextActiveMenu);
      setCurrentPresetSlot(activeData.menu?.presetSlot ?? null);
      editorPresetVersionRef.current = activeData.menu?.updatedAt ?? null;
    }
    setSelections(activeData.selections);
    setSelectionStatus(activeData.selectionStatus);
    setSelectionRevision(activeData.selectionRevision);
  }, []);

  const refreshActiveMenu = useCallback(async (): Promise<SavedMenu | null> => {
    if (!isAuthenticated) return null;
    const refreshVersion = ++activeRefreshVersionRef.current;
    const activeData = await menusApi.getActive();
    if (refreshVersion !== activeRefreshVersionRef.current) return null;
    applyActiveMenuData(activeData);
    return activeData.menu;
  }, [applyActiveMenuData, isAuthenticated]);

  const refreshPresets = useCallback(async () => {
    if (!isAuthenticated) return;
    const refreshVersion = ++presetsRefreshVersionRef.current;
    const presetData = await menusApi.getPresets();
    if (refreshVersion !== presetsRefreshVersionRef.current) return;
    setPresets(presetData.presets);
    setPresetsError(false);
  }, [isAuthenticated]);

  const invalidatePresetsRefresh = useCallback(() => {
    presetsRefreshVersionRef.current += 1;
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    const activeRefreshVersion = ++activeRefreshVersionRef.current;
    const presetsRefreshVersion = ++presetsRefreshVersionRef.current;

    // allSettled, not all: these are independent reads, and letting a failed
    // preset fetch also discard a perfectly good active menu would strand the
    // family mid-meal.
    Promise.allSettled([menusApi.getActive(), menusApi.getPresets()])
      .then(([activeResult, presetsResult]) => {
        if (cancelled) return;

        if (
          activeResult.status === 'fulfilled'
          && activeRefreshVersion === activeRefreshVersionRef.current
        ) {
          applyActiveMenuData(activeResult.value);
        } else if (activeResult.status === 'rejected') {
          console.error('Failed to fetch active menu:', activeResult.reason);
        }

        if (
          presetsResult.status === 'fulfilled'
          && presetsRefreshVersion === presetsRefreshVersionRef.current
        ) {
          setPresets(presetsResult.value.presets);
          setPresetsError(false);
        } else if (presetsResult.status === 'rejected') {
          console.error('Failed to fetch presets:', presetsResult.reason);
          setPresetsError(true);
        }

        setLoading(false);
        setPresetsLoading(false);
      });

    return () => { cancelled = true; };
  }, [applyActiveMenuData, isAuthenticated, reloadCount]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const source = new EventSource('/api/menu-events');
    let fallbackPoll: ReturnType<typeof setInterval> | null = null;

    const runRefresh = (refresh: () => Promise<unknown>, label: string) => {
      void refresh().catch((error) => {
        console.error(`Failed to refresh ${label}:`, error);
      });
    };
    const reconcile = () => {
      runRefresh(refreshActiveMenu, 'active menu');
      runRefresh(refreshPresets, 'presets');
    };
    const stopFallbackPolling = () => {
      if (fallbackPoll) clearInterval(fallbackPoll);
      fallbackPoll = null;
    };
    const startFallbackPolling = () => {
      if (fallbackPoll) return;
      fallbackPoll = setInterval(reconcile, 10_000);
    };

    const handleMenuChanged = (rawEvent: Event) => {
      let event: { reason?: string; affectsActiveMenu?: boolean } = {};
      try {
        event = JSON.parse((rawEvent as MessageEvent<string>).data);
      } catch {
        // Unknown payloads still require a safe canonical refresh.
      }

      if (event.reason === 'preset-changed') {
        runRefresh(refreshPresets, 'presets');
        if (event.affectsActiveMenu) runRefresh(refreshActiveMenu, 'active menu');
        return;
      }
      runRefresh(refreshActiveMenu, 'active menu');
    };

    source.addEventListener('menu-changed', handleMenuChanged);
    source.onopen = () => {
      // The broker intentionally does not retain events, so opening (including
      // every reconnect) must close any delivery gap with a canonical read.
      reconcile();
      stopFallbackPolling();
    };
    // EventSource reconnects itself. Poll only while it is disconnected so the
    // workflow still converges behind a proxy that cannot stream SSE.
    source.onerror = startFallbackPolling;

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') reconcile();
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('focus', reconcile);

    return () => {
      source.close();
      stopFallbackPolling();
      source.removeEventListener('menu-changed', handleMenuChanged);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('focus', reconcile);
    };
  }, [isAuthenticated, refreshActiveMenu, refreshPresets]);

  const createMenu = useCallback(async (groups: MenuGroup[]): Promise<Menu> => {
    const savedMenu = await menusApi.create(groups, 'Menu');
    const newMenu: Menu = {
      id: savedMenu.id,
      groups: savedMenu.groups,
    };
    editorInitializedRef.current = true;
    editorPresetVersionRef.current = null;
    setCurrentMenu(newMenu);
    setCurrentPresetSlot(null);
    await refreshActiveMenu();
    return newMenu;
  }, [refreshActiveMenu]);

  const activateMenu = useCallback(async (menuId: string) => {
    await menusApi.setActive(menuId);
    await refreshActiveMenu();
  }, [refreshActiveMenu]);

  const clearMenu = useCallback(async () => {
    await menusApi.setActive(null);
    setCurrentMenu(null);
    setCurrentPresetSlot(null);
    editorPresetVersionRef.current = null;
    await refreshActiveMenu();
  }, [refreshActiveMenu]);

  const addSelection = useCallback(async (
    kidId: string,
    groupSelections: GroupSelections,
    menuId: string,
    roundRevision: number
  ) => {
    await menusApi.addSelection(kidId, groupSelections, menuId, roundRevision);
    await refreshActiveMenu();
  }, [refreshActiveMenu]);

  const getSelectionForKid = useCallback((kidId: string): KidSelection | undefined => {
    return selections.find((s) => s.kidId === kidId);
  }, [selections]);

  const clearSelections = useCallback(async () => {
    await menusApi.clearSelections();
    await refreshActiveMenu();
  }, [refreshActiveMenu]);

  const hasKidSelected = useCallback((kidId: string): boolean => {
    return selections.some((s) => s.kidId === kidId);
  }, [selections]);

  const approveSelections = useCallback(async () => {
    await menusApi.setSelectionStatus('approved');
    await refreshActiveMenu();
  }, [refreshActiveMenu]);

  const unlockSelections = useCallback(async () => {
    await menusApi.setSelectionStatus('open');
    await refreshActiveMenu();
  }, [refreshActiveMenu]);

  const unlockAndClearSelections = useCallback(async () => {
    await menusApi.clearSelections();
    await refreshActiveMenu();
  }, [refreshActiveMenu]);

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
    // When the preset fetch failed we cannot tell an empty slot from one we
    // simply failed to read. Handing back DEFAULT_GROUPS would let the parent
    // "fill in" a slot that already has a menu, and saving it issues an
    // unconditional UPDATE that destroys the real one.
    if (presetsError) return;
    editorInitializedRef.current = true;

    const preset = presets[slot];
    if (preset) {
      editorPresetVersionRef.current = preset.updatedAt;
      setCurrentMenu({
        id: preset.id,
        groups: JSON.parse(JSON.stringify(preset.groups)), // Deep clone to avoid mutations
      });
      setCurrentPresetSlot(slot);
    } else {
      // Empty preset - start with default groups
      editorPresetVersionRef.current = null;
      setCurrentMenu({
        id: `new-${slot}`,
        groups: JSON.parse(JSON.stringify(DEFAULT_GROUPS)),
      });
      setCurrentPresetSlot(slot);
    }
  }, [presets, presetsError]);

  const saveCurrentAsPreset = useCallback(async (slot: PresetSlot, name: string, groups: MenuGroup[]) => {
    // Never write from an editor whose preset snapshot could not be loaded.
    if (presetsError) {
      throw new Error('Refusing to overwrite a preset that could not be loaded');
    }

    const expectedUpdatedAt = editorPresetVersionRef.current;
    const savedMenu = await menusApi.updatePreset(slot, name, groups, expectedUpdatedAt);
    invalidatePresetsRefresh();
    setPresets((prev) => ({
      ...prev,
      [slot]: savedMenu,
    }));
    setCurrentMenu({
      id: savedMenu.id,
      groups: savedMenu.groups,
    });
    setCurrentPresetSlot(slot);
    editorPresetVersionRef.current = savedMenu.updatedAt;
    if (savedMenu.affectsActiveMenu) await refreshActiveMenu();
  }, [invalidatePresetsRefresh, presetsError, refreshActiveMenu]);

  const clearPreset = useCallback(async (slot: PresetSlot) => {
    const clearedMenuId = presets[slot]?.id;
    const clearedActiveMenu = Boolean(clearedMenuId && activeMenu?.id === clearedMenuId);
    await menusApi.deletePreset(slot);
    invalidatePresetsRefresh();
    setPresets((prev) => ({
      ...prev,
      [slot]: null,
    }));
    if (currentPresetSlot === slot) {
      setCurrentMenu(null);
      setCurrentPresetSlot(null);
      editorPresetVersionRef.current = null;
    }
    if (clearedActiveMenu) {
      await refreshActiveMenu();
    }
  }, [activeMenu, currentPresetSlot, invalidatePresetsRefresh, presets, refreshActiveMenu]);

  const copyPreset = useCallback(async (fromSlot: PresetSlot, toSlot: PresetSlot) => {
    const copiedMenu = await menusApi.copyPreset(fromSlot, toSlot);
    invalidatePresetsRefresh();
    setPresets((prev) => ({
      ...prev,
      [toSlot]: copiedMenu,
    }));
    if (copiedMenu.affectsActiveMenu) await refreshActiveMenu();
  }, [invalidatePresetsRefresh, refreshActiveMenu]);

  const renamePreset = useCallback(async (slot: PresetSlot, name: string) => {
    const preset = presets[slot];
    if (!preset) return;
    const editorWasCurrent = currentPresetSlot === slot
      && editorPresetVersionRef.current === preset.updatedAt;
    const savedMenu = await menusApi.updatePreset(slot, name, preset.groups, preset.updatedAt);
    invalidatePresetsRefresh();
    setPresets((prev) => ({
      ...prev,
      [slot]: savedMenu,
    }));
    if (editorWasCurrent) {
      editorPresetVersionRef.current = savedMenu.updatedAt;
    }
  }, [currentPresetSlot, invalidatePresetsRefresh, presets]);

  const loadPresetAsActive = useCallback(async (slot: PresetSlot) => {
    const preset = presets[slot];
    if (!preset) return;

    await menusApi.setActive(preset.id);
    editorInitializedRef.current = true;
    if (currentPresetSlot !== slot) {
      setCurrentMenu({ id: preset.id, groups: preset.groups });
      editorPresetVersionRef.current = preset.updatedAt;
    }
    setCurrentPresetSlot(slot);
    const launchedMenu = await refreshActiveMenu();
    if (launchedMenu) {
      setCurrentMenu({ id: launchedMenu.id, groups: launchedMenu.groups });
      editorPresetVersionRef.current = launchedMenu.updatedAt;
    }
  }, [currentPresetSlot, presets, refreshActiveMenu]);

  const startScratchMenu = useCallback(() => {
    editorInitializedRef.current = true;
    editorPresetVersionRef.current = null;
    setCurrentMenu({
      id: 'scratch',
      groups: JSON.parse(JSON.stringify(DEFAULT_GROUPS)),
    });
    setCurrentPresetSlot(null);
  }, []);

  return (
    <MenuContext.Provider
      value={{
        activeMenu,
        currentMenu,
        selections,
        selectionStatus,
        selectionRevision,
        selectionsLocked,
        loading,
        presets,
        presetsError,
        reloadPresets,
        refreshActiveMenu,
        currentPresetSlot,
        presetsLoading,
        createMenu,
        activateMenu,
        clearMenu,
        addSelection,
        getSelectionForKid,
        clearSelections,
        hasKidSelected,
        approveSelections,
        unlockSelections,
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
