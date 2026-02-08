import { Router } from 'express';
import {
  getAllMenus,
  createMenu,
  updateMenu,
  deleteMenu,
  getActiveMenu,
  setActiveMenu,
  addSelection,
  clearSelections,
  getPresets,
  updatePreset,
  deletePreset,
  copyPreset,
  isValidPresetSlot,
} from '../db/queries/menus.js';

// TODO: Phase 3 — get from auth middleware
const DEFAULT_HOUSEHOLD_ID = '00000000-0000-0000-0000-000000000000';

const router = Router();

// GET /api/menus - Get all menus
router.get('/', async (_req, res) => {
  try {
    const data = await getAllMenus(DEFAULT_HOUSEHOLD_ID);
    res.json(data);
  } catch (error) {
    console.error('Error fetching menus:', error);
    res.status(500).json({ error: 'Failed to fetch menus' });
  }
});

// POST /api/menus - Create a new menu
router.post('/', async (req, res) => {
  try {
    const { name, groups } = req.body;

    if (!groups || !Array.isArray(groups) || groups.length === 0) {
      return res.status(400).json({ error: 'At least one group is required' });
    }

    const menu = await createMenu(DEFAULT_HOUSEHOLD_ID, name || 'Menu', groups);
    res.status(201).json(menu);
  } catch (error) {
    console.error('Error creating menu:', error);
    res.status(500).json({ error: 'Failed to create menu' });
  }
});

// GET /api/menus/active - Get active menu with selections
router.get('/active', async (_req, res) => {
  try {
    const data = await getActiveMenu(DEFAULT_HOUSEHOLD_ID);
    res.json(data);
  } catch (error) {
    console.error('Error fetching active menu:', error);
    res.status(500).json({ error: 'Failed to fetch active menu' });
  }
});

// PUT /api/menus/active - Set active menu
router.put('/active', async (req, res) => {
  try {
    const { menuId } = req.body;

    if (menuId !== null) {
      // Verify the menu exists
      const { menus } = await getAllMenus(DEFAULT_HOUSEHOLD_ID);
      const menu = menus.find((m) => m.id === menuId);
      if (!menu) {
        return res.status(404).json({ error: 'Menu not found' });
      }
    }

    await setActiveMenu(DEFAULT_HOUSEHOLD_ID, menuId);
    res.json({ activeMenuId: menuId });
  } catch (error) {
    console.error('Error setting active menu:', error);
    res.status(500).json({ error: 'Failed to set active menu' });
  }
});

// POST /api/menus/selections - Add a kid selection
router.post('/selections', async (req, res) => {
  try {
    const { kidId, selections } = req.body;
    if (!kidId) {
      return res.status(400).json({ error: 'kidId is required' });
    }

    const selection = await addSelection(DEFAULT_HOUSEHOLD_ID, kidId, selections || {});
    res.status(201).json(selection);
  } catch (error) {
    console.error('Error adding selection:', error);
    res.status(500).json({ error: 'Failed to add selection' });
  }
});

// DELETE /api/menus/selections - Clear all selections
router.delete('/selections', async (_req, res) => {
  try {
    await clearSelections(DEFAULT_HOUSEHOLD_ID);
    res.status(204).send();
  } catch (error) {
    console.error('Error clearing selections:', error);
    res.status(500).json({ error: 'Failed to clear selections' });
  }
});

// GET /api/menus/presets - Get all 4 presets
router.get('/presets', async (_req, res) => {
  try {
    const data = await getPresets(DEFAULT_HOUSEHOLD_ID);
    res.json(data);
  } catch (error) {
    console.error('Error fetching presets:', error);
    res.status(500).json({ error: 'Failed to fetch presets' });
  }
});

// PUT /api/menus/presets/:slot - Create/update a preset slot
router.put('/presets/:slot', async (req, res) => {
  try {
    const { slot } = req.params;
    const { name, groups } = req.body;

    if (!isValidPresetSlot(slot)) {
      return res.status(400).json({ error: 'Invalid preset slot' });
    }

    if (!groups || !Array.isArray(groups)) {
      return res.status(400).json({ error: 'groups is required' });
    }

    const menu = await updatePreset(
      DEFAULT_HOUSEHOLD_ID,
      slot,
      name || slot.charAt(0).toUpperCase() + slot.slice(1),
      groups
    );
    res.json(menu);
  } catch (error) {
    console.error('Error updating preset:', error);
    res.status(500).json({ error: 'Failed to update preset' });
  }
});

// DELETE /api/menus/presets/:slot - Clear a preset slot
router.delete('/presets/:slot', async (req, res) => {
  try {
    const { slot } = req.params;

    if (!isValidPresetSlot(slot)) {
      return res.status(400).json({ error: 'Invalid preset slot' });
    }

    const deleted = await deletePreset(DEFAULT_HOUSEHOLD_ID, slot);
    if (!deleted) {
      return res.status(404).json({ error: 'Preset not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting preset:', error);
    res.status(500).json({ error: 'Failed to delete preset' });
  }
});

// POST /api/menus/presets/:fromSlot/copy/:toSlot - Copy preset between slots
router.post('/presets/:fromSlot/copy/:toSlot', async (req, res) => {
  try {
    const { fromSlot, toSlot } = req.params;

    if (!isValidPresetSlot(fromSlot)) {
      return res.status(400).json({ error: 'Invalid source preset slot' });
    }
    if (!isValidPresetSlot(toSlot)) {
      return res.status(400).json({ error: 'Invalid target preset slot' });
    }

    const menu = await copyPreset(DEFAULT_HOUSEHOLD_ID, fromSlot, toSlot);
    if (!menu) {
      return res.status(404).json({ error: 'Source preset not found' });
    }

    res.json(menu);
  } catch (error) {
    console.error('Error copying preset:', error);
    res.status(500).json({ error: 'Failed to copy preset' });
  }
});

// PUT /api/menus/:id - Update a menu
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, groups } = req.body;

    const updated = await updateMenu(DEFAULT_HOUSEHOLD_ID, id, { name, groups });
    if (!updated) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating menu:', error);
    res.status(500).json({ error: 'Failed to update menu' });
  }
});

// DELETE /api/menus/:id - Delete a menu
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await deleteMenu(DEFAULT_HOUSEHOLD_ID, id);
    if (!deleted) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting menu:', error);
    res.status(500).json({ error: 'Failed to delete menu' });
  }
});

export default router;
