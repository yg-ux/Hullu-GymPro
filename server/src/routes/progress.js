import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getOne, getAll } from '../models/database.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

const VALID_ANGLES = ['front', 'back', 'left', 'right', 'other'];

// GET /:customerId — list all progress photos for a customer
router.get('/:customerId', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { customerId } = req.params;

    const customer = await getOne('SELECT id FROM customers WHERE id = ? AND gym_id = ?', [customerId, gymId]);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const photos = await getAll(
      `SELECT id, angle, notes, weight, body_fat, taken_at, created_at, created_by,
              LEFT(photo_data, 100) as photo_preview, LENGTH(photo_data) as photo_size
       FROM progress_photos WHERE customer_id = ? ORDER BY taken_at DESC`,
      [customerId]
    );

    res.json({ data: photos });
  } catch (err) {
    console.error('GET /progress/:customerId error:', err);
    res.status(500).json({ error: 'Failed to fetch progress photos' });
  }
});

// GET /:customerId/:photoId — get full photo data
router.get('/:customerId/:photoId', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { customerId, photoId } = req.params;

    const customer = await getOne('SELECT id FROM customers WHERE id = ? AND gym_id = ?', [customerId, gymId]);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const photo = await getOne('SELECT * FROM progress_photos WHERE id = ? AND customer_id = ?', [photoId, customerId]);
    if (!photo) return res.status(404).json({ error: 'Photo not found' });

    res.json(photo);
  } catch (err) {
    console.error('GET /progress/:customerId/:photoId error:', err);
    res.status(500).json({ error: 'Failed to fetch photo' });
  }
});

// POST /:customerId — add a progress photo
router.post('/:customerId', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { customerId } = req.params;
    const { photo_data, angle = 'front', notes, weight, body_fat, taken_at } = req.body;

    if (!photo_data) return res.status(400).json({ error: 'photo_data is required' });
    if (angle && !VALID_ANGLES.includes(angle)) return res.status(400).json({ error: 'Invalid angle' });

    const customer = await getOne('SELECT id FROM customers WHERE id = ? AND gym_id = ?', [customerId, gymId]);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const id = uuidv4();
    await runQuery(
      `INSERT INTO progress_photos (id, gym_id, customer_id, photo_data, angle, notes, weight, body_fat, taken_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, gymId, customerId, photo_data, angle, notes || null, weight || null, body_fat || null,
       taken_at || new Date().toISOString().split('T')[0], req.user.id]
    );

    const created = await getOne(
      `SELECT id, angle, notes, weight, body_fat, taken_at, created_at FROM progress_photos WHERE id = ?`, [id]
    );
    res.status(201).json(created);
  } catch (err) {
    console.error('POST /progress/:customerId error:', err);
    res.status(500).json({ error: 'Failed to add progress photo' });
  }
});

// DELETE /:customerId/:photoId — delete a photo
router.delete('/:customerId/:photoId', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { customerId, photoId } = req.params;

    const customer = await getOne('SELECT id FROM customers WHERE id = ? AND gym_id = ?', [customerId, gymId]);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const photo = await getOne('SELECT id FROM progress_photos WHERE id = ? AND customer_id = ? AND gym_id = ?', [photoId, customerId, gymId]);
    if (!photo) return res.status(404).json({ error: 'Photo not found' });

    await runQuery('DELETE FROM progress_photos WHERE id = ?', [photoId]);
    res.json({ message: 'Photo deleted' });
  } catch (err) {
    console.error('DELETE /progress/:customerId/:photoId error:', err);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

export default router;
