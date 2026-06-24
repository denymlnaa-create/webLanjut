import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.id,a.title,a.slug,a.category,a.excerpt,a.cover_url,a.source_url,a.published_at,
        GROUP_CONCAT(g.name ORDER BY g.name SEPARATOR ', ') AS gadgets
       FROM articles a
       LEFT JOIN article_gadgets ag ON ag.article_id = a.id
       LEFT JOIN gadgets g ON g.id = ag.gadget_id
       GROUP BY a.id
       ORDER BY a.published_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const [[article]] = await db.query('SELECT * FROM articles WHERE slug=?', [req.params.slug]);
    if (!article) return res.status(404).json({ error: 'Berita tidak ditemukan' });
    const [gadgets] = await db.query(
      `SELECT g.id,g.name,g.brand,g.category
       FROM gadgets g
       JOIN article_gadgets ag ON ag.gadget_id = g.id
       WHERE ag.article_id=?`,
      [article.id]
    );
    res.json({ ...article, gadgets });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
