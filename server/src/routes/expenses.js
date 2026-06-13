import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getOne, getAll } from '../models/database.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

const VALID_CATEGORIES = ['rent', 'utilities', 'salaries', 'equipment', 'marketing', 'maintenance', 'supplies', 'insurance', 'taxes', 'other'];

// GET /summary — monthly totals for last 12 months (before / to avoid route conflict)
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const rows = await getAll(
      `SELECT
         TO_CHAR(expense_date, 'YYYY-MM') as month,
         category,
         SUM(amount) as total
       FROM expenses
       WHERE gym_id = ?
         AND expense_date >= NOW() - INTERVAL '12 months'
       GROUP BY TO_CHAR(expense_date, 'YYYY-MM'), category
       ORDER BY month ASC`,
      [gymId]
    );

    const monthMap = {};
    for (const row of rows) {
      if (!monthMap[row.month]) {
        monthMap[row.month] = { month: row.month, total: 0, byCategory: {} };
      }
      const amount = parseFloat(row.total) || 0;
      monthMap[row.month].byCategory[row.category] = amount;
      monthMap[row.month].total += amount;
    }

    res.json(Object.values(monthMap));
  } catch (err) {
    console.error('GET /expenses/summary error:', err);
    res.status(500).json({ error: 'Failed to fetch expense summary' });
  }
});

// GET / — list expenses with filters and summary
router.get('/', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { month, category, branch_id, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = ['gym_id = ?'];
    const params = [gymId];

    if (month) {
      conditions.push("TO_CHAR(expense_date, 'YYYY-MM') = ?");
      params.push(month);
    }
    if (category && VALID_CATEGORIES.includes(category)) {
      conditions.push('category = ?');
      params.push(category);
    }
    if (branch_id) {
      conditions.push('branch_id = ?');
      params.push(branch_id);
    }

    const where = conditions.join(' AND ');

    const countRow = await getOne(`SELECT COUNT(*) as total FROM expenses WHERE ${where}`, params);
    const total = parseInt(countRow?.total || 0);

    const data = await getAll(
      `SELECT * FROM expenses WHERE ${where} ORDER BY expense_date DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const summaryRows = await getAll(
      `SELECT category, SUM(amount) as total, COUNT(*) as count FROM expenses WHERE ${where} GROUP BY category ORDER BY total DESC`,
      params
    );

    let grandTotal = 0;
    const byCategory = summaryRows.map(row => {
      const t = parseFloat(row.total) || 0;
      grandTotal += t;
      return { category: row.category, total: t, count: parseInt(row.count) || 0 };
    });

    res.json({
      data,
      summary: { total: grandTotal, byCategory },
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    console.error('GET /expenses error:', err);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// POST / — create expense
router.post('/', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { branch_id, amount, category, description, expense_date, payment_method, receipt_photo } = req.body;

    if (!amount || !category || !expense_date) {
      return res.status(400).json({ error: 'amount, category, and expense_date are required' });
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` });
    }

    const id = uuidv4();
    await runQuery(
      `INSERT INTO expenses (id, gym_id, branch_id, amount, category, description, expense_date, payment_method, receipt_photo, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, gymId, branch_id || null, amount, category, description || null, expense_date, payment_method || 'cash', receipt_photo || null, req.user.id]
    );

    const created = await getOne('SELECT * FROM expenses WHERE id = ?', [id]);
    res.status(201).json(created);
  } catch (err) {
    console.error('POST /expenses error:', err);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// PUT /:id — update expense
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { id } = req.params;

    const existing = await getOne('SELECT * FROM expenses WHERE id = ? AND gym_id = ?', [id, gymId]);
    if (!existing) return res.status(404).json({ error: 'Expense not found' });

    const { branch_id, amount, category, description, expense_date, payment_method, receipt_photo } = req.body;

    if (category && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` });
    }

    await runQuery(
      `UPDATE expenses SET
         branch_id = ?, amount = ?, category = ?, description = ?,
         expense_date = ?, payment_method = ?, receipt_photo = ?
       WHERE id = ? AND gym_id = ?`,
      [
        branch_id ?? existing.branch_id,
        amount ?? existing.amount,
        category ?? existing.category,
        description ?? existing.description,
        expense_date ?? existing.expense_date,
        payment_method ?? existing.payment_method,
        receipt_photo ?? existing.receipt_photo,
        id, gymId,
      ]
    );

    const updated = await getOne('SELECT * FROM expenses WHERE id = ?', [id]);
    res.json(updated);
  } catch (err) {
    console.error('PUT /expenses/:id error:', err);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// DELETE /:id — delete expense
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { id } = req.params;

    const existing = await getOne('SELECT * FROM expenses WHERE id = ? AND gym_id = ?', [id, gymId]);
    if (!existing) return res.status(404).json({ error: 'Expense not found' });

    await runQuery('DELETE FROM expenses WHERE id = ? AND gym_id = ?', [id, gymId]);
    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    console.error('DELETE /expenses/:id error:', err);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

export default router;
