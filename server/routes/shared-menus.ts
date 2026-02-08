import { Router } from 'express';
import {
  createSharedMenu,
  getAllSharedMenus,
  getSharedMenuById,
  getSharedMenuByToken,
  updateSharedMenu,
  deleteSharedMenu,
  getResponses,
  submitResponse,
} from '../db/queries/shared-menus.js';

type SelectionPreset = 'pick-1' | 'pick-1-2' | 'pick-2' | 'pick-2-3';

const SELECTION_PRESET_CONFIG: Record<SelectionPreset, { min: number; max: number }> = {
  'pick-1': { min: 1, max: 1 },
  'pick-1-2': { min: 1, max: 2 },
  'pick-2': { min: 2, max: 2 },
  'pick-2-3': { min: 2, max: 3 },
};

// ============================================================
// Public routes (mounted before auth middleware in index.ts)
// ============================================================
export const publicSharedMenusRouter = Router();

// GET /api/shared-menus/view/:token - Public view by token
publicSharedMenusRouter.get('/view/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const menu = await getSharedMenuByToken(token);
    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }
    res.json({ menu });
  } catch (error) {
    console.error('Error fetching shared menu by token:', error);
    res.status(500).json({ error: 'Failed to fetch shared menu' });
  }
});

// POST /api/shared-menus/respond/:token - Submit response (public)
publicSharedMenusRouter.post('/respond/:token', async (req, res) => {
  const { token } = req.params;
  const { respondentName, selections } = req.body;

  if (!respondentName || typeof respondentName !== 'string' || !respondentName.trim()) {
    return res.status(400).json({ error: 'respondentName is required' });
  }

  if (!selections || typeof selections !== 'object') {
    return res.status(400).json({ error: 'selections are required' });
  }

  try {
    // Fetch menu and validate selections against its structure
    const menu = await getSharedMenuByToken(token);
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
      const preset = SELECTION_PRESET_CONFIG[group.selectionPreset as SelectionPreset];
      if (selected.length < preset.min || selected.length > preset.max) {
        return res.status(400).json({
          error: `Group "${group.label}" requires ${preset.min}-${preset.max} selections`,
        });
      }
    }

    const { response } = await submitResponse(token, respondentName.trim(), selections);
    res.status(201).json(response);
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    if (err.statusCode === 404) {
      return res.status(404).json({ error: 'Menu not found' });
    }
    console.error('Error submitting response:', error);
    res.status(500).json({ error: 'Failed to submit response' });
  }
});

// ============================================================
// Protected routes (mounted after auth middleware in index.ts)
// ============================================================
const router = Router();

// POST /api/shared-menus - Create shared menu
router.post('/', async (req, res) => {
  const { title, description, groups } = req.body;

  if (!title || !groups || !Array.isArray(groups)) {
    return res.status(400).json({ error: 'title and groups are required' });
  }

  try {
    const menu = await createSharedMenu(req.householdId!, title, description, groups);
    res.status(201).json(menu);
  } catch (error) {
    console.error('Error creating shared menu:', error);
    res.status(500).json({ error: 'Failed to create shared menu' });
  }
});

// GET /api/shared-menus - List all shared menus
router.get('/', async (req, res) => {
  try {
    const data = await getAllSharedMenus(req.householdId!);
    res.json(data);
  } catch (error) {
    console.error('Error fetching shared menus:', error);
    res.status(500).json({ error: 'Failed to fetch shared menus' });
  }
});

// GET /api/shared-menus/:id - Get specific shared menu by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const menu = await getSharedMenuById(req.householdId!, id);
    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }
    res.json({ menu });
  } catch (error) {
    console.error('Error fetching shared menu:', error);
    res.status(500).json({ error: 'Failed to fetch shared menu' });
  }
});

// GET /api/shared-menus/:id/responses - Get responses for a menu
router.get('/:id/responses', async (req, res) => {
  const { id } = req.params;

  try {
    const data = await getResponses(id);
    res.json(data);
  } catch (error) {
    console.error('Error fetching responses:', error);
    res.status(500).json({ error: 'Failed to fetch responses' });
  }
});

// PUT /api/shared-menus/:id - Update shared menu
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, groups, isActive } = req.body;

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (groups !== undefined) updates.groups = groups;
  if (isActive !== undefined) updates.isActive = isActive;

  try {
    const menu = await updateSharedMenu(req.householdId!, id, updates);
    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }
    res.json(menu);
  } catch (error) {
    console.error('Error updating shared menu:', error);
    res.status(500).json({ error: 'Failed to update shared menu' });
  }
});

// DELETE /api/shared-menus/:id - Delete shared menu
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await deleteSharedMenu(req.householdId!, id);
    if (!deleted) {
      return res.status(404).json({ error: 'Menu not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting shared menu:', error);
    res.status(500).json({ error: 'Failed to delete shared menu' });
  }
});

export default router;
