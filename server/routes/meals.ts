import { Router } from 'express';
import { readJsonFile, writeJsonFile, generateId } from '../storage.js';

interface KidSelection {
  kidId: string;
  mainId: string | null;
  sideIds: string[];
  timestamp: number;
}

type CompletionStatus = 'all' | 'some' | 'none' | null;

interface KidMealReview {
  kidId: string;
  mainCompletion: CompletionStatus;
  sideCompletions: { [sideId: string]: CompletionStatus };
}

interface MealRecord {
  id: string;
  menuId: string;
  date: number;
  selections: KidSelection[];
  reviews: KidMealReview[];
  completedAt: number;
}

interface MealsData {
  meals: MealRecord[];
}

const router = Router();
const FILENAME = 'meals.json';
const DEFAULT_DATA: MealsData = { meals: [] };

// GET /api/meals - Get all meal records
router.get('/', (_req, res) => {
  const data = readJsonFile<MealsData>(FILENAME, DEFAULT_DATA);
  res.json(data);
});

// GET /api/meals/:id - Get a single meal record
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const data = readJsonFile<MealsData>(FILENAME, DEFAULT_DATA);
  const meal = data.meals.find((m) => m.id === id);
  if (!meal) {
    return res.status(404).json({ error: 'Meal not found' });
  }
  res.json(meal);
});

// POST /api/meals - Create a new meal record
router.post('/', (req, res) => {
  const { menuId, selections, reviews } = req.body;
  if (!menuId || !selections || !reviews) {
    return res.status(400).json({ error: 'menuId, selections, and reviews are required' });
  }

  const data = readJsonFile<MealsData>(FILENAME, DEFAULT_DATA);
  const now = Date.now();
  const newMeal: MealRecord = {
    id: generateId(),
    menuId,
    date: now,
    selections,
    reviews,
    completedAt: now,
  };
  // Add to beginning of array (newest first)
  data.meals.unshift(newMeal);
  writeJsonFile(FILENAME, data);
  res.status(201).json(newMeal);
});

// DELETE /api/meals/:id - Delete a meal record
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  const data = readJsonFile<MealsData>(FILENAME, DEFAULT_DATA);
  const index = data.meals.findIndex((meal) => meal.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Meal not found' });
  }

  data.meals.splice(index, 1);
  writeJsonFile(FILENAME, data);
  res.status(204).send();
});

export default router;
