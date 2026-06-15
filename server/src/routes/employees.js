import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getOne, getAll } from '../models/database.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// GET all employees for this gym
router.get('/', authenticateToken, async (req, res) => {
  try {
    const employees = await getAll(
      `SELECT * FROM employees WHERE gym_id = ? ORDER BY name ASC`,
      [req.user.gym_id]
    );
    res.json({ employees });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ error: 'Failed to get employees' });
  }
});

// POST create employee
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, phone, email, position, salary, start_date, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

    const id = uuidv4();
    await runQuery(
      `INSERT INTO employees (id, gym_id, name, phone, email, position, salary, start_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user.gym_id, name.trim(), phone || null, email || null,
       position || null, salary ? parseFloat(salary) : null, start_date || null, notes || null]
    );

    const employee = await getOne('SELECT * FROM employees WHERE id = ?', [id]);
    res.status(201).json(employee);
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// PUT update employee
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, phone, email, position, salary, start_date, status, notes } = req.body;
    const existing = await getOne(
      'SELECT id FROM employees WHERE id = ? AND gym_id = ?',
      [req.params.id, req.user.gym_id]
    );
    if (!existing) return res.status(404).json({ error: 'Employee not found' });

    const updates = [];
    const values = [];
    if (name !== undefined)       { updates.push('name = ?');       values.push(name.trim()); }
    if (phone !== undefined)      { updates.push('phone = ?');      values.push(phone || null); }
    if (email !== undefined)      { updates.push('email = ?');      values.push(email || null); }
    if (position !== undefined)   { updates.push('position = ?');   values.push(position || null); }
    if (salary !== undefined)     { updates.push('salary = ?');     values.push(salary ? parseFloat(salary) : null); }
    if (start_date !== undefined) { updates.push('start_date = ?'); values.push(start_date || null); }
    if (status !== undefined)     { updates.push('status = ?');     values.push(status); }
    if (notes !== undefined)      { updates.push('notes = ?');      values.push(notes || null); }

    if (updates.length > 0) {
      updates.push('updated_at = NOW()');
      values.push(req.params.id, req.user.gym_id);
      await runQuery(`UPDATE employees SET ${updates.join(', ')} WHERE id = ? AND gym_id = ?`, values);
    }

    const employee = await getOne('SELECT * FROM employees WHERE id = ?', [req.params.id]);
    res.json(employee);
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// DELETE employee
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const existing = await getOne(
      'SELECT id FROM employees WHERE id = ? AND gym_id = ?',
      [req.params.id, req.user.gym_id]
    );
    if (!existing) return res.status(404).json({ error: 'Employee not found' });

    await runQuery('DELETE FROM employees WHERE id = ? AND gym_id = ?', [req.params.id, req.user.gym_id]);
    res.json({ message: 'Employee deleted' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

export default router;
