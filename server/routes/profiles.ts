import { Router } from 'express';
import { getAllProfiles, createProfile, updateProfile, deleteProfile } from '../db/queries/profiles.js';
import { createProfileSchema, updateProfileSchema } from '../validation/schemas.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/profiles - Get all profiles
router.get('/', asyncHandler(async (req, res) => {
  const data = await getAllProfiles(req.householdId!);
  res.json(data);
}, 'Failed to fetch profiles'));

// POST /api/profiles - Create a new profile
router.post('/', asyncHandler(async (req, res) => {
  const result = createProfileSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message });
  }
  const { name, avatarColor, avatarAnimal } = result.data;

  const profile = await createProfile(req.householdId!, name, avatarColor, avatarAnimal);
  res.status(201).json(profile);
}, 'Failed to create profile'));

// PUT /api/profiles/:id - Update a profile
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const parseResult = updateProfileSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.issues[0].message });
  }
  const updates = parseResult.data;

  const profile = await updateProfile(req.householdId!, id, updates);
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  res.json(profile);
}, 'Failed to update profile'));

// DELETE /api/profiles/:id - Delete a profile
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const deleted = await deleteProfile(req.householdId!, id);
  if (!deleted) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  res.status(204).send();
}, 'Failed to delete profile'));

export default router;
