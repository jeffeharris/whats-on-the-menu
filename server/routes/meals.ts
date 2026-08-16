import { Router } from 'express';
import {
  getAllMeals,
  getMeal,
  createMeal,
  deleteMeal,
  MealOperationError,
} from '../db/queries/meals.js';
import { createMealSchema } from '../validation/schemas.js';
import { publishMenuEvent } from '../realtime/menuEvents.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// Preserve the 4xx mapping for domain errors (e.g. 409 when the menu is no
// longer active); anything else falls through to the endpoint's generic 500.
function rethrowMealError(error: unknown): never {
  if (error instanceof MealOperationError) {
    throw new AppError(error.message, error.statusCode);
  }
  throw error;
}

// GET /api/meals - Get all meal records
router.get('/', asyncHandler(async (req, res) => {
  const data = await getAllMeals(req.householdId!);
  res.json(data);
}, 'Failed to fetch meals'));

// GET /api/meals/:id - Get a single meal record
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const meal = await getMeal(req.householdId!, id);
  if (!meal) {
    return res.status(404).json({ error: 'Meal not found' });
  }
  res.json(meal);
}, 'Failed to fetch meal'));

// POST /api/meals - Create a new meal record
router.post('/', asyncHandler(async (req, res) => {
  const result = createMealSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message });
  }
  const { menuId, selections, reviews } = result.data;

  const newMeal = await createMeal(req.householdId!, menuId, selections, reviews)
    .catch(rethrowMealError);
  publishMenuEvent(req.householdId!, { reason: 'active-menu-changed' });
  res.status(201).json(newMeal);
}, 'Failed to create meal'));

// DELETE /api/meals/:id - Delete a meal record
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await deleteMeal(req.householdId!, id);
  if (!deleted) {
    return res.status(404).json({ error: 'Meal not found' });
  }
  res.status(204).send();
}, 'Failed to delete meal'));

export default router;
