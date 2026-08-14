import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';
import pool from './db/pool.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import authRouter from './routes/auth.js';
import './types.js'; // Load Express type augmentation
import foodsRouter from './routes/foods.js';
import profilesRouter from './routes/profiles.js';
import menusRouter from './routes/menus.js';
import mealsRouter from './routes/meals.js';
import uploadsRouter, { UPLOADS_DIR } from './routes/uploads.js';
import sharedMenusRouter, { publicSharedMenusRouter } from './routes/shared-menus.js';
import imageGenerationRouter from './routes/image-generation.js';
import householdRouter, { publicHouseholdRouter } from './routes/household.js';
import menuEventsRouter from './routes/menu-events.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Build the Express application with all middleware and routes wired up.
 * Kept side-effect-free (no listen, no timers) so tests can import it directly.
 */
export function createApp() {
  const app = express();

  app.use(cors({
    origin: process.env.NODE_ENV === 'production'
      ? 'https://whatsonthemenu.app'
      : ['http://localhost:5173', 'http://localhost:3001'],
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());
  // Skip HTTP request logging during tests to keep output readable.
  if (process.env.NODE_ENV !== 'test') {
    app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/api/health' } }));
  }

  // Rate limiting is disabled outside production (dev + test) so local work and
  // integration suites aren't throttled. Disabled limiters are a pass-through
  // middleware (not [] — Express rejects an empty middleware array).
  const isDev = process.env.NODE_ENV !== 'production';
  const passThrough: express.RequestHandler = (_req, _res, next) => next();

  const authLimiter = isDev ? passThrough : rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts, please try again later' },
  });

  const apiLimiter = isDev ? passThrough : rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' },
  });

  const publicSharedMenuLimiter = isDev ? passThrough : rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' },
  });

  // Static uploads (no auth — filenames are unguessable UUIDs). Served from the
  // same UPLOADS_DIR that writes use, so an env override stays consistent.
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Health check — unprotected
  app.get('/api/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'error', message: 'Database connection failed' });
    }
  });

  // Auth routes — unprotected (login, signup, verify handle their own auth)
  app.use('/api/auth', authLimiter, authRouter);

  // Public shared menu routes — unprotected (view/respond by token)
  app.use('/api/shared-menus', publicSharedMenuLimiter, publicSharedMenusRouter);

  // Public household routes — unprotected (invite info)
  app.use('/api/household', publicHouseholdRouter);

  // === Auth wall: everything below requires a valid session ===
  app.use('/api', apiLimiter);
  app.use('/api', requireAuth);

  // Protected domain routes
  app.use('/api/foods', foodsRouter);
  app.use('/api/profiles', profilesRouter);
  app.use('/api/menus', menusRouter);
  app.use('/api/menu-events', menuEventsRouter);
  app.use('/api/meals', mealsRouter);
  app.use('/api/uploads', uploadsRouter);
  app.use('/api/shared-menus', sharedMenusRouter);
  app.use('/api/image-generation', imageGenerationRouter);
  app.use('/api/household', householdRouter);

  // Catch-all for unknown API routes
  app.all('/api/*', notFoundHandler);

  // In production, serve the built React SPA
  if (process.env.NODE_ENV === 'production') {
    const distPath = join(__dirname, '..', 'dist');
    app.use(express.static(distPath));

    // Catch-all: serve index.html for client-side routing (must be after API routes)
    app.get('*', (_req, res) => {
      res.sendFile(join(distPath, 'index.html'));
    });
  }

  app.use(errorHandler);

  return app;
}
