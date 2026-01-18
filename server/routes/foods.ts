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
  tags: string[];
  // Legacy field for migration
  category?: 'main' | 'side';
}

interface FoodsData {
  items: FoodItem[];
}

const router = Router();
const FILENAME = 'foods.json';
const DEFAULT_DATA: FoodsData = { items: [] };

// Migration: Convert old category field to tags
function migrateFood(item: FoodItem): FoodItem {
  // If item already has tags array, no migration needed
  if (item.tags && Array.isArray(item.tags) && item.tags.length > 0) {
    // Remove legacy category field
    const { category, ...rest } = item;
    return rest as FoodItem;
  }

  // Migrate category to tags
  const tags: string[] = [];
  if (item.category === 'main') {
    tags.push('Main');
  } else if (item.category === 'side') {
    tags.push('Side');
  }

  // Remove legacy category field
  const { category, ...rest } = item;
  return { ...rest, tags } as FoodItem;
}

// Migrate all foods and save if changes were made
function migrateAndGetFoods(): FoodsData {
  const data = readJsonFile<FoodsData>(FILENAME, DEFAULT_DATA);
  let needsSave = false;

  const migratedItems = data.items.map((item) => {
    // Check if migration is needed
    if (!item.tags || !Array.isArray(item.tags) || item.tags.length === 0 || item.category) {
      needsSave = true;
      return migrateFood(item);
    }
    return item;
  });

  if (needsSave) {
    const newData = { items: migratedItems };
    writeJsonFile(FILENAME, newData);
    return newData;
  }

  return data;
}

// GET /api/foods - Get all food items
router.get('/', (_req, res) => {
  const data = migrateAndGetFoods();
  res.json(data);
});

// POST /api/foods - Create a new food item
router.post('/', (req, res) => {
  const { name, tags, imageUrl, category } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const data = migrateAndGetFoods();

  // Support both new tags and legacy category for backwards compatibility
  let foodTags: string[] = tags || [];
  if ((!tags || tags.length === 0) && category) {
    // Legacy support: convert category to tag
    foodTags = category === 'main' ? ['Main'] : ['Side'];
  }

  const newItem: FoodItem = {
    id: generateId(),
    name,
    tags: foodTags,
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

  const data = migrateAndGetFoods();
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

  // Handle legacy category updates by converting to tags
  if ('category' in updates && !('tags' in updates)) {
    updates.tags = updates.category === 'main' ? ['Main'] : ['Side'];
    delete updates.category;
  }

  data.items[index] = { ...data.items[index], ...updates, id };
  writeJsonFile(FILENAME, data);
  res.json(data.items[index]);
});

// DELETE /api/foods/:id - Delete a food item
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  const data = migrateAndGetFoods();
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
