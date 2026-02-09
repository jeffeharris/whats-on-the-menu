import { Router } from 'express';
import { getAllProfiles, createProfile, updateProfile, deleteProfile } from '../db/queries/profiles.js';
import { createProfileSchema, updateProfileSchema } from '../validation/schemas.js';

const router = Router();

// GET /api/profiles - Get all profiles
router.get('/', async (req, res) => {
  try {
    const data = await getAllProfiles(req.householdId!);
    res.json(data);
  } catch (err) {
    console.error('Failed to fetch profiles:', err);
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
});

// POST /api/profiles - Create a new profile
router.post('/', async (req, res) => {
  const result = createProfileSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message });
  }
  const { name, avatarColor, avatarAnimal } = result.data;

  try {
    const profile = await createProfile(req.householdId!, name, avatarColor, avatarAnimal);
    res.status(201).json(profile);
  } catch (err) {
    console.error('Failed to create profile:', err);
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

// PUT /api/profiles/:id - Update a profile
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const parseResult = updateProfileSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.issues[0].message });
  }
  const updates = parseResult.data;

  try {
    const profile = await updateProfile(req.householdId!, id, updates);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(profile);
  } catch (err) {
    console.error('Failed to update profile:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// DELETE /api/profiles/:id - Delete a profile
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await deleteProfile(req.householdId!, id);
    if (!deleted) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.status(204).send();
  } catch (err) {
    console.error('Failed to delete profile:', err);
    res.status(500).json({ error: 'Failed to delete profile' });
  }
});

export default router;
