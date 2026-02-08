import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { requireAuth } from './middleware/auth.js';
import authRouter from './routes/auth.js';
import './types.js'; // Load Express type augmentation
import foodsRouter from './routes/foods.js';
import profilesRouter from './routes/profiles.js';
import menusRouter from './routes/menus.js';
import mealsRouter from './routes/meals.js';
import uploadsRouter from './routes/uploads.js';
import sharedMenusRouter, { publicSharedMenusRouter } from './routes/shared-menus.js';
import imageGenerationRouter from './routes/image-generation.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.SERVER_PORT || '3001', 10);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Static uploads (no auth — filenames are unguessable UUIDs)
app.use('/uploads', express.static(join(__dirname, '..', 'data', 'uploads')));

// Health check — unprotected
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Auth routes — unprotected (login, signup, verify handle their own auth)
app.use('/api/auth', authRouter);

// Public shared menu routes — unprotected (view/respond by token)
app.use('/api/shared-menus', publicSharedMenusRouter);

// === Auth wall: everything below requires a valid session ===
app.use('/api', requireAuth);

// Protected domain routes
app.use('/api/foods', foodsRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/menus', menusRouter);
app.use('/api/meals', mealsRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/shared-menus', sharedMenusRouter);
app.use('/api/image-generation', imageGenerationRouter);

// In production, serve the built React SPA
if (process.env.NODE_ENV === 'production') {
  const distPath = join(__dirname, '..', 'dist');
  app.use(express.static(distPath));

  // Catch-all: serve index.html for client-side routing (must be after API routes)
  app.get('*', (_req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

// Clean up expired sessions every 24 hours
import { deleteExpiredSessions } from './db/queries/auth.js';
setInterval(async () => {
  try {
    const count = await deleteExpiredSessions();
    if (count > 0) console.log(`Cleaned up ${count} expired sessions`);
  } catch (err) {
    console.error('Session cleanup error:', err);
  }
}, 24 * 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
