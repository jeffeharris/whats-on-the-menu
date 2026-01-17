import { Router } from 'express';
import { readJsonFile, writeJsonFile, generateId } from '../storage.js';
import { deleteUploadedFile } from './uploads.js';

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

interface FoodItem {
  id: string;
  name: string;
  imageUrl: string | null;
  category: 'main' | 'side';
}

interface FoodsData {
  items: FoodItem[];
}

const router = Router();
const FILENAME = 'foods.json';
const DEFAULT_DATA: FoodsData = { items: [] };

// GET /api/foods - Get all food items
router.get('/', (_req, res) => {
  const data = readJsonFile<FoodsData>(FILENAME, DEFAULT_DATA);
  res.json(data);
});

// POST /api/foods - Create a new food item
router.post('/', (req, res) => {
  const { name, category, imageUrl } = req.body;
  if (!name || !category) {
    return res.status(400).json({ error: 'Name and category are required' });
  }

  const data = readJsonFile<FoodsData>(FILENAME, DEFAULT_DATA);
  const newItem: FoodItem = {
    id: generateId(),
    name,
    category,
    imageUrl: imageUrl || null,
  };
  data.items.push(newItem);
  writeJsonFile(FILENAME, data);
  res.status(201).json(newItem);
});

// PUT /api/foods/:id - Update a food item
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const data = readJsonFile<FoodsData>(FILENAME, DEFAULT_DATA);
  const index = data.items.findIndex((item) => item.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Food item not found' });
  }

  // If imageUrl is being changed, clean up old uploaded image
  if ('imageUrl' in updates) {
    const oldFilename = getUploadedFilename(data.items[index].imageUrl);
    const newFilename = getUploadedFilename(updates.imageUrl);
    // Only delete if old was uploaded and new is different
    if (oldFilename && oldFilename !== newFilename) {
      deleteUploadedFile(oldFilename);
    }
  }

  data.items[index] = { ...data.items[index], ...updates, id };
  writeJsonFile(FILENAME, data);
  res.json(data.items[index]);
});

// DELETE /api/foods/:id - Delete a food item
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  const data = readJsonFile<FoodsData>(FILENAME, DEFAULT_DATA);
  const index = data.items.findIndex((item) => item.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Food item not found' });
  }

  // Clean up uploaded image if exists
  const uploadedFilename = getUploadedFilename(data.items[index].imageUrl);
  if (uploadedFilename) {
    deleteUploadedFile(uploadedFilename);
  }

  data.items.splice(index, 1);
  writeJsonFile(FILENAME, data);
  res.status(204).send();
});

export default router;
