import express from 'express';
import cors from 'cors';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import foodsRouter from './routes/foods.js';
import profilesRouter from './routes/profiles.js';
import menusRouter from './routes/menus.js';
import mealsRouter from './routes/meals.js';
import uploadsRouter from './routes/uploads.js';
import sharedMenusRouter from './routes/shared-menus.js';
import imageGenerationRouter from './routes/image-generation.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve uploaded images statically
app.use('/uploads', express.static(join(__dirname, '..', 'data', 'uploads')));

app.use('/api/foods', foodsRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/menus', menusRouter);
app.use('/api/meals', mealsRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/shared-menus', sharedMenusRouter);
app.use('/api/image-generation', imageGenerationRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
