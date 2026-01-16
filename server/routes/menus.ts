import { Router } from 'express';
import { readJsonFile, writeJsonFile, generateId } from '../storage.js';

interface SavedMenu {
  id: string;
  name: string;
  mains: string[];
  sides: string[];
  createdAt: number;
  updatedAt: number;
}

interface KidSelection {
  kidId: string;
  mainId: string | null;
  sideIds: string[];
  timestamp: number;
}

interface MenusData {
  menus: SavedMenu[];
  activeMenuId: string | null;
  selections: KidSelection[];
}

const router = Router();
const FILENAME = 'menus.json';
const DEFAULT_DATA: MenusData = { menus: [], activeMenuId: null, selections: [] };

// GET /api/menus - Get all menus
router.get('/', (_req, res) => {
  const data = readJsonFile<MenusData>(FILENAME, DEFAULT_DATA);
  res.json({ menus: data.menus });
});

// POST /api/menus - Create a new menu
router.post('/', (req, res) => {
  const { name, mains, sides } = req.body;
  if (!mains || !sides) {
    return res.status(400).json({ error: 'Mains and sides are required' });
  }

  const data = readJsonFile<MenusData>(FILENAME, DEFAULT_DATA);
  const now = Date.now();
  const newMenu: SavedMenu = {
    id: generateId(),
    name: name || 'Menu',
    mains,
    sides,
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

// PUT /api/menus/:id - Update a menu
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const data = readJsonFile<MenusData>(FILENAME, DEFAULT_DATA);
  const index = data.menus.findIndex((menu) => menu.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Menu not found' });
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

  const data = readJsonFile<MenusData>(FILENAME, DEFAULT_DATA);
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

// GET /api/menus/active - Get active menu with selections
router.get('/active', (_req, res) => {
  const data = readJsonFile<MenusData>(FILENAME, DEFAULT_DATA);

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

  const data = readJsonFile<MenusData>(FILENAME, DEFAULT_DATA);

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
router.post('/selections', (req, res) => {
  const { kidId, mainId, sideIds } = req.body;
  if (!kidId) {
    return res.status(400).json({ error: 'kidId is required' });
  }

  const data = readJsonFile<MenusData>(FILENAME, DEFAULT_DATA);

  // Remove existing selection for this kid
  data.selections = data.selections.filter((s) => s.kidId !== kidId);

  // Add new selection
  const newSelection: KidSelection = {
    kidId,
    mainId: mainId || null,
    sideIds: sideIds || [],
    timestamp: Date.now(),
  };
  data.selections.push(newSelection);

  writeJsonFile(FILENAME, data);
  res.status(201).json(newSelection);
});

// DELETE /api/menus/selections - Clear all selections
router.delete('/selections', (_req, res) => {
  const data = readJsonFile<MenusData>(FILENAME, DEFAULT_DATA);
  data.selections = [];
  writeJsonFile(FILENAME, data);
  res.status(204).send();
});

export default router;
