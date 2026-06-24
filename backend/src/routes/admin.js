import { Router } from 'express';
import db from '../db.js';
import { authRequired, adminOnly } from '../middleware/auth.js';
import { parseSpecs, slugify } from '../utils.js';

const router = Router();

router.use(authRequired, adminOnly);

router.get('/summary', async (req, res) => {
  try {
    const [[gadgets]] = await db.query('SELECT COUNT(*) AS total FROM gadgets');
    const [[articles]] = await db.query('SELECT COUNT(*) AS total FROM articles');
    const [[views]] = await db.query('SELECT COALESCE(SUM(view_count),0) AS total FROM gadgets');
    res.json({ gadgets: gadgets.total, articles: articles.total, views: views.total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/gadgets', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM gadgets ORDER BY updated_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/gadgets', async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { name, brand, category, price, release_year, image_url, source_url, summary } = req.body;
    if (!name || !brand || !category) {
      return res.status(400).json({ error: 'Nama, brand, dan kategori wajib diisi' });
    }

    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO gadgets
       (name,brand,category,price,release_year,image_url,source_url,summary)
       VALUES (?,?,?,?,?,?,?,?)`,
      [name, brand, category, price || null, release_year || null, image_url || null, source_url || null, summary || null]
    );

    const specs = parseSpecs(req.body.specs);
    for (const spec of specs) {
      await conn.query(
        'INSERT INTO gadget_specs (gadget_id,spec_key,spec_value,sort_order) VALUES (?,?,?,?)',
        [result.insertId, spec.key, spec.value, spec.sort]
      );
    }

    await conn.commit();
    res.status(201).json({ id: result.insertId, message: 'Gadget berhasil ditambahkan' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

router.put('/gadgets/:id', async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { name, brand, category, price, release_year, image_url, source_url, summary } = req.body;
    if (!name || !brand || !category) {
      return res.status(400).json({ error: 'Nama, brand, dan kategori wajib diisi' });
    }

    await conn.beginTransaction();
    await conn.query(
      `UPDATE gadgets SET
       name=?, brand=?, category=?, price=?, release_year=?, image_url=?, source_url=?, summary=?
       WHERE id=?`,
      [name, brand, category, price || null, release_year || null, image_url || null, source_url || null, summary || null, req.params.id]
    );
    await conn.query('DELETE FROM gadget_specs WHERE gadget_id=?', [req.params.id]);
    for (const spec of parseSpecs(req.body.specs)) {
      await conn.query(
        'INSERT INTO gadget_specs (gadget_id,spec_key,spec_value,sort_order) VALUES (?,?,?,?)',
        [req.params.id, spec.key, spec.value, spec.sort]
      );
    }
    await conn.commit();
    res.json({ message: 'Gadget berhasil diperbarui' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

router.delete('/gadgets/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM gadgets WHERE id=?', [req.params.id]);
    res.json({ message: 'Gadget berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/articles', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM articles ORDER BY published_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/articles', async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { title, category = 'news', excerpt, content, cover_url, source_url, gadget_ids = [] } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Judul dan isi berita wajib diisi' });
    }

    const slug = `${slugify(title)}-${Date.now().toString(36)}`;
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO articles (title,slug,category,excerpt,content,cover_url,source_url)
       VALUES (?,?,?,?,?,?,?)`,
      [title, slug, category, excerpt || null, content, cover_url || null, source_url || null]
    );

    for (const gadgetId of gadget_ids) {
      await conn.query(
        'INSERT IGNORE INTO article_gadgets (article_id,gadget_id) VALUES (?,?)',
        [result.insertId, gadgetId]
      );
    }

    await conn.commit();
    res.status(201).json({ id: result.insertId, slug, message: 'Berita berhasil ditambahkan' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

router.put('/articles/:id', async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { title, category = 'news', excerpt, content, cover_url, source_url, gadget_ids = [] } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Judul dan isi berita wajib diisi' });
    }

    await conn.beginTransaction();
    await conn.query(
      `UPDATE articles SET title=?,category=?,excerpt=?,content=?,cover_url=?,source_url=? WHERE id=?`,
      [title, category, excerpt || null, content, cover_url || null, source_url || null, req.params.id]
    );
    await conn.query('DELETE FROM article_gadgets WHERE article_id=?', [req.params.id]);
    for (const gadgetId of gadget_ids) {
      await conn.query(
        'INSERT IGNORE INTO article_gadgets (article_id,gadget_id) VALUES (?,?)',
        [req.params.id, gadgetId]
      );
    }

    await conn.commit();
    res.json({ message: 'Berita berhasil diperbarui' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

router.delete('/articles/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM articles WHERE id=?', [req.params.id]);
    res.json({ message: 'Berita berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
