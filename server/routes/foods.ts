import { Router } from 'express';
import { deleteHouseholdUpload } from './uploads.js';
import { getAllFoods, createFood, updateFood, deleteFood } from '../db/queries/foods.js';
import { createFoodSchema, updateFoodSchema } from '../validation/schemas.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// Helper to extract filename from uploaded image URL
function getUploadedFilename(imageUrl: string | null): string | null {
  if (!imageUrl || !imageUrl.startsWith('/uploads/')) {
    return null;
  }
  const filename = imageUrl.replace('/uploads/', '');
  // Prevent path traversal attacks
  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    return null;
  }
  return filename;
}

const router = Router();

// GET /api/foods - Get all food items
router.get('/', asyncHandler(async (req, res) => {
  const data = await getAllFoods(req.householdId!);
  res.json(data);
}, 'Failed to fetch foods'));

// POST /api/foods - Create a new food item
router.post('/', asyncHandler(async (req, res) => {
  const result = createFoodSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message });
  }
  const { name, tags, imageUrl } = result.data;

  const newItem = await createFood(
    req.householdId!,
    name,
    tags || [],
    imageUrl || null
  );
  res.status(201).json(newItem);
}, 'Failed to create food'));

// PUT /api/foods/:id - Update a food item
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const parseResult = updateFoodSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.issues[0].message });
  }
  const updates = parseResult.data;

  // If imageUrl is being changed, we need the current item for cleanup
  if ('imageUrl' in updates) {
    const current = await getAllFoods(req.householdId!);
    const existingItem = current.items.find((item) => item.id === id);
    if (existingItem) {
      const oldFilename = getUploadedFilename(existingItem.imageUrl);
      const newFilename = getUploadedFilename(updates.imageUrl ?? null);
      if (oldFilename && oldFilename !== newFilename) {
        await deleteHouseholdUpload(req.householdId!, oldFilename);
      }
    }
  }

  const updated = await updateFood(req.householdId!, id, updates);
  if (!updated) {
    return res.status(404).json({ error: 'Food item not found' });
  }
  res.json(updated);
}, 'Failed to update food'));

// DELETE /api/foods/:id - Delete a food item
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const deleted = await deleteFood(req.householdId!, id);
  if (!deleted) {
    return res.status(404).json({ error: 'Food item not found' });
  }

  // Clean up uploaded image if exists
  const uploadedFilename = getUploadedFilename(deleted.imageUrl);
  if (uploadedFilename) {
    await deleteHouseholdUpload(req.householdId!, uploadedFilename);
  }

  res.status(204).send();
}, 'Failed to delete food'));

export default router;
