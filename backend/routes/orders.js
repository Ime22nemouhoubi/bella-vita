// routes/orders.js
const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');
const { sendNewOrderEmail } = require('../mailer');

const router = express.Router();

const VALID_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

// PUBLIC — submit a new order
router.post('/', (req, res) => {
  const { customer_name, customer_phone, wilaya, commune, address, notes, items } = req.body || {};
  if (!customer_name || !customer_phone || !wilaya || !commune || !address) {
    return res.status(400).json({ error: 'Customer name, phone, wilaya, commune and address are required' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must contain at least one item' });
  }

  // Recompute total server-side from current product prices for safety
  const productStmt = db.prepare('SELECT id, name_fr, price, stock, is_active FROM products WHERE id = ?');
  const validated = [];
  let total = 0;
  for (const it of items) {
    const p = productStmt.get(Number(it.product_id));
    if (!p || !p.is_active) {
      return res.status(400).json({ error: `Product ${it.product_id} unavailable` });
    }
    const qty = Math.max(1, Number(it.quantity || 1));
    validated.push({ product_id: p.id, name: p.name_fr, price: p.price, quantity: qty });
    total += p.price * qty;
  }

  const insertOrder = db.prepare(
    `INSERT INTO orders (customer_name, customer_phone, wilaya, commune, address, notes, total) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const insertItem = db.prepare(
    `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity) VALUES (?, ?, ?, ?, ?)`
  );

  const tx = db.transaction(() => {
    const result = insertOrder.run(
      customer_name.trim(),
      customer_phone.trim(),
      wilaya.trim(),
      commune.trim(),
      address.trim(),
      (notes || '').trim(),
      total
    );
    const orderId = result.lastInsertRowid;
    for (const v of validated) {
      insertItem.run(orderId, v.product_id, v.name, v.price, v.quantity);
    }
    return orderId;
  });

  const orderId = tx();

  // Fire-and-forget notification email — never blocks the response
  sendNewOrderEmail({
    orderId,
    customer_name: customer_name.trim(),
    customer_phone: customer_phone.trim(),
    wilaya: wilaya.trim(),
    commune: commune.trim(),
    address: address.trim(),
    notes: (notes || '').trim(),
    total,
    items: validated.map((v) => ({
      product_name: v.name,
      quantity: v.quantity,
      unit_price: v.price,
    })),
    created_at: new Date().toISOString(),
  }).catch(() => {}); // safety net — mailer already catches its own errors

  res.status(201).json({ id: orderId, total });
});

// ADMIN — list orders with items
router.get('/', authRequired, (req, res) => {
  const { status } = req.query;
  let sql = 'SELECT * FROM orders';
  const params = [];
  if (status && VALID_STATUSES.includes(status)) {
    sql += ' WHERE status = ?';
    params.push(status);
  }
  sql += ' ORDER BY created_at DESC';
  const orders = db.prepare(sql).all(...params);
  const itemStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
  const enriched = orders.map((o) => ({ ...o, items: itemStmt.all(o.id) }));
  res.json(enriched);
});

// ADMIN — single order
router.get('/:id', authRequired, (req, res) => {
  const id = Number(req.params.id);
  const order = db.prepare('SELECT * FROM orders WHERE id=?').get(id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
  res.json(order);
});

// ADMIN — update status
router.patch('/:id/status', authRequired, (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` });
  }
  const r = db.prepare('UPDATE orders SET status=? WHERE id=?').run(status, id);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

// ADMIN — delete
router.delete('/:id', authRequired, (req, res) => {
  const id = Number(req.params.id);
  const r = db.prepare('DELETE FROM orders WHERE id=?').run(id);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

module.exports = router;
