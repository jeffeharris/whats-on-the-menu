import { Router } from 'express';
import { randomBytes } from 'crypto';
import { readJsonFile, writeJsonFile, generateId } from '../storage.js';

type SelectionPreset = 'pick-1' | 'pick-1-2' | 'pick-2' | 'pick-2-3';

const SELECTION_PRESET_CONFIG: Record<SelectionPreset, { min: number; max: number }> = {
  'pick-1': { min: 1, max: 1 },
  'pick-1-2': { min: 1, max: 2 },
  'pick-2': { min: 2, max: 2 },
  'pick-2-3': { min: 2, max: 3 },
};

interface SharedMenuOption {
  id: string;
  text: string;
  imageUrl: string | null;
  order: number;
}

interface SharedMenuGroup {
  id: string;
  label: string;
  options: SharedMenuOption[];
  selectionPreset: SelectionPreset;
  order: number;
}

interface SharedMenu {
  id: string;
  token: string;
  title: string;
  description?: string;
  groups: SharedMenuGroup[];
  createdAt: number;
  isActive: boolean;
}

interface SharedMenuResponse {
  id: string;
  menuId: string;
  respondentName: string;
  selections: {
    [groupId: string]: string[];
  };
  timestamp: number;
}

interface SharedMenusData {
  menus: SharedMenu[];
  responses: SharedMenuResponse[];
}

const router = Router();
const FILENAME = 'shared-menus.json';
const DEFAULT_DATA: SharedMenusData = { menus: [], responses: [] };

// Generate unique token with collision detection
function generateUniqueToken(existingTokens: Set<string>): string {
  let attempts = 0;
  while (attempts < 100) {
    const token = randomBytes(6).toString('base64url').substring(0, 8);
    if (!existingTokens.has(token)) {
      return token;
    }
    attempts++;
  }
  throw new Error('Failed to generate unique token');
}

// POST /api/shared-menus - Create shared menu
router.post('/', (req, res) => {
  const { title, description, groups } = req.body;

  if (!title || !groups || !Array.isArray(groups)) {
    return res.status(400).json({ error: 'title and groups are required' });
  }

  const data = readJsonFile<SharedMenusData>(FILENAME, DEFAULT_DATA);
  const existingTokens = new Set(data.menus.map((m) => m.token));

  const newMenu: SharedMenu = {
    id: `sm_${generateId()}`,
    token: generateUniqueToken(existingTokens),
    title,
    description,
    groups,
    createdAt: Date.now(),
    isActive: true,
  };

  data.menus.push(newMenu);
  writeJsonFile(FILENAME, data);
  res.status(201).json(newMenu);
});

// GET /api/shared-menus - List all shared menus
router.get('/', (_req, res) => {
  const data = readJsonFile<SharedMenusData>(FILENAME, DEFAULT_DATA);
  res.json({ menus: data.menus });
});

// GET /api/shared-menus/view/:token - Public view by token
router.get('/view/:token', (req, res) => {
  const { token } = req.params;
  const data = readJsonFile<SharedMenusData>(FILENAME, DEFAULT_DATA);
  const menu = data.menus.find((m) => m.token === token && m.isActive);

  if (!menu) {
    return res.status(404).json({ error: 'Menu not found' });
  }

  res.json({ menu });
});

// POST /api/shared-menus/respond/:token - Submit response (public)
router.post('/respond/:token', (req, res) => {
  const { token } = req.params;
  const { respondentName, selections } = req.body;

  if (!respondentName || typeof respondentName !== 'string' || !respondentName.trim()) {
    return res.status(400).json({ error: 'respondentName is required' });
  }

  if (!selections || typeof selections !== 'object') {
    return res.status(400).json({ error: 'selections are required' });
  }

  const data = readJsonFile<SharedMenusData>(FILENAME, DEFAULT_DATA);
  const menu = data.menus.find((m) => m.token === token && m.isActive);

  if (!menu) {
    return res.status(404).json({ error: 'Menu not found' });
  }

  // Validate selections against menu structure
  for (const group of menu.groups) {
    const selected = selections[group.id];

    if (!selected || !Array.isArray(selected)) {
      return res.status(400).json({ error: `Missing selections for group: ${group.label}` });
    }

    // Validate option IDs exist in menu
    const validOptionIds = new Set(group.options.map((o) => o.id));
    const invalidIds = selected.filter((id: string) => !validOptionIds.has(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ error: `Invalid option IDs in group: ${group.label}` });
    }

    // Validate selection count meets preset requirements
    const preset = SELECTION_PRESET_CONFIG[group.selectionPreset];
    if (selected.length < preset.min || selected.length > preset.max) {
      return res.status(400).json({
        error: `Group "${group.label}" requires ${preset.min}-${preset.max} selections`,
      });
    }
  }

  const response: SharedMenuResponse = {
    id: `sr_${generateId()}`,
    menuId: menu.id,
    respondentName: respondentName.trim(),
    selections,
    timestamp: Date.now(),
  };

  data.responses.push(response);
  writeJsonFile(FILENAME, data);
  res.status(201).json(response);
});

// GET /api/shared-menus/:id - Get specific shared menu by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const data = readJsonFile<SharedMenusData>(FILENAME, DEFAULT_DATA);
  const menu = data.menus.find((m) => m.id === id);

  if (!menu) {
    return res.status(404).json({ error: 'Menu not found' });
  }

  res.json({ menu });
});

// GET /api/shared-menus/:id/responses - Get responses for a menu
router.get('/:id/responses', (req, res) => {
  const { id } = req.params;
  const data = readJsonFile<SharedMenusData>(FILENAME, DEFAULT_DATA);
  const responses = data.responses.filter((r) => r.menuId === id);
  res.json({ responses });
});

// PUT /api/shared-menus/:id - Update shared menu
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, groups, isActive } = req.body;

  const data = readJsonFile<SharedMenusData>(FILENAME, DEFAULT_DATA);
  const index = data.menus.findIndex((m) => m.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Menu not found' });
  }

  // Only allow specific fields to be updated (not id, token, createdAt)
  const allowedUpdates: Partial<SharedMenu> = {};
  if (title !== undefined) allowedUpdates.title = title;
  if (description !== undefined) allowedUpdates.description = description;
  if (groups !== undefined) allowedUpdates.groups = groups;
  if (isActive !== undefined) allowedUpdates.isActive = isActive;

  data.menus[index] = { ...data.menus[index], ...allowedUpdates };
  writeJsonFile(FILENAME, data);
  res.json(data.menus[index]);
});

// DELETE /api/shared-menus/:id - Delete shared menu
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const data = readJsonFile<SharedMenusData>(FILENAME, DEFAULT_DATA);

  const index = data.menus.findIndex((m) => m.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Menu not found' });
  }

  data.menus.splice(index, 1);
  // Also delete associated responses
  data.responses = data.responses.filter((r) => r.menuId !== id);

  writeJsonFile(FILENAME, data);
  res.status(204).send();
});

export default router;
