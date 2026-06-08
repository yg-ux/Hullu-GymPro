import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getOne, getAll, logActivity } from '../models/database.js';
import { authenticateToken, requireActiveSubscription } from './auth.js';
import { smsService } from '../services/smsService.js';
import { validateCreatePayment } from '../middleware/validate.js';
import { logPaymentRecorded, logPaymentDeleted } from '../services/activityService.js';

const router = express.Router();

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split('T')[0];
}

const membershipDurations = {
  'daily': 1,
  '1_month': 30,
  '2_months': 60,
  '3_months': 90,
  '6_months': 180,
  '1_year': 365
};

const SESSIONS_FOR_3DAYS = {
  '1_month': 12, '2_months': 24, '3_months': 36, '6_months': 72, '1_year': 144,
};

// Get all payments for this gym (with pagination)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { customer_id, start_date, end_date } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const gymId = req.user.gym_id;

    let where = 'WHERE p.gym_id = ?';
    const params = [gymId];
    const countParams = [gymId];

    if (customer_id) {
      where += ' AND p.customer_id = ?';
      params.push(customer_id);
      countParams.push(customer_id);
    }
    if (start_date) {
      where += ' AND p.payment_date >= ?';
      params.push(start_date);
      countParams.push(start_date);
    }
    if (end_date) {
      where += ' AND p.payment_date <= ?';
      params.push(end_date);
      countParams.push(end_date);
    }

    const totalRow = await getOne(`SELECT COUNT(*) as total FROM payments p ${where}`, countParams);
    const total = totalRow?.total || 0;
    params.push(limit, offset);

    const payments = await getAll(`
      SELECT p.*, c.name as customer_name, c.phone as customer_phone
      FROM payments p
      LEFT JOIN customers c ON p.customer_id = c.id
      ${where}
      ORDER BY p.payment_date DESC
      LIMIT ? OFFSET ?
    `, params);

    res.json({ data: payments, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Failed to get payments' });
  }
});

// Record payment
router.post('/', authenticateToken, requireActiveSubscription, validateCreatePayment, async (req, res) => {
  try {
    const { customer_id, amount, payment_method = 'cash', membership_type, notes, duration_key } = req.body;
    const gymId = req.user.gym_id;

    if (!customer_id || !amount) {
      return res.status(400).json({ error: 'Customer ID and amount are required' });
    }

    const customer = await getOne('SELECT * FROM customers WHERE id = ? AND gym_id = ?', [customer_id, gymId]);
    const gym = await getOne('SELECT * FROM gyms WHERE id = ?', [gymId]);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const paymentId = uuidv4();
    const today = new Date();
    const paymentDate = today.toISOString().split('T')[0];

    const selectedType = membership_type || customer.membership_type;

    // ── Session-based types ────────────────────────────────────────────────────
    if (selectedType === 'daily') {
      // Each payment = 1 daily pass (session)
      await runQuery(`
        INSERT INTO payments (id, gym_id, customer_id, amount, payment_method, payment_date, membership_type, start_date, end_date, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [paymentId, gymId, customer_id, amount, payment_method, paymentDate, selectedType, paymentDate, paymentDate, notes || null]);

      await runQuery(`
        UPDATE customers SET
          total_sessions = total_sessions + 1,
          status = CASE
            WHEN sessions_used < total_sessions + 1 THEN
              CASE WHEN (total_sessions + 1 - sessions_used) <= 3 THEN 'expiring' ELSE 'active' END
            ELSE 'expired'
          END,
          updated_at = NOW()
        WHERE id = ?
      `, [customer_id]);

      const updatedCustomer = await getOne('SELECT * FROM customers WHERE id = ?', [customer_id]);
      const payment = await getOne('SELECT * FROM payments WHERE id = ?', [paymentId]);
      logPaymentRecorded(gymId, req.user.id, paymentId, amount, updatedCustomer.name);
      return res.status(201).json({
        payment,
        customer: updatedCustomer,
        message: `1 daily pass added — ${updatedCustomer.total_sessions - updatedCustomer.sessions_used} pass(es) remaining`,
      });
    }

    if (selectedType === '3_days_week') {
      // duration_key tells us how many sessions to add (1_month=12, 3_months=36, etc.)
      const dKey = duration_key || '1_month';
      const addSessions = SESSIONS_FOR_3DAYS[dKey] || 12;
      const durationDays = membershipDurations[dKey] || 30;
      // Extend end date by the actual calendar duration (date AND sessions both gate check-ins)
      const currentEnd = new Date(customer.membership_end);
      const baseDate = currentEnd > today ? currentEnd : today;
      const newEndDate = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];

      await runQuery(`
        INSERT INTO payments (id, gym_id, customer_id, amount, payment_method, payment_date, membership_type, start_date, end_date, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [paymentId, gymId, customer_id, amount, payment_method, paymentDate, selectedType, paymentDate, newEndDate, notes || null]);

      await runQuery(`
        UPDATE customers SET
          membership_type = ?,
          membership_end = ?,
          total_sessions = total_sessions + ?,
          visits_this_week = 0,
          week_start_date = ?,
          status = 'active',
          updated_at = NOW()
        WHERE id = ?
      `, [selectedType, newEndDate, addSessions, getWeekStart(), customer_id]);

      const updatedCustomer = await getOne('SELECT * FROM customers WHERE id = ?', [customer_id]);
      const payment = await getOne('SELECT * FROM payments WHERE id = ?', [paymentId]);
      logPaymentRecorded(gymId, req.user.id, paymentId, amount, updatedCustomer.name);

      // Send payment confirmation SMS for 3_days_week
      if (updatedCustomer.phone && gym.sms_enabled) {
        try {
          await smsService.sendPaymentConfirmation(updatedCustomer, payment, gym);
        } catch (smsError) {
          console.warn('Failed to send payment confirmation SMS:', smsError.message);
        }
      }

      return res.status(201).json({
        payment,
        customer: updatedCustomer,
        message: `${addSessions} sessions added — ${updatedCustomer.total_sessions - updatedCustomer.sessions_used} remaining`,
      });
    }

    // ── Date-based types ───────────────────────────────────────────────────────
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

    await runQuery(`
      INSERT INTO payments (id, gym_id, customer_id, amount, payment_method, payment_date, membership_type, start_date, end_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [paymentId, gymId, customer_id, amount, payment_method, paymentDate, selectedType, newStartDate, newEndDate, notes || null]);

    await runQuery(`
      UPDATE customers SET
        membership_type = ?,
        membership_start = ?,
        membership_end = ?,
        status = 'active',
        updated_at = NOW()
      WHERE id = ?
    `, [selectedType, newStartDate, newEndDate, customer_id]);

    const updatedCustomer = await getOne('SELECT * FROM customers WHERE id = ?', [customer_id]);
    const payment = await getOne('SELECT * FROM payments WHERE id = ?', [paymentId]);

    logPaymentRecorded(gymId, req.user.id, paymentId, amount, updatedCustomer.name);

    // Send payment confirmation SMS — skip for daily walk-in renewals (they get one-time welcome only)
    if (updatedCustomer.phone && gym.sms_enabled && selectedType !== 'daily') {
      try {
        await smsService.sendPaymentConfirmation(updatedCustomer, payment, gym);
      } catch (smsError) {
        console.warn('Failed to send payment confirmation SMS:', smsError.message);
      }
    }

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
router.delete('/:id', authenticateToken, requireActiveSubscription, async (req, res) => {
  try {
    const gymId = req.user.gym_id;

    const payment = await getOne('SELECT * FROM payments WHERE id = ? AND gym_id = ?', [req.params.id, gymId]);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    await runQuery('DELETE FROM payments WHERE id = ? AND gym_id = ?', [req.params.id, gymId]);
    logPaymentDeleted(gymId, req.user.id, req.params.id);
    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});

export default router;
