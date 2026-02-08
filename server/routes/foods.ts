import { Router } from 'express';
import { deleteUploadedFile } from './uploads.js';
import { getAllFoods, createFood, updateFood, deleteFood } from '../db/queries/foods.js';

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
router.get('/', async (req, res) => {
  try {
    const data = await getAllFoods(req.householdId!);
    res.json(data);
  } catch (error) {
    console.error('Error fetching foods:', error);
    res.status(500).json({ error: 'Failed to fetch foods' });
  }
});

// POST /api/foods - Create a new food item
router.post('/', async (req, res) => {
  try {
    const { name, tags, imageUrl } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const newItem = await createFood(
      req.householdId!,
      name,
      tags || [],
      imageUrl || null
    );
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error creating food:', error);
    res.status(500).json({ error: 'Failed to create food' });
  }
});

// PUT /api/foods/:id - Update a food item
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // If imageUrl is being changed, we need the current item for cleanup
    if ('imageUrl' in updates) {
      const current = await getAllFoods(req.householdId!);
      const existingItem = current.items.find((item) => item.id === id);
      if (existingItem) {
        const oldFilename = getUploadedFilename(existingItem.imageUrl);
        const newFilename = getUploadedFilename(updates.imageUrl);
        if (oldFilename && oldFilename !== newFilename) {
          deleteUploadedFile(oldFilename);
        }
      }
    }

    const updated = await updateFood(req.householdId!, id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Food item not found' });
    }
    res.json(updated);
  } catch (error) {
    console.error('Error updating food:', error);
    res.status(500).json({ error: 'Failed to update food' });
  }
});

// DELETE /api/foods/:id - Delete a food item
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await deleteFood(req.householdId!, id);
    if (!deleted) {
      return res.status(404).json({ error: 'Food item not found' });
    }

    // Clean up uploaded image if exists
    const uploadedFilename = getUploadedFilename(deleted.imageUrl);
    if (uploadedFilename) {
      deleteUploadedFile(uploadedFilename);
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting food:', error);
    res.status(500).json({ error: 'Failed to delete food' });
  }
});

export default router;
