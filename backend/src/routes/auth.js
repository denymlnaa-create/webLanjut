import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../db.js';
import { authRequired } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '../../uploads');

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `avatar-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Format tidak didukung.'));
  },
});

const router = Router();

function signUser(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET || 'dev_secret',
    { expiresIn: '7d' }
  );
}

function safeUser(user) {
  const { password, ...rest } = user;
  return rest;
}

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: 'Username, email, dan password wajib diisi' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password minimal 6 karakter' });

    const [exists] = await db.query('SELECT id FROM users WHERE username=? OR email=?', [username, email]);
    if (exists.length) return res.status(400).json({ error: 'Username atau email sudah digunakan' });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (username,email,password,role) VALUES (?,?,?,?)',
      [username.trim(), email.trim(), hash, 'user']
    );
    const [[user]] = await db.query(
      'SELECT id,username,email,avatar_url,role,created_at FROM users WHERE id=?',
      [result.insertId]
    );
    res.status(201).json({ token: signUser(user), user, message: 'Akun berhasil dibuat.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;
    if (!login || !password)
      return res.status(400).json({ error: 'Username/email dan password wajib diisi' });

    const [rows] = await db.query('SELECT * FROM users WHERE username=? OR email=?', [login, login]);
    if (!rows.length) return res.status(400).json({ error: 'Username/email atau password salah' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Username/email atau password salah' });

    res.json({ token: signUser(user), user: safeUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', authRequired, async (req, res) => {
  try {
    const [[user]] = await db.query(
      'SELECT id,username,email,avatar_url,role,created_at FROM users WHERE id=?',
      [req.user.id]
    );
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


router.put('/profile', authRequired, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username?.trim()) return res.status(400).json({ error: 'Username wajib diisi.' });
    if (username.length > 40) return res.status(400).json({ error: 'Username maksimal 40 karakter.' });
    if (!/^[a-zA-Z0-9_]+$/.test(username))
      return res.status(400).json({ error: 'Username hanya boleh huruf, angka, dan underscore.' });

    const [exists] = await db.query('SELECT id FROM users WHERE username=? AND id!=?', [username, req.user.id]);
    if (exists.length) return res.status(400).json({ error: 'Username sudah dipakai.' });

    await db.query('UPDATE users SET username=? WHERE id=?', [username.trim(), req.user.id]);
    const [[user]] = await db.query(
      'SELECT id,username,email,avatar_url,role,created_at FROM users WHERE id=?',
      [req.user.id]
    );
    res.json({ user, token: signUser(user), message: 'Profil berhasil diperbarui.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/avatar — upload avatar
router.post('/avatar', authRequired, (req, res) => {
  avatarUpload.single('avatar')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload gagal.' });
    if (!req.file) return res.status(400).json({ error: 'Tidak ada file.' });

    const avatarUrl = `/uploads/${req.file.filename}`;
    await db.query('UPDATE users SET avatar_url=? WHERE id=?', [avatarUrl, req.user.id]);
    const [[user]] = await db.query(
      'SELECT id,username,email,avatar_url,role,created_at FROM users WHERE id=?',
      [req.user.id]
    );
    res.json({ user, message: 'Avatar berhasil diperbarui.' });
  });
});

export default router;
