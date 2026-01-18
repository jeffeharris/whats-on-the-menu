import { Router } from 'express';
import { readJsonFile, writeJsonFile, generateId } from '../storage.js';

type SelectionPreset = 'pick-1' | 'pick-1-2' | 'pick-2' | 'pick-2-3';

interface MenuGroup {
  id: string;
  label: string;
  foodIds: string[];
  selectionPreset: SelectionPreset;
  order: number;
}

interface SavedMenu {
  id: string;
  name: string;
  groups: MenuGroup[];
  createdAt: number;
  updatedAt: number;
  // Legacy fields for migration
  mains?: string[];
  sides?: string[];
}

interface GroupSelections {
  [groupId: string]: string[];
}

interface KidSelection {
  kidId: string;
  selections: GroupSelections;
  timestamp: number;
  // Legacy fields for migration
  mainId?: string | null;
  sideIds?: string[];
}

interface MenusData {
  menus: SavedMenu[];
  activeMenuId: string | null;
  selections: KidSelection[];
}

const router = Router();
const FILENAME = 'menus.json';
const DEFAULT_DATA: MenusData = { menus: [], activeMenuId: null, selections: [] };

// Migration: Convert old mains/sides to groups
function migrateMenu(menu: SavedMenu): SavedMenu {
  // If menu already has groups array, no migration needed
  if (menu.groups && Array.isArray(menu.groups) && menu.groups.length > 0) {
    // Remove legacy fields
    const { mains, sides, ...rest } = menu;
    return rest as SavedMenu;
  }

  // Migrate mains/sides to groups
  const groups: MenuGroup[] = [];

  if (menu.mains && menu.mains.length > 0) {
    groups.push({
      id: 'main-group',
      label: 'Main Dishes',
      foodIds: menu.mains,
      selectionPreset: 'pick-1',
      order: 0,
    });
  }

  if (menu.sides && menu.sides.length > 0) {
    groups.push({
      id: 'side-group',
      label: 'Side Dishes',
      foodIds: menu.sides,
      selectionPreset: 'pick-1-2',
      order: 1,
    });
  }

  // Remove legacy fields
  const { mains, sides, ...rest } = menu;
  return { ...rest, groups } as SavedMenu;
}

// Migration: Convert old mainId/sideIds to selections
function migrateSelection(selection: KidSelection): KidSelection {
  // If selection already has selections object, no migration needed
  if (selection.selections && typeof selection.selections === 'object' && Object.keys(selection.selections).length > 0) {
    // Remove legacy fields
    const { mainId, sideIds, ...rest } = selection;
    return rest as KidSelection;
  }

  // Migrate mainId/sideIds to selections
  const selections: GroupSelections = {};

  if (selection.mainId !== undefined) {
    selections['main-group'] = selection.mainId ? [selection.mainId] : [];
  }

  if (selection.sideIds !== undefined) {
    selections['side-group'] = selection.sideIds || [];
  }

  // Remove legacy fields
  const { mainId, sideIds, ...rest } = selection;
  return { ...rest, selections } as KidSelection;
}

// Migrate all data and save if changes were made
function migrateAndGetData(): MenusData {
  const data = readJsonFile<MenusData>(FILENAME, DEFAULT_DATA);
  let needsSave = false;

  // Migrate menus
  const migratedMenus = data.menus.map((menu) => {
    if (!menu.groups || !Array.isArray(menu.groups) || menu.groups.length === 0 || menu.mains || menu.sides) {
      needsSave = true;
      return migrateMenu(menu);
    }
    return menu;
  });

  // Migrate selections
  const migratedSelections = data.selections.map((selection) => {
    if (!selection.selections || typeof selection.selections !== 'object' || Object.keys(selection.selections).length === 0 || selection.mainId !== undefined || selection.sideIds !== undefined) {
      needsSave = true;
      return migrateSelection(selection);
    }
    return selection;
  });

  if (needsSave) {
    const newData = { ...data, menus: migratedMenus, selections: migratedSelections };
    writeJsonFile(FILENAME, newData);
    return newData;
  }

  return data;
}

// GET /api/menus - Get all menus
router.get('/', (_req, res) => {
  const data = migrateAndGetData();
  res.json({ menus: data.menus });
});

// POST /api/menus - Create a new menu
router.post('/', (req, res) => {
  const { name, groups, mains, sides } = req.body;

  const data = migrateAndGetData();
  const now = Date.now();

  // Support both new groups and legacy mains/sides
  let menuGroups: MenuGroup[] = groups || [];
  if ((!groups || groups.length === 0) && (mains || sides)) {
    // Legacy support: convert mains/sides to groups
    menuGroups = [];
    if (mains && mains.length > 0) {
      menuGroups.push({
        id: 'main-group',
        label: 'Main Dishes',
        foodIds: mains,
        selectionPreset: 'pick-1',
        order: 0,
      });
    }
    if (sides && sides.length > 0) {
      menuGroups.push({
        id: 'side-group',
        label: 'Side Dishes',
        foodIds: sides,
        selectionPreset: 'pick-1-2',
        order: 1,
      });
    }
  }

  if (menuGroups.length === 0) {
    return res.status(400).json({ error: 'At least one group is required' });
  }

  const newMenu: SavedMenu = {
    id: generateId(),
    name: name || 'Menu',
    groups: menuGroups,
    createdAt: now,
    updatedAt: now,
  };
  data.menus.push(newMenu);

  // Set as active menu and clear selections
  data.activeMenuId = newMenu.id;
  data.selections = [];

  writeJsonFile(FILENAME, data);
  res.status(201).json(newMenu);
});

// GET /api/menus/active - Get active menu with selections
// NOTE: This route must be defined BEFORE /:id routes to avoid "active" being treated as an ID
router.get('/active', (_req, res) => {
  const data = migrateAndGetData();

  if (!data.activeMenuId) {
    return res.json({ menu: null, selections: [] });
  }

  const activeMenu = data.menus.find((menu) => menu.id === data.activeMenuId);
  res.json({
    menu: activeMenu || null,
    selections: data.selections
  });
});

// PUT /api/menus/active - Set active menu
router.put('/active', (req, res) => {
  const { menuId } = req.body;

  const data = migrateAndGetData();

  if (menuId !== null) {
    const menu = data.menus.find((m) => m.id === menuId);
    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }
  }

  data.activeMenuId = menuId;
  data.selections = []; // Clear selections when changing active menu
  writeJsonFile(FILENAME, data);
  res.json({ activeMenuId: data.activeMenuId });
});

// POST /api/menus/selections - Add a kid selection
// NOTE: This route must be defined BEFORE /:id routes to avoid "selections" being treated as an ID
router.post('/selections', (req, res) => {
  const { kidId, selections, mainId, sideIds } = req.body;
  if (!kidId) {
    return res.status(400).json({ error: 'kidId is required' });
  }

  const data = migrateAndGetData();

  // Remove existing selection for this kid
  data.selections = data.selections.filter((s) => s.kidId !== kidId);

  // Support both new selections format and legacy mainId/sideIds
  let groupSelections: GroupSelections = selections || {};
  if ((!selections || Object.keys(selections).length === 0) && (mainId !== undefined || sideIds !== undefined)) {
    // Legacy support
    groupSelections = {
      'main-group': mainId ? [mainId] : [],
      'side-group': sideIds || [],
    };
  }

  // Add new selection
  const newSelection: KidSelection = {
    kidId,
    selections: groupSelections,
    timestamp: Date.now(),
  };
  data.selections.push(newSelection);

  writeJsonFile(FILENAME, data);
  res.status(201).json(newSelection);
});

// DELETE /api/menus/selections - Clear all selections
router.delete('/selections', (_req, res) => {
  const data = migrateAndGetData();
  data.selections = [];
  writeJsonFile(FILENAME, data);
  res.status(204).send();
});

// PUT /api/menus/:id - Update a menu
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const data = migrateAndGetData();
  const index = data.menus.findIndex((menu) => menu.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Menu not found' });
  }

  // Handle legacy mains/sides updates by converting to groups
  if (('mains' in updates || 'sides' in updates) && !('groups' in updates)) {
    const existingGroups = data.menus[index].groups || [];
    const newGroups: MenuGroup[] = [];

    if (updates.mains) {
      const existingMainGroup = existingGroups.find(g => g.id === 'main-group');
      newGroups.push({
        id: 'main-group',
        label: existingMainGroup?.label || 'Main Dishes',
        foodIds: updates.mains,
        selectionPreset: existingMainGroup?.selectionPreset || 'pick-1',
        order: 0,
      });
    } else {
      const existingMainGroup = existingGroups.find(g => g.id === 'main-group');
      if (existingMainGroup) {
        newGroups.push(existingMainGroup);
      }
    }

    if (updates.sides) {
      const existingSideGroup = existingGroups.find(g => g.id === 'side-group');
      newGroups.push({
        id: 'side-group',
        label: existingSideGroup?.label || 'Side Dishes',
        foodIds: updates.sides,
        selectionPreset: existingSideGroup?.selectionPreset || 'pick-1-2',
        order: 1,
      });
    } else {
      const existingSideGroup = existingGroups.find(g => g.id === 'side-group');
      if (existingSideGroup) {
        newGroups.push(existingSideGroup);
      }
    }

    updates.groups = newGroups;
    delete updates.mains;
    delete updates.sides;
  }

  data.menus[index] = {
    ...data.menus[index],
    ...updates,
    id,
    updatedAt: Date.now(),
  };
  writeJsonFile(FILENAME, data);
  res.json(data.menus[index]);
});

// DELETE /api/menus/:id - Delete a menu
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  const data = migrateAndGetData();
  const index = data.menus.findIndex((menu) => menu.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Menu not found' });
  }

  data.menus.splice(index, 1);

  // If deleted menu was active, clear active menu and selections
  if (data.activeMenuId === id) {
    data.activeMenuId = null;
    data.selections = [];
  }

  writeJsonFile(FILENAME, data);
  res.status(204).send();
});

export default router;
