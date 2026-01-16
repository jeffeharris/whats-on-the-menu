import { Router } from 'express';
import { readJsonFile, writeJsonFile, generateId } from '../storage.js';

type AvatarColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink';

interface KidProfile {
  id: string;
  name: string;
  avatarColor: AvatarColor;
}

interface ProfilesData {
  profiles: KidProfile[];
}

const router = Router();
const FILENAME = 'profiles.json';
const DEFAULT_DATA: ProfilesData = { profiles: [] };

// GET /api/profiles - Get all profiles
router.get('/', (_req, res) => {
  const data = readJsonFile<ProfilesData>(FILENAME, DEFAULT_DATA);
  res.json(data);
});

// POST /api/profiles - Create a new profile
router.post('/', (req, res) => {
  const { name, avatarColor } = req.body;
  if (!name || !avatarColor) {
    return res.status(400).json({ error: 'Name and avatarColor are required' });
  }

  const data = readJsonFile<ProfilesData>(FILENAME, DEFAULT_DATA);
  const newProfile: KidProfile = {
    id: generateId(),
    name,
    avatarColor,
  };
  data.profiles.push(newProfile);
  writeJsonFile(FILENAME, data);
  res.status(201).json(newProfile);
});

// PUT /api/profiles/:id - Update a profile
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const data = readJsonFile<ProfilesData>(FILENAME, DEFAULT_DATA);
  const index = data.profiles.findIndex((profile) => profile.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  data.profiles[index] = { ...data.profiles[index], ...updates, id };
  writeJsonFile(FILENAME, data);
  res.json(data.profiles[index]);
});

// DELETE /api/profiles/:id - Delete a profile
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  const data = readJsonFile<ProfilesData>(FILENAME, DEFAULT_DATA);
  const index = data.profiles.findIndex((profile) => profile.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  data.profiles.splice(index, 1);
  writeJsonFile(FILENAME, data);
  res.status(204).send();
});

export default router;
