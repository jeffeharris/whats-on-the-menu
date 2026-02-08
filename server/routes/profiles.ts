import { Router } from 'express';
import { getAllProfiles, createProfile, updateProfile, deleteProfile } from '../db/queries/profiles.js';

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
  const { name, avatarColor, avatarAnimal } = req.body;
  if (!name || !avatarColor) {
    return res.status(400).json({ error: 'Name and avatarColor are required' });
  }

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
  const updates = req.body;

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
