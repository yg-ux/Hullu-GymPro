import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getOne, getAll } from '../models/database.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

function parseFeatures(pkg) {
  if (!pkg) return pkg;
  try { pkg.features = pkg.features ? JSON.parse(pkg.features) : []; } catch { pkg.features = []; }
  return pkg;
}

// GET / — list all packages ordered by sort_order
router.get('/', authenticateToken, async (req, res) => {
  try {
    const rows = await getAll(
      'SELECT * FROM membership_packages WHERE gym_id = ? ORDER BY sort_order ASC, created_at ASC',
      [req.user.gym_id]
    );
    res.json({ data: rows.map(parseFeatures) });
  } catch (err) {
    console.error('GET /packages error:', err);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

// PUT /reorder — before /:id to avoid route conflict
router.put('/reorder', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const items = req.body;
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Expected array of { id, sort_order }' });

    for (const item of items) {
      if (!item.id || item.sort_order === undefined) continue;
      await runQuery('UPDATE membership_packages SET sort_order = ?, updated_at = NOW() WHERE id = ? AND gym_id = ?',
        [item.sort_order, item.id, gymId]);
    }

    const data = (await getAll('SELECT * FROM membership_packages WHERE gym_id = ? ORDER BY sort_order ASC', [gymId])).map(parseFeatures);
    res.json({ message: 'Sort order updated', data });
  } catch (err) {
    console.error('PUT /packages/reorder error:', err);
    res.status(500).json({ error: 'Failed to reorder packages' });
  }
});

// POST / — create package
router.post('/', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { name, membership_type, price, description, features = [], is_active = true, sort_order = 0 } = req.body;
    if (!name || !membership_type || price === undefined) return res.status(400).json({ error: 'name, membership_type, and price are required' });

    const id = uuidv4();
    await runQuery(
      `INSERT INTO membership_packages (id, gym_id, name, membership_type, price, description, features, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, gymId, name, membership_type, price, description || null, JSON.stringify(Array.isArray(features) ? features : []), is_active ? true : false, sort_order]
    );

    res.status(201).json(parseFeatures(await getOne('SELECT * FROM membership_packages WHERE id = ?', [id])));
  } catch (err) {
    console.error('POST /packages error:', err);
    res.status(500).json({ error: 'Failed to create package' });
  }
});

// PUT /:id — update package
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { id } = req.params;
    const existing = await getOne('SELECT * FROM membership_packages WHERE id = ? AND gym_id = ?', [id, gymId]);
    if (!existing) return res.status(404).json({ error: 'Package not found' });

    const { name, membership_type, price, description, features, is_active, sort_order } = req.body;
    const featuresJson = features !== undefined ? JSON.stringify(Array.isArray(features) ? features : []) : existing.features;

    await runQuery(
      `UPDATE membership_packages SET
         name = ?, membership_type = ?, price = ?, description = ?,
         features = ?, is_active = ?, sort_order = ?, updated_at = NOW()
       WHERE id = ? AND gym_id = ?`,
      [
        name ?? existing.name, membership_type ?? existing.membership_type,
        price ?? existing.price, description ?? existing.description,
        featuresJson, is_active !== undefined ? Boolean(is_active) : existing.is_active,
        sort_order ?? existing.sort_order, id, gymId,
      ]
    );

    res.json(parseFeatures(await getOne('SELECT * FROM membership_packages WHERE id = ?', [id])));
  } catch (err) {
    console.error('PUT /packages/:id error:', err);
    res.status(500).json({ error: 'Failed to update package' });
  }
});

// DELETE /:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { id } = req.params;
    const existing = await getOne('SELECT id FROM membership_packages WHERE id = ? AND gym_id = ?', [id, gymId]);
    if (!existing) return res.status(404).json({ error: 'Package not found' });
    await runQuery('DELETE FROM membership_packages WHERE id = ? AND gym_id = ?', [id, gymId]);
    res.json({ message: 'Package deleted' });
  } catch (err) {
    console.error('DELETE /packages/:id error:', err);
    res.status(500).json({ error: 'Failed to delete package' });
  }
});

export default router;
