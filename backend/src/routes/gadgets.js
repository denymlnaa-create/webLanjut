import { Router } from 'express';
import db from '../db.js';

const router = Router();

const gadgetFields = `
  g.id,g.name,g.brand,g.category,g.price,g.release_year,g.image_url,g.source_url,
  g.summary,g.view_count,g.created_at,g.updated_at
`;

router.get('/', async (req, res) => {
  try {
    const q = `%${req.query.q || ''}%`;
    const category = req.query.category || '';
    const params = [q, q, q];
    let where = 'WHERE (g.name LIKE ? OR g.brand LIKE ? OR g.category LIKE ?)';
    if (category) {
      where += ' AND g.category=?';
      params.push(category);
    }

    const [rows] = await db.query(
      `SELECT ${gadgetFields},
        COUNT(DISTINCT s.id) AS spec_count,
        COUNT(DISTINCT ag.article_id) AS news_count
       FROM gadgets g
       LEFT JOIN gadget_specs s ON s.gadget_id = g.id
       LEFT JOIN article_gadgets ag ON ag.gadget_id = g.id
       ${where}
       GROUP BY g.id
       ORDER BY g.updated_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/trending', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 8, 20);
    const [rows] = await db.query(
      `SELECT ${gadgetFields},
        COUNT(DISTINCT s.id) AS spec_count,
        COUNT(DISTINCT ag.article_id) AS news_count,
        (
          g.view_count * 1.0 +
          COUNT(DISTINCT ag.article_id) * 25 +
          COUNT(DISTINCT s.id) * 3 +
          GREATEST(0, 30 - DATEDIFF(NOW(), g.updated_at)) * 2
        ) AS trending_score
       FROM gadgets g
       LEFT JOIN gadget_specs s ON s.gadget_id = g.id
       LEFT JOIN article_gadgets ag ON ag.gadget_id = g.id
       GROUP BY g.id
       ORDER BY trending_score DESC, g.view_count DESC
       LIMIT ?`,
      [limit]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    await db.query('UPDATE gadgets SET view_count = view_count + 1 WHERE id=?', [req.params.id]);
    const [[gadget]] = await db.query(
      `SELECT ${gadgetFields} FROM gadgets g WHERE g.id=?`,
      [req.params.id]
    );
    if (!gadget) return res.status(404).json({ error: 'Gadget tidak ditemukan' });

    const [specs] = await db.query(
      'SELECT id,spec_key,spec_value,sort_order FROM gadget_specs WHERE gadget_id=? ORDER BY sort_order,id',
      [req.params.id]
    );
    const [articles] = await db.query(
      `SELECT a.id,a.title,a.slug,a.category,a.excerpt,a.cover_url,a.published_at
       FROM articles a
       JOIN article_gadgets ag ON ag.article_id = a.id
       WHERE ag.gadget_id=?
       ORDER BY a.published_at DESC`,
      [req.params.id]
    );

    res.json({ ...gadget, specs, articles, view_count: gadget.view_count + 1 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
