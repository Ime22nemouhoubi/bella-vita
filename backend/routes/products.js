// routes/products.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { authRequired } = require('../middleware/auth');
const { upload, UPLOADS_DIR } = require('../middleware/upload');

const router = express.Router();

// Helper to build image URL
function buildImageUrl(req, filename) {
  if (!filename) return null;
  if (filename.startsWith('http')) return filename;
  return `${req.protocol}://${req.get('host')}/uploads/${filename}`;
}

function serializeProduct(req, p) {
  return { ...p, image_url: buildImageUrl(req, p.image_url) };
}

// PUBLIC — list active products (with optional category filter and search)
router.get('/', (req, res) => {
  const { category, q, includeInactive } = req.query;
  let sql = `SELECT p.*, c.name_fr AS category_name_fr, c.name_ar AS category_name_ar, c.slug AS category_slug
             FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE 1=1`;
  const params = [];
  if (!includeInactive) {
    sql += ' AND p.is_active = 1';
  }
  if (category) {
    sql += ' AND c.slug = ?';
    params.push(category);
  }
  if (q) {
    sql += ' AND (p.name_fr LIKE ? OR p.name_ar LIKE ? OR p.description_fr LIKE ? OR p.description_ar LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  sql += ' ORDER BY p.created_at DESC';
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map((r) => serializeProduct(req, r)));
});

// PUBLIC — single product
router.get('/:id', (req, res) => {
  const row = db
    .prepare(
      `SELECT p.*, c.name_fr AS category_name_fr, c.name_ar AS category_name_ar, c.slug AS category_slug
       FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?`
    )
    .get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Product not found' });
  res.json(serializeProduct(req, row));
});

// ADMIN — create
router.post('/', authRequired, upload.single('image'), (req, res) => {
  const { name_fr, name_ar, description_fr, description_ar, price, stock, category_id, is_active } = req.body;
  if (!name_fr || !name_ar || price === undefined) {
    return res.status(400).json({ error: 'name_fr, name_ar and price are required' });
  }
  const imageFilename = req.file ? req.file.filename : null;
  const result = db
    .prepare(
      `INSERT INTO products (name_fr, name_ar, description_fr, description_ar, price, stock, image_url, category_id, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      name_fr,
      name_ar,
      description_fr || '',
      description_ar || '',
      Number(price),
      Number(stock || 0),
      imageFilename,
      category_id ? Number(category_id) : null,
      is_active === undefined ? 1 : Number(is_active)
    );
  res.status(201).json({ id: result.lastInsertRowid });
});

// ADMIN — update
router.put('/:id', authRequired, upload.single('image'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM products WHERE id=?').get(id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  const { name_fr, name_ar, description_fr, description_ar, price, stock, category_id, is_active } = req.body;
  let imageFilename = existing.image_url;

  if (req.file) {
    // delete previous image if present and local
    if (existing.image_url && !existing.image_url.startsWith('http')) {
      const old = path.join(UPLOADS_DIR, existing.image_url);
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }
    imageFilename = req.file.filename;
  }

  db.prepare(
    `UPDATE products SET name_fr=?, name_ar=?, description_fr=?, description_ar=?, price=?, stock=?, image_url=?, category_id=?, is_active=? WHERE id=?`
  ).run(
    name_fr ?? existing.name_fr,
    name_ar ?? existing.name_ar,
    description_fr ?? existing.description_fr,
    description_ar ?? existing.description_ar,
    price !== undefined ? Number(price) : existing.price,
    stock !== undefined ? Number(stock) : existing.stock,
    imageFilename,
    category_id !== undefined ? (category_id ? Number(category_id) : null) : existing.category_id,
    is_active !== undefined ? Number(is_active) : existing.is_active,
    id
  );
  res.json({ ok: true });
});

// ADMIN — delete
router.delete('/:id', authRequired, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM products WHERE id=?').get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (existing.image_url && !existing.image_url.startsWith('http')) {
    const old = path.join(UPLOADS_DIR, existing.image_url);
    if (fs.existsSync(old)) fs.unlinkSync(old);
  }
  db.prepare('DELETE FROM products WHERE id=?').run(id);
  res.json({ ok: true });
});

module.exports = router;
