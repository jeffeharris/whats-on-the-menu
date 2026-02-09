import { Router } from 'express';
import { getAllMeals, getMeal, createMeal, deleteMeal } from '../db/queries/meals.js';
import { createMealSchema } from '../validation/schemas.js';

const router = Router();

// GET /api/meals - Get all meal records
router.get('/', async (req, res) => {
  try {
    const data = await getAllMeals(req.householdId!);
    res.json(data);
  } catch (error) {
    console.error('Error fetching meals:', error);
    res.status(500).json({ error: 'Failed to fetch meals' });
  }
});

// GET /api/meals/:id - Get a single meal record
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const meal = await getMeal(req.householdId!, id);
    if (!meal) {
      return res.status(404).json({ error: 'Meal not found' });
    }
    res.json(meal);
  } catch (error) {
    console.error('Error fetching meal:', error);
    res.status(500).json({ error: 'Failed to fetch meal' });
  }
});

// POST /api/meals - Create a new meal record
router.post('/', async (req, res) => {
  try {
    const result = createMealSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0].message });
    }
    const { menuId, selections, reviews } = result.data;

    const newMeal = await createMeal(req.householdId!, menuId, selections, reviews);
    res.status(201).json(newMeal);
  } catch (error) {
    console.error('Error creating meal:', error);
    res.status(500).json({ error: 'Failed to create meal' });
  }
});

// DELETE /api/meals/:id - Delete a meal record
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteMeal(req.householdId!, id);
    if (!deleted) {
      return res.status(404).json({ error: 'Meal not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting meal:', error);
    res.status(500).json({ error: 'Failed to delete meal' });
  }
});

export default router;
