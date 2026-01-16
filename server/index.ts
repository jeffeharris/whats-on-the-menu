import express from 'express';
import cors from 'cors';
import foodsRouter from './routes/foods.js';
import profilesRouter from './routes/profiles.js';
import menusRouter from './routes/menus.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/foods', foodsRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/menus', menusRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
