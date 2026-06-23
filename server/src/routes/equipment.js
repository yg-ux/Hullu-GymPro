import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getOne, getAll } from '../models/database.js';
import { authenticateToken, requireActiveSubscription } from './auth.js';

const router = express.Router();

const VALID_STATUSES    = ['operational', 'maintenance', 'broken', 'retired'];
const VALID_CONDITIONS  = ['excellent', 'good', 'fair', 'poor'];
const VALID_CATEGORIES  = ['cardio', 'strength', 'free_weights', 'machines', 'functional', 'stretching', 'boxing', 'accessories', 'recovery', 'other'];

// GET / — list equipment with summary
router.get('/', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { status, category, branch_id } = req.query;

    const conditions = ['gym_id = ?'];
    const params = [gymId];

    if (status && VALID_STATUSES.includes(status)) { conditions.push('status = ?'); params.push(status); }
    if (category && VALID_CATEGORIES.includes(category)) { conditions.push('category = ?'); params.push(category); }
    if (branch_id) { conditions.push('branch_id = ?'); params.push(branch_id); }

    const where = conditions.join(' AND ');
    const data = await getAll(`SELECT * FROM equipment WHERE ${where} ORDER BY category ASC, name ASC`, params);

    // Summary always across whole gym
    const s = await getOne(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'operational' THEN 1 ELSE 0 END) as operational,
         SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance,
         SUM(CASE WHEN status = 'broken'      THEN 1 ELSE 0 END) as broken,
         SUM(CASE WHEN next_service_date <= NOW() + INTERVAL '30 days' AND status != 'retired' THEN 1 ELSE 0 END) as due_service
       FROM equipment WHERE gym_id = ?`,
      [gymId]
    );

    res.json({
      data,
      summary: {
        total: parseInt(s?.total || 0),
        operational: parseInt(s?.operational || 0),
        maintenance: parseInt(s?.maintenance || 0),
        broken: parseInt(s?.broken || 0),
        due_service: parseInt(s?.due_service || 0),
      },
    });
  } catch (err) {
    console.error('GET /equipment error:', err);
    res.status(500).json({ error: 'Failed to fetch equipment' });
  }
});

// POST / — create equipment
router.post('/', authenticateToken, requireActiveSubscription, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const {
      branch_id, name, category, purchase_date, purchase_price,
      warranty_expiry, last_service_date, next_service_date,
      status = 'operational', condition = 'good', notes, photo,
    } = req.body;

    if (!name) return res.status(400).json({ error: 'name is required' });
    if (status && !VALID_STATUSES.includes(status))   return res.status(400).json({ error: `Invalid status` });
    if (condition && !VALID_CONDITIONS.includes(condition)) return res.status(400).json({ error: `Invalid condition` });
    if (category && !VALID_CATEGORIES.includes(category)) return res.status(400).json({ error: `Invalid category` });

    const id = uuidv4();
    await runQuery(
      `INSERT INTO equipment (id, gym_id, branch_id, name, category, purchase_date, purchase_price,
         warranty_expiry, last_service_date, next_service_date, status, condition, notes, photo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, gymId, branch_id || null, name, category || null, purchase_date || null, purchase_price || null,
       warranty_expiry || null, last_service_date || null, next_service_date || null, status, condition, notes || null, photo || null]
    );

    res.status(201).json(await getOne('SELECT * FROM equipment WHERE id = ?', [id]));
  } catch (err) {
    console.error('POST /equipment error:', err);
    res.status(500).json({ error: 'Failed to create equipment' });
  }
});

// POST /:id/service — log a service event (before PUT /:id)
router.post('/:id/service', authenticateToken, requireActiveSubscription, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { id } = req.params;
    const { next_service_date, condition, status, notes } = req.body;

    if (!next_service_date) return res.status(400).json({ error: 'next_service_date is required' });

    const existing = await getOne('SELECT * FROM equipment WHERE id = ? AND gym_id = ?', [id, gymId]);
    if (!existing) return res.status(404).json({ error: 'Equipment not found' });
    if (condition && !VALID_CONDITIONS.includes(condition)) return res.status(400).json({ error: 'Invalid condition' });
    if (status && !VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    await runQuery(
      `UPDATE equipment SET
         last_service_date = CURRENT_DATE, next_service_date = ?,
         condition = ?, status = ?, notes = ?, updated_at = NOW()
       WHERE id = ? AND gym_id = ?`,
      [next_service_date, condition ?? existing.condition, status ?? existing.status, notes ?? existing.notes, id, gymId]
    );

    res.json({ message: 'Service logged', data: await getOne('SELECT * FROM equipment WHERE id = ?', [id]) });
  } catch (err) {
    console.error('POST /equipment/:id/service error:', err);
    res.status(500).json({ error: 'Failed to log service' });
  }
});

// PUT /:id — update equipment
router.put('/:id', authenticateToken, requireActiveSubscription, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { id } = req.params;

    const existing = await getOne('SELECT * FROM equipment WHERE id = ? AND gym_id = ?', [id, gymId]);
    if (!existing) return res.status(404).json({ error: 'Equipment not found' });

    const {
      branch_id, name, category, purchase_date, purchase_price,
      warranty_expiry, last_service_date, next_service_date, status, condition, notes, photo,
    } = req.body;

    if (status && !VALID_STATUSES.includes(status))   return res.status(400).json({ error: 'Invalid status' });
    if (condition && !VALID_CONDITIONS.includes(condition)) return res.status(400).json({ error: 'Invalid condition' });
    if (category && !VALID_CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category' });

    await runQuery(
      `UPDATE equipment SET
         branch_id = ?, name = ?, category = ?, purchase_date = ?, purchase_price = ?,
         warranty_expiry = ?, last_service_date = ?, next_service_date = ?,
         status = ?, condition = ?, notes = ?, photo = ?, updated_at = NOW()
       WHERE id = ? AND gym_id = ?`,
      [
        branch_id ?? existing.branch_id, name ?? existing.name, category ?? existing.category,
        purchase_date ?? existing.purchase_date, purchase_price ?? existing.purchase_price,
        warranty_expiry ?? existing.warranty_expiry, last_service_date ?? existing.last_service_date,
        next_service_date ?? existing.next_service_date, status ?? existing.status,
        condition ?? existing.condition, notes ?? existing.notes, photo ?? existing.photo,
        id, gymId,
      ]
    );

    res.json(await getOne('SELECT * FROM equipment WHERE id = ?', [id]));
  } catch (err) {
    console.error('PUT /equipment/:id error:', err);
    res.status(500).json({ error: 'Failed to update equipment' });
  }
});

// DELETE /:id
router.delete('/:id', authenticateToken, requireActiveSubscription, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { id } = req.params;
    const existing = await getOne('SELECT id FROM equipment WHERE id = ? AND gym_id = ?', [id, gymId]);
    if (!existing) return res.status(404).json({ error: 'Equipment not found' });
    await runQuery('DELETE FROM equipment WHERE id = ? AND gym_id = ?', [id, gymId]);
    res.json({ message: 'Equipment deleted' });
  } catch (err) {
    console.error('DELETE /equipment/:id error:', err);
    res.status(500).json({ error: 'Failed to delete equipment' });
  }
});

export default router;
