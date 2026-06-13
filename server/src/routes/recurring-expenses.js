import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getOne, getAll } from '../models/database.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

const VALID_CATEGORIES = ['rent', 'utilities', 'salaries', 'equipment', 'marketing', 'maintenance', 'supplies', 'insurance', 'taxes', 'other'];

// GET / — list all recurring expense templates
router.get('/', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const rows = await getAll(
      `SELECT r.*, u.name as staff_name
       FROM recurring_expenses r
       LEFT JOIN users u ON u.id = r.staff_id
       WHERE r.gym_id = ? AND r.is_active = TRUE
       ORDER BY r.category ASC, r.description ASC`,
      [gymId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /recurring-expenses error:', err);
    res.status(500).json({ error: 'Failed to fetch recurring expenses' });
  }
});

// POST / — create recurring expense template
router.post('/', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { category, description, amount, payment_method = 'cash', staff_id, day_of_month = 1, notes } = req.body;

    if (!category || !description || !amount) {
      return res.status(400).json({ error: 'category, description, and amount are required' });
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const id = uuidv4();
    await runQuery(
      `INSERT INTO recurring_expenses (id, gym_id, category, description, amount, payment_method, staff_id, day_of_month, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, gymId, category, description, amount, payment_method, staff_id || null, day_of_month, notes || null]
    );

    res.status(201).json(await getOne('SELECT * FROM recurring_expenses WHERE id = ?', [id]));
  } catch (err) {
    console.error('POST /recurring-expenses error:', err);
    res.status(500).json({ error: 'Failed to create recurring expense' });
  }
});

// PUT /:id — update recurring expense template
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { id } = req.params;

    const existing = await getOne('SELECT * FROM recurring_expenses WHERE id = ? AND gym_id = ?', [id, gymId]);
    if (!existing) return res.status(404).json({ error: 'Recurring expense not found' });

    const { category, description, amount, payment_method, staff_id, day_of_month, notes } = req.body;

    if (category && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    await runQuery(
      `UPDATE recurring_expenses SET
         category = ?, description = ?, amount = ?, payment_method = ?,
         staff_id = ?, day_of_month = ?, notes = ?, updated_at = NOW()
       WHERE id = ? AND gym_id = ?`,
      [
        category ?? existing.category,
        description ?? existing.description,
        amount ?? existing.amount,
        payment_method ?? existing.payment_method,
        staff_id !== undefined ? (staff_id || null) : existing.staff_id,
        day_of_month ?? existing.day_of_month,
        notes !== undefined ? (notes || null) : existing.notes,
        id, gymId,
      ]
    );

    res.json(await getOne('SELECT * FROM recurring_expenses WHERE id = ?', [id]));
  } catch (err) {
    console.error('PUT /recurring-expenses/:id error:', err);
    res.status(500).json({ error: 'Failed to update recurring expense' });
  }
});

// DELETE /:id — deactivate recurring expense template
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { id } = req.params;

    const existing = await getOne('SELECT * FROM recurring_expenses WHERE id = ? AND gym_id = ?', [id, gymId]);
    if (!existing) return res.status(404).json({ error: 'Recurring expense not found' });

    await runQuery('UPDATE recurring_expenses SET is_active = FALSE WHERE id = ? AND gym_id = ?', [id, gymId]);
    res.json({ message: 'Recurring expense removed' });
  } catch (err) {
    console.error('DELETE /recurring-expenses/:id error:', err);
    res.status(500).json({ error: 'Failed to delete recurring expense' });
  }
});

// POST /generate — generate this month's expenses from active recurring templates (idempotent)
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { month } = req.body; // YYYY-MM, defaults to current month
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    // Check if already generated for this month
    const already = await getOne(
      'SELECT * FROM recurring_expense_generations WHERE gym_id = ? AND month = ?',
      [gymId, targetMonth]
    );
    if (already) {
      return res.json({
        message: `Already generated for ${targetMonth}`,
        already_generated: true,
        expense_count: already.expense_count,
      });
    }

    // Get all active recurring templates
    const templates = await getAll(
      'SELECT * FROM recurring_expenses WHERE gym_id = ? AND is_active = TRUE',
      [gymId]
    );

    if (templates.length === 0) {
      return res.json({ message: 'No recurring expenses configured', expense_count: 0 });
    }

    // Insert one expense per template, dated to day_of_month in target month
    const [year, mon] = targetMonth.split('-').map(Number);
    let count = 0;

    for (const t of templates) {
      const day = Math.min(t.day_of_month || 1, new Date(year, mon, 0).getDate()); // clamp to last day of month
      const expenseDate = `${targetMonth}-${String(day).padStart(2, '0')}`;
      const id = uuidv4();

      await runQuery(
        `INSERT INTO expenses (id, gym_id, category, description, amount, expense_date, payment_method, recurring_expense_id, is_auto_generated, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)`,
        [id, gymId, t.category, t.description, t.amount, expenseDate, t.payment_method, t.id, req.user.id]
      );
      count++;
    }

    // Record that we've generated for this month
    await runQuery(
      `INSERT INTO recurring_expense_generations (gym_id, month, expense_count)
       VALUES (?, ?, ?)
       ON CONFLICT (gym_id, month) DO UPDATE SET expense_count = EXCLUDED.expense_count`,
      [gymId, targetMonth, count]
    );

    res.json({ message: `Generated ${count} recurring expense${count !== 1 ? 's' : ''} for ${targetMonth}`, expense_count: count });
  } catch (err) {
    console.error('POST /recurring-expenses/generate error:', err);
    res.status(500).json({ error: 'Failed to generate recurring expenses' });
  }
});

// GET /status/:month — check if a month has been generated
router.get('/status/:month', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { month } = req.params;
    const gen = await getOne('SELECT * FROM recurring_expense_generations WHERE gym_id = ? AND month = ?', [gymId, month]);
    const count = await getOne('SELECT COUNT(*) as count FROM recurring_expenses WHERE gym_id = ? AND is_active = TRUE', [gymId]);
    res.json({
      generated: !!gen,
      generated_at: gen?.generated_at || null,
      expense_count: gen?.expense_count || 0,
      template_count: parseInt(count?.count || 0),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check generation status' });
  }
});

export default router;
