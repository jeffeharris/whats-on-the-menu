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
import {
  createSharedMenuSchema,
  updateSharedMenuSchema,
  submitResponseSchema,
} from '../validation/schemas.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

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
publicSharedMenusRouter.get('/view/:token', asyncHandler(async (req, res) => {
  const { token } = req.params;

  const menu = await getSharedMenuByToken(token);
  if (!menu) {
    return res.status(404).json({ error: 'Menu not found' });
  }
  res.json({ menu });
}, 'Failed to fetch shared menu'));

// POST /api/shared-menus/respond/:token - Submit response (public)
publicSharedMenusRouter.post('/respond/:token', asyncHandler(async (req, res) => {
  const { token } = req.params;

  const result = submitResponseSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message });
  }
  const { respondentName, selections } = result.data;

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

  // Preserve the 404 mapping for a menu deleted between the fetch above and
  // the insert (submitResponse throws an Error tagged with statusCode 404).
  const { response } = await submitResponse(token, respondentName.trim(), selections)
    .catch((error: unknown) => {
      if ((error as { statusCode?: number }).statusCode === 404) {
        throw new AppError('Menu not found', 404);
      }
      throw error;
    });
  res.status(201).json(response);
}, 'Failed to submit response'));

// ============================================================
// Protected routes (mounted after auth middleware in index.ts)
// ============================================================
const router = Router();

// POST /api/shared-menus - Create shared menu
router.post('/', asyncHandler(async (req, res) => {
  const result = createSharedMenuSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message });
  }
  const { title, description, groups } = result.data;

  const menu = await createSharedMenu(req.householdId!, title, description, groups);
  res.status(201).json(menu);
}, 'Failed to create shared menu'));

// GET /api/shared-menus - List all shared menus
router.get('/', asyncHandler(async (req, res) => {
  const data = await getAllSharedMenus(req.householdId!);
  res.json(data);
}, 'Failed to fetch shared menus'));

// GET /api/shared-menus/:id - Get specific shared menu by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const menu = await getSharedMenuById(req.householdId!, id);
  if (!menu) {
    return res.status(404).json({ error: 'Menu not found' });
  }
  res.json({ menu });
}, 'Failed to fetch shared menu'));

// GET /api/shared-menus/:id/responses - Get responses for a menu
router.get('/:id/responses', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const menu = await getSharedMenuById(req.householdId!, id);
  if (!menu) {
    return res.status(404).json({ error: 'Menu not found' });
  }
  const data = await getResponses(id);
  res.json(data);
}, 'Failed to fetch responses'));

// PUT /api/shared-menus/:id - Update shared menu
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const parseResult = updateSharedMenuSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.issues[0].message });
  }
  const { title, description, groups, isActive } = parseResult.data;

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (groups !== undefined) updates.groups = groups;
  if (isActive !== undefined) updates.isActive = isActive;

  const menu = await updateSharedMenu(req.householdId!, id, updates);
  if (!menu) {
    return res.status(404).json({ error: 'Menu not found' });
  }
  res.json(menu);
}, 'Failed to update shared menu'));

// DELETE /api/shared-menus/:id - Delete shared menu
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const deleted = await deleteSharedMenu(req.householdId!, id);
  if (!deleted) {
    return res.status(404).json({ error: 'Menu not found' });
  }
  res.status(204).send();
}, 'Failed to delete shared menu'));

export default router;
