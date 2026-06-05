import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getOne, getAll } from '../models/database.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

const membershipDurations = {
  '1_month': 30,
  '2_months': 60,
  '3_months': 90,
  '6_months': 180,
  '1_year': 365
};

// Get all payments for this gym
router.get('/', authenticateToken, (req, res) => {
  try {
    const { customer_id, start_date, end_date, limit = 100 } = req.query;
    const gymId = req.user.gym_id;

    let sql = `
      SELECT p.*, c.name as customer_name, c.phone as customer_phone
      FROM payments p
      LEFT JOIN customers c ON p.customer_id = c.id
      WHERE p.gym_id = ?
    `;
    const params = [gymId];

    if (customer_id) {
      sql += ' AND p.customer_id = ?';
      params.push(customer_id);
    }

    if (start_date) {
      sql += ' AND p.payment_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND p.payment_date <= ?';
      params.push(end_date);
    }

    sql += ' ORDER BY p.payment_date DESC LIMIT ?';
    params.push(parseInt(limit));

    const payments = getAll(sql, params);
    res.json(payments);
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Failed to get payments' });
  }
});

// Record payment
router.post('/', authenticateToken, (req, res) => {
  try {
    const { customer_id, amount, payment_method = 'cash', membership_type, notes } = req.body;
    const gymId = req.user.gym_id;

    if (!customer_id || !amount) {
      return res.status(400).json({ error: 'Customer ID and amount are required' });
    }

    const customer = getOne('SELECT * FROM customers WHERE id = ? AND gym_id = ?', [customer_id, gymId]);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const paymentId = uuidv4();
    const today = new Date();
    const paymentDate = today.toISOString().split('T')[0];

    const selectedType = membership_type || customer.membership_type;
    const duration = membershipDurations[selectedType] || 30;

    const currentEnd = new Date(customer.membership_end);
    let newStartDate, newEndDate;

    if (currentEnd > today) {
      newStartDate = customer.membership_end;
      newEndDate = new Date(currentEnd.getTime() + duration * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
    } else {
      newStartDate = paymentDate;
      newEndDate = new Date(today.getTime() + duration * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
    }

    runQuery(`
      INSERT INTO payments (id, gym_id, customer_id, amount, payment_method, payment_date, membership_type, start_date, end_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [paymentId, gymId, customer_id, amount, payment_method, paymentDate, selectedType, newStartDate, newEndDate, notes || null]);

    runQuery(`
      UPDATE customers SET
        membership_type = ?,
        membership_start = ?,
        membership_end = ?,
        status = 'active',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [selectedType, newStartDate, newEndDate, customer_id]);

    const updatedCustomer = getOne('SELECT * FROM customers WHERE id = ?', [customer_id]);
    const payment = getOne('SELECT * FROM payments WHERE id = ?', [paymentId]);

    res.status(201).json({
      payment,
      customer: updatedCustomer,
      message: `Membership extended until ${newEndDate}`
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// Delete payment
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const gymId = req.user.gym_id;

    const payment = getOne('SELECT * FROM payments WHERE id = ? AND gym_id = ?', [req.params.id, gymId]);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    runQuery('DELETE FROM payments WHERE id = ? AND gym_id = ?', [req.params.id, gymId]);
    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});

export default router;
