import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getOne, getAll } from '../models/database.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// GET / — list all branches with customer counts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const data = await getAll(
      `SELECT b.*,
         COUNT(DISTINCT c.id) as customer_count,
         COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as active_count
       FROM branches b
       LEFT JOIN customers c ON c.branch_id = b.id
       WHERE b.gym_id = ?
       GROUP BY b.id, b.gym_id, b.name, b.address, b.phone, b.manager_name, b.is_main, b.is_active, b.created_at, b.updated_at
       ORDER BY b.is_main DESC, b.name ASC`,
      [gymId]
    );
    res.json({ data });
  } catch (err) {
    console.error('GET /branches error:', err);
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
});

// PUT /:id/set-main — set as main branch (before /:id to avoid param conflict)
router.put('/:id/set-main', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { id } = req.params;

    const branch = await getOne('SELECT * FROM branches WHERE id = ? AND gym_id = ?', [id, gymId]);
    if (!branch) return res.status(404).json({ error: 'Branch not found' });

    await runQuery('UPDATE branches SET is_main = FALSE WHERE gym_id = ?', [gymId]);
    await runQuery('UPDATE branches SET is_main = TRUE, updated_at = NOW() WHERE id = ? AND gym_id = ?', [id, gymId]);

    res.json({ message: 'Main branch updated', data: await getOne('SELECT * FROM branches WHERE id = ?', [id]) });
  } catch (err) {
    console.error('PUT /branches/:id/set-main error:', err);
    res.status(500).json({ error: 'Failed to set main branch' });
  }
});

// POST / — create branch
router.post('/', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { name, address, phone, manager_name, is_active = true } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const existingCount = await getOne('SELECT COUNT(*) as count FROM branches WHERE gym_id = ?', [gymId]);
    const isMain = !existingCount || parseInt(existingCount.count) === 0;

    const id = uuidv4();
    await runQuery(
      `INSERT INTO branches (id, gym_id, name, address, phone, manager_name, is_main, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, gymId, name, address || null, phone || null, manager_name || null, isMain, Boolean(is_active)]
    );

    res.status(201).json(await getOne('SELECT * FROM branches WHERE id = ?', [id]));
  } catch (err) {
    console.error('POST /branches error:', err);
    res.status(500).json({ error: 'Failed to create branch' });
  }
});

// PUT /:id — update branch
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { id } = req.params;
    const existing = await getOne('SELECT * FROM branches WHERE id = ? AND gym_id = ?', [id, gymId]);
    if (!existing) return res.status(404).json({ error: 'Branch not found' });

    const { name, address, phone, manager_name, is_active } = req.body;

    await runQuery(
      `UPDATE branches SET name = ?, address = ?, phone = ?, manager_name = ?, is_active = ?, updated_at = NOW()
       WHERE id = ? AND gym_id = ?`,
      [name ?? existing.name, address ?? existing.address, phone ?? existing.phone,
       manager_name ?? existing.manager_name, is_active !== undefined ? Boolean(is_active) : existing.is_active, id, gymId]
    );

    res.json(await getOne('SELECT * FROM branches WHERE id = ?', [id]));
  } catch (err) {
    console.error('PUT /branches/:id error:', err);
    res.status(500).json({ error: 'Failed to update branch' });
  }
});

// DELETE /:id — cannot delete main branch
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { id } = req.params;
    const branch = await getOne('SELECT * FROM branches WHERE id = ? AND gym_id = ?', [id, gymId]);
    if (!branch) return res.status(404).json({ error: 'Branch not found' });
    if (branch.is_main) return res.status(400).json({ error: 'Cannot delete the main branch' });

    await runQuery('UPDATE customers  SET branch_id = NULL WHERE branch_id = ? AND gym_id = ?', [id, gymId]);
    await runQuery('UPDATE payments   SET branch_id = NULL WHERE branch_id = ?', [id]);
    await runQuery('UPDATE attendance SET branch_id = NULL WHERE branch_id = ?', [id]);
    await runQuery('DELETE FROM branches WHERE id = ? AND gym_id = ?', [id, gymId]);
    res.json({ message: 'Branch deleted' });
  } catch (err) {
    console.error('DELETE /branches/:id error:', err);
    res.status(500).json({ error: 'Failed to delete branch' });
  }
});

export default router;
