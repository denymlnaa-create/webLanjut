import { Router } from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../db.js';
import { authRequired } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `post-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Format tidak didukung. Gunakan JPEG, PNG, atau WebP.'));
  },
});

const router = Router();

async function resolveGadgetTags(content) {
  const matches = [...content.matchAll(/#([a-z0-9][a-z0-9-]*)/gi)];
  if (!matches.length) return [];
  const slugs = [...new Set(matches.map(m => m[1].toLowerCase()))];

  const [allGadgets] = await db.query('SELECT id, name, brand FROM gadgets');
  const matched = allGadgets.filter(g => {
    const normalized = g.name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return slugs.includes(normalized);
  });
  return matched;
}

function getPostsQuery(extraWhere = '', extraParams = []) {
  return {
    sql: `SELECT p.id, p.content, p.image_url, p.like_count, p.reply_count, p.created_at,
                 u.id AS user_id, u.username
          FROM posts p
          JOIN users u ON u.id = p.user_id
          ${extraWhere}
          ORDER BY p.created_at DESC`,
    params: extraParams,
  };
}

async function enrichPosts(posts, authHeader) {
  if (!posts.length) return [];
  const postIds = posts.map(p => p.id);

  const [tagRows] = await db.query(
    `SELECT pg.post_id, g.id, g.name, g.brand
     FROM post_gadgets pg JOIN gadgets g ON g.id = pg.gadget_id
     WHERE pg.post_id IN (${postIds.map(() => '?').join(',')})`,
    postIds
  );

  let likedSet = new Set();
  if (authHeader) {
    try {
      const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET || 'dev_secret');
      const [likes] = await db.query(
        `SELECT post_id FROM post_likes WHERE user_id=? AND post_id IN (${postIds.map(() => '?').join(',')})`,
        [decoded.id, ...postIds]
      );
      likedSet = new Set(likes.map(l => l.post_id));
    } catch {}
  }

  const tagMap = {};
  for (const row of tagRows) {
    if (!tagMap[row.post_id]) tagMap[row.post_id] = [];
    tagMap[row.post_id].push({ id: row.id, name: row.name, brand: row.brand });
  }

  return posts.map(p => ({
    ...p,
    gadgets: tagMap[p.id] || [],
    liked_by_me: likedSet.has(p.id),
  }));
}

router.get('/posts', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [posts] = await db.query(
      `SELECT p.id, p.content, p.image_url, p.like_count, p.reply_count, p.created_at,
              u.id AS user_id, u.username, u.avatar_url
       FROM posts p JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const enriched = await enrichPosts(posts, req.headers.authorization);
    res.json({ posts: enriched, page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/gadget/:gadgetId', async (req, res) => {
  try {
    const gadgetId = parseInt(req.params.gadgetId);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [posts] = await db.query(
      `SELECT p.id, p.content, p.image_url, p.like_count, p.reply_count, p.created_at,
              u.id AS user_id, u.username, u.avatar_url
       FROM posts p
       JOIN users u ON u.id = p.user_id
       JOIN post_gadgets pg ON pg.post_id = p.id
       WHERE pg.gadget_id = ?
       ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      [gadgetId, limit, offset]
    );

    const enriched = await enrichPosts(posts, req.headers.authorization);
    res.json({ posts: enriched, page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/posts', authRequired, (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload gagal.' });

    const conn = await db.getConnection();
    try {
      const content = req.body.content || '';
      if (!content.trim()) return res.status(400).json({ error: 'Konten post wajib diisi.' });
      if (content.length > 500) return res.status(400).json({ error: 'Konten post maksimal 500 karakter.' });

      const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

      await conn.beginTransaction();
      const [result] = await conn.query(
        'INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)',
        [req.user.id, content.trim(), imageUrl]
      );
      const postId = result.insertId;

      const gadgets = await resolveGadgetTags(content);
      for (const g of gadgets) {
        await conn.query('INSERT IGNORE INTO post_gadgets (post_id, gadget_id) VALUES (?, ?)', [postId, g.id]);
        await conn.query('UPDATE gadgets SET view_count = view_count + 2 WHERE id = ?', [g.id]);
      }

      await conn.commit();

      const [[post]] = await db.query(
        `SELECT p.id, p.content, p.image_url, p.like_count, p.reply_count, p.created_at,
                u.id AS user_id, u.username, u.avatar_url
         FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?`,
        [postId]
      );

      res.status(201).json({ ...post, gadgets, liked_by_me: false });
    } catch (e) {
      await conn.rollback();
      console.error(e);
      res.status(500).json({ error: 'Server error' });
    } finally {
      conn.release();
    }
  });
});

router.post('/posts/:id/like', authRequired, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const [[post]] = await db.query('SELECT id FROM posts WHERE id=?', [postId]);
    if (!post) return res.status(404).json({ error: 'Post tidak ditemukan.' });

    const [[existing]] = await db.query(
      'SELECT 1 FROM post_likes WHERE user_id=? AND post_id=?',
      [req.user.id, postId]
    );

    if (existing) {
      await db.query('DELETE FROM post_likes WHERE user_id=? AND post_id=?', [req.user.id, postId]);
      await db.query('UPDATE posts SET like_count = GREATEST(0, like_count - 1) WHERE id=?', [postId]);
      await db.query(
        'UPDATE gadgets g JOIN post_gadgets pg ON pg.gadget_id=g.id SET g.view_count = GREATEST(0, g.view_count - 1) WHERE pg.post_id=?',
        [postId]
      );
      return res.json({ status: 'unliked' });
    } else {
      await db.query('INSERT INTO post_likes (user_id, post_id) VALUES (?,?)', [req.user.id, postId]);
      await db.query('UPDATE posts SET like_count = like_count + 1 WHERE id=?', [postId]);
      await db.query(
        'UPDATE gadgets g JOIN post_gadgets pg ON pg.gadget_id=g.id SET g.view_count = g.view_count + 1 WHERE pg.post_id=?',
        [postId]
      );
      return res.json({ status: 'liked' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/posts/:id/replies', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const [[post]] = await db.query('SELECT id FROM posts WHERE id=?', [postId]);
    if (!post) return res.status(404).json({ error: 'Post tidak ditemukan.' });

    const [replies] = await db.query(
      `SELECT r.id, r.content, r.created_at, u.id AS user_id, u.username, u.avatar_url
       FROM post_replies r JOIN users u ON u.id = r.user_id
       WHERE r.post_id = ? ORDER BY r.created_at ASC`,
      [postId]
    );
    res.json(replies);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/posts/:id/replies', authRequired, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Konten reply wajib diisi.' });
    if (content.length > 300) return res.status(400).json({ error: 'Konten reply maksimal 300 karakter.' });

    const [[post]] = await db.query('SELECT id FROM posts WHERE id=?', [postId]);
    if (!post) return res.status(404).json({ error: 'Post tidak ditemukan.' });

    const [result] = await db.query(
      'INSERT INTO post_replies (post_id, user_id, content) VALUES (?,?,?)',
      [postId, req.user.id, content.trim()]
    );
    await db.query('UPDATE posts SET reply_count = reply_count + 1 WHERE id=?', [postId]);

    const [[reply]] = await db.query(
      `SELECT r.id, r.content, r.created_at, u.id AS user_id, u.username, u.avatar_url
       FROM post_replies r JOIN users u ON u.id=r.user_id WHERE r.id=?`,
      [result.insertId]
    );
    res.status(201).json(reply);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/posts/:id', authRequired, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const [[post]] = await db.query('SELECT id, user_id FROM posts WHERE id=?', [postId]);
    if (!post) return res.status(404).json({ error: 'Post tidak ditemukan.' });

    if (post.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Tidak diizinkan.' });
    }

    await db.query('DELETE FROM posts WHERE id=?', [postId]);
    res.json({ message: 'Post berhasil dihapus.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/user/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const [[user]] = await db.query(
      'SELECT id, username, avatar_url, role, created_at FROM users WHERE username=?',
      [username]
    );
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan.' });

    const [posts] = await db.query(
      `SELECT p.id, p.content, p.image_url, p.like_count, p.reply_count, p.created_at,
              GROUP_CONCAT(DISTINCT g.name ORDER BY g.name SEPARATOR ', ') AS gadget_names,
              GROUP_CONCAT(DISTINCT g.id ORDER BY g.name SEPARATOR ',') AS gadget_ids
       FROM posts p
       LEFT JOIN post_gadgets pg ON pg.post_id = p.id
       LEFT JOIN gadgets g ON g.id = pg.gadget_id
       WHERE p.user_id = ?
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT 50`,
      [user.id]
    );

    const [replies] = await db.query(
      `SELECT r.id, r.content, r.created_at, r.post_id,
              p.content AS post_content,
              u2.username AS post_author
       FROM post_replies r
       JOIN posts p ON p.id = r.post_id
       JOIN users u2 ON u2.id = p.user_id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC
       LIMIT 50`,
      [user.id]
    );

    res.json({ user, posts, replies });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/posts/:postId/replies/:replyId', authRequired, async (req, res) => {
  try {
    const replyId = parseInt(req.params.replyId);
    const postId = parseInt(req.params.postId);
    const [[reply]] = await db.query('SELECT id, user_id FROM post_replies WHERE id=? AND post_id=?', [replyId, postId]);
    if (!reply) return res.status(404).json({ error: 'Reply tidak ditemukan.' });

    if (reply.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Tidak diizinkan.' });
    }

    await db.query('DELETE FROM post_replies WHERE id=?', [replyId]);
    await db.query('UPDATE posts SET reply_count = GREATEST(0, reply_count - 1) WHERE id=?', [postId]);
    res.json({ message: 'Reply berhasil dihapus.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
