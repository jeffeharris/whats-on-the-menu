import { Router } from 'express';
import { getAllProfiles, createProfile, updateProfile, deleteProfile } from '../db/queries/profiles.js';

const router = Router();

// TODO: Phase 3 — get from auth middleware
const DEFAULT_HOUSEHOLD_ID = '00000000-0000-0000-0000-000000000000';

// GET /api/profiles - Get all profiles
router.get('/', async (_req, res) => {
  try {
    const data = await getAllProfiles(DEFAULT_HOUSEHOLD_ID);
    res.json(data);
  } catch (err) {
    console.error('Failed to fetch profiles:', err);
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
});

// POST /api/profiles - Create a new profile
router.post('/', async (req, res) => {
  const { name, avatarColor, avatarAnimal } = req.body;
  if (!name || !avatarColor) {
    return res.status(400).json({ error: 'Name and avatarColor are required' });
  }

  try {
    const profile = await createProfile(DEFAULT_HOUSEHOLD_ID, name, avatarColor, avatarAnimal);
    res.status(201).json(profile);
  } catch (err) {
    console.error('Failed to create profile:', err);
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

// PUT /api/profiles/:id - Update a profile
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const profile = await updateProfile(DEFAULT_HOUSEHOLD_ID, id, updates);
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
    const deleted = await deleteProfile(DEFAULT_HOUSEHOLD_ID, id);
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
