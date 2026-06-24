import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import gadgetRoutes from './routes/gadgets.js';
import articleRoutes from './routes/articles.js';
import adminRoutes from './routes/admin.js';
import uploadRoutes from './routes/upload.js';
import feedRoutes from './routes/feed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, name: 'BoysGadget API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/gadgets', gadgetRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/feed', feedRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route tidak ditemukan' });
});

app.listen(port, () => {
  console.log(`BoysGadget API running on http://localhost:${port}`);
});
