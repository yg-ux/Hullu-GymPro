import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getOne, getAll, logActivity } from '../models/database.js';
import { authenticateToken, requireActiveSubscription } from './auth.js';
import { smsService } from '../services/smsService.js';
import { validateCreateCustomer, validateUpdateCustomer } from '../middleware/validate.js';
import { logCustomerAdded, logCustomerUpdated, logCustomerDeleted, logCheckIn, logCheckOut } from '../services/activityService.js';

const router = express.Router();

// Helper to get week start date (Monday)
function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split('T')[0];
}

// Membership duration in days
const membershipDurations = {
  '1_month': 30,
  '2_months': 60,
  '3_months': 90,
  '6_months': 180,
  '1_year': 365,
  '3_days_week': 30
};

// Max visits per week for limited memberships (0 = unlimited)
const membershipMaxVisits = {
  '3_days_week': 3
};

// Get all customers for this gym (with pagination)
router.get('/', authenticateToken, (req, res) => {
  try {
    const { status, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const gymId = req.user.gym_id;

    // Batch-update stale statuses using a single SQL statement (fixes N+1)
    runQuery(`
      UPDATE customers SET
        status = CASE
          WHEN julianday(membership_end) - julianday('now') <= 0 THEN 'expired'
          WHEN julianday(membership_end) - julianday('now') <= 7 THEN 'expiring'
          ELSE 'active'
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE gym_id = ?
        AND status != 'inactive'
        AND membership_end IS NOT NULL
        AND status != CASE
          WHEN julianday(membership_end) - julianday('now') <= 0 THEN 'expired'
          WHEN julianday(membership_end) - julianday('now') <= 7 THEN 'expiring'
          ELSE 'active'
        END
    `, [gymId]);

    let countSql = 'SELECT COUNT(*) as total FROM customers WHERE gym_id = ?';
    let sql = `SELECT *,
      CAST(julianday(membership_end) - julianday('now') AS INTEGER) as days_until_expiry
      FROM customers WHERE gym_id = ?`;
    const params = [gymId];
    const countParams = [gymId];

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      countSql += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }

    if (search) {
      sql += ' AND (name LIKE ? OR phone LIKE ?)';
      countSql += ' AND (name LIKE ? OR phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
      countParams.push(`%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY
      CASE status
        WHEN 'active' THEN 1
        WHEN 'expiring' THEN 2
        WHEN 'expired' THEN 3
        WHEN 'inactive' THEN 4
      END ASC,
      CASE WHEN status = 'active' OR status = 'expiring' THEN membership_end END ASC,
      name ASC
      LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const customers = getAll(sql, params);
    const totalRow = getOne(countSql, countParams);
    const total = totalRow?.total || 0;

    // Status counts (always across all customers for this gym)
    const statusCounts = getAll(`
      SELECT status, COUNT(*) as count FROM customers WHERE gym_id = ? GROUP BY status
    `, [gymId]).reduce((acc, row) => { acc[row.status] = row.count; return acc; }, {});

    res.json({
      data: customers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      summary: {
        total: statusCounts.active + statusCounts.expiring + statusCounts.expired + statusCounts.inactive || 0,
        active: statusCounts.active || 0,
        expiring: statusCounts.expiring || 0,
        expired: statusCounts.expired || 0,
        inactive: statusCounts.inactive || 0,
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Failed to get customers' });
  }
});

// Normalize phone number: strip +, spaces, leading 0, and country code (251)
function normalizePhone(phone) {
  if (!phone) return '';
  // Remove all non-digit characters
  return phone.replace(/\D/g, '')
    // Remove leading 251 (Ethiopia country code)
    .replace(/^251/, '')
    // Remove leading 0
    .replace(/^0+/, '');
}

// Phone search endpoint for check-in
router.get('/search/phone', authenticateToken, (req, res) => {
  try {
    const { phone } = req.query;
    const gymId = req.user.gym_id;

    if (!phone || phone.length < 3) {
      return res.status(400).json({ error: 'Phone number must be at least 3 characters' });
    }

    const normalizedSearch = normalizePhone(phone);

    // Use SQL LIKE with digits-only search (handles +251, 0, spaces etc)
    const customers = getAll(`
      SELECT *,
        CAST(julianday(membership_end) - julianday('now') AS INTEGER) as days_until_expiry
      FROM customers
      WHERE gym_id = ?
        AND REPLACE(REPLACE(REPLACE(REPLACE(phone, '+', ''), '-', ''), ' ', ''), '251', '') LIKE ?
      ORDER BY
        CASE status
          WHEN 'active' THEN 1
          WHEN 'expiring' THEN 2
          WHEN 'expired' THEN 3
          WHEN 'inactive' THEN 4
        END ASC,
        CASE WHEN status = 'active' OR status = 'expiring' THEN membership_end END ASC,
        name ASC
      LIMIT 20
    `, [gymId, `%${normalizedSearch}%`]);

    res.json({ customers: customers.map(c => ({
      ...c,
      visits_this_week: c.visits_this_week || 0,
      max_visits_per_week: c.max_visits_per_week || 0
    })) });
  } catch (error) {
    console.error('Phone search error:', error);
    res.status(500).json({ error: 'Failed to search customers' });
  }
});

// Get single customer
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const customer = getOne('SELECT * FROM customers WHERE id = ? AND gym_id = ?', [req.params.id, req.user.gym_id]);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const payments = getAll('SELECT * FROM payments WHERE customer_id = ? AND gym_id = ? ORDER BY payment_date DESC', [req.params.id, req.user.gym_id]);
    const attendance = getAll('SELECT * FROM attendance WHERE customer_id = ? AND gym_id = ? ORDER BY check_in DESC LIMIT 30', [req.params.id, req.user.gym_id]);

    const today = new Date();
    const endDate = new Date(customer.membership_end);
    const daysUntilExpiry = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

    res.json({
      ...customer,
      days_until_expiry: daysUntilExpiry,
      visits_this_week: customer.visits_this_week || 0,
      max_visits_per_week: customer.max_visits_per_week || 0,
      payments,
      attendance
    });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Failed to get customer' });
  }
});

// Create customer
router.post('/', authenticateToken, requireActiveSubscription, validateCreateCustomer, async (req, res) => {
  try {
    const { name, phone, email, membership_type = '1_month', membership_duration, amount, emergency_contact, notes, photo } = req.body;
    const gymId = req.user.gym_id;

    if (!name) {
      return res.status(400).json({ error: 'Customer name is required' });
    }

    // Check member limit using live count (not stale column)
    const gym = getOne('SELECT * FROM gyms WHERE id = ?', [gymId]);
    const maxMembers = gym.max_members || 10;
    const { count: totalCustomers } = getOne(
      "SELECT COUNT(*) as count FROM customers WHERE gym_id = ? AND status != 'inactive'",
      [gymId]
    ) || { count: 0 };

    if (maxMembers !== -1 && totalCustomers >= maxMembers) {
      return res.status(403).json({
        error: `Member limit reached (${totalCustomers}/${maxMembers}). Upgrade your plan to add more members.`,
        limit_reached: true,
        current: totalCustomers,
        max: maxMembers
      });
    }

    const customerId = uuidv4();
    const today = new Date();
    const membershipStart = today.toISOString().split('T')[0];
    // For 3_days_week, use the separately chosen duration; otherwise use the type's own duration
    const durationKey = membership_type === '3_days_week' ? (membership_duration || '1_month') : membership_type;
    const duration = membershipDurations[durationKey] || 30;
    const membershipEnd = new Date(today.getTime() + duration * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    const photoUrl = photo || null;

    const maxVisitsPerWeek = membershipMaxVisits[membership_type] || 0;
    const weekStart = maxVisitsPerWeek > 0 ? getWeekStart() : null;
    runQuery(`
      INSERT INTO customers (id, gym_id, name, phone, email, photo, membership_type, membership_start, membership_end, status, emergency_contact, notes, max_visits_per_week, visits_this_week, week_start_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, 0, ?)
    `, [customerId, gymId, name, phone || null, email || null, photoUrl, membership_type, membershipStart, membershipEnd, emergency_contact || null, notes || null, maxVisitsPerWeek, weekStart]);

    // Increment total_customers counter
    runQuery('UPDATE gyms SET total_customers = total_customers + 1 WHERE id = ?', [gymId]);

    // If amount is provided, record payment
    if (amount && parseFloat(amount) > 0) {
      const paymentId = uuidv4();
      runQuery(`
        INSERT INTO payments (id, gym_id, customer_id, amount, payment_method, payment_date, membership_type, start_date, end_date)
        VALUES (?, ?, ?, ?, 'cash', ?, ?, ?, ?)
      `, [paymentId, gymId, customerId, parseFloat(amount), membershipStart, membership_type, membershipStart, membershipEnd]);
    }

    const customer = getOne('SELECT * FROM customers WHERE id = ?', [customerId]);

    logCustomerAdded(gymId, req.user.id, customerId, name);

    // Send welcome SMS — requires SMS enabled + platform API key configured
    if (customer.phone && gym.sms_enabled && !customer.welcome_sms_sent) {
      try {
        // Attach amount from request body since it's not stored on the customer row
        const customerWithAmount = { ...customer, amount: amount || null };
        await smsService.sendWelcomeSms(customerWithAmount, gym);
        runQuery('UPDATE customers SET welcome_sms_sent = 1 WHERE id = ?', [customerId]);
      } catch (smsError) {
        console.warn('Failed to send welcome SMS:', smsError.message);
      }
    }

    res.status(201).json({
      ...customer,
      member_limit: maxMembers,
      total_customers: totalCustomers + 1
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// Update customer
router.put('/:id', authenticateToken, requireActiveSubscription, validateUpdateCustomer, (req, res) => {
  try {
    const { name, phone, email, membership_type, membership_start, membership_end, emergency_contact, notes, status, photo } = req.body;

    const existingCustomer = getOne('SELECT * FROM customers WHERE id = ? AND gym_id = ?', [req.params.id, req.user.gym_id]);

    if (!existingCustomer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const updates = [];
    const values = [];

    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (phone !== undefined) { updates.push('phone = ?'); values.push(phone || null); }
    if (email !== undefined) { updates.push('email = ?'); values.push(email || null); }
    if (membership_type !== undefined) { updates.push('membership_type = ?'); values.push(membership_type); }
    if (membership_start !== undefined) { updates.push('membership_start = ?'); values.push(membership_start); }
    if (membership_end !== undefined) { updates.push('membership_end = ?'); values.push(membership_end); }
    if (emergency_contact !== undefined) { updates.push('emergency_contact = ?'); values.push(emergency_contact || null); }
    if (notes !== undefined) { updates.push('notes = ?'); values.push(notes || null); }
    if (status !== undefined) { updates.push('status = ?'); values.push(status); }
    if (photo !== undefined) { updates.push('photo = ?'); values.push(photo); }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(req.params.id);
      values.push(req.user.gym_id);
      
      runQuery(`UPDATE customers SET ${updates.join(', ')} WHERE id = ? AND gym_id = ?`, values);
    }

    const customer = getOne('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    logCustomerUpdated(req.user.gym_id, req.user.id, req.params.id, customer?.name);
    res.json(customer);
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// Delete customer
router.delete('/:id', authenticateToken, requireActiveSubscription, (req, res) => {
  try {
    const { delete_code } = req.body;
    const gymId = req.user.gym_id;

    if (!delete_code) {
      return res.status(400).json({ error: 'Security code is required' });
    }

    const validCode = getOne("SELECT value FROM settings WHERE key = 'delete_code' AND (gym_id = ? OR gym_id = 'global')", [gymId]);

    if (!validCode || validCode.value !== delete_code) {
      return res.status(403).json({ error: 'Invalid security code' });
    }

    const customer = getOne('SELECT * FROM customers WHERE id = ? AND gym_id = ?', [req.params.id, gymId]);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Note: We do NOT decrement total_customers here
    // Deleted customers still count towards the member limit

    logCustomerDeleted(gymId, req.user.id, req.params.id, customer.name);
    runQuery('DELETE FROM payments WHERE customer_id = ? AND gym_id = ?', [req.params.id, gymId]);
    runQuery('DELETE FROM attendance WHERE customer_id = ? AND gym_id = ?', [req.params.id, gymId]);
    runQuery('DELETE FROM customers WHERE id = ? AND gym_id = ?', [req.params.id, gymId]);

    // Get updated counts for response
    const gym = getOne('SELECT total_customers, max_members FROM gyms WHERE id = ?', [gymId]);

    res.json({ 
      message: 'Customer deleted successfully',
      note: 'Deleted customers still count towards your member limit',
      total_customers: gym?.total_customers || 0,
      max_members: gym?.max_members || 10
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

// Extend membership
router.post('/:id/extend', authenticateToken, requireActiveSubscription, (req, res) => {
  try {
    const { membership_type } = req.body;
    const gymId = req.user.gym_id;

    if (!membership_type || !membershipDurations[membership_type]) {
      return res.status(400).json({ error: 'Valid membership type is required' });
    }

    const customer = getOne('SELECT * FROM customers WHERE id = ? AND gym_id = ?', [req.params.id, gymId]);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const today = new Date();
    const currentEnd = new Date(customer.membership_end);
    const duration = membershipDurations[membership_type];
    const maxVisits = membershipMaxVisits[membership_type] || 0;

    const newStartDate = currentEnd > today ? customer.membership_end : today.toISOString().split('T')[0];
    const newEndDate = new Date(new Date(newStartDate).getTime() + duration * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    runQuery(`
      UPDATE customers SET
        membership_type = ?,
        membership_start = ?,
        membership_end = ?,
        status = 'active',
        max_visits_per_week = ?,
        visits_this_week = 0,
        week_start_date = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [membership_type, newStartDate, newEndDate, maxVisits, getWeekStart(), req.params.id]);

    const updatedCustomer = getOne('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    res.json(updatedCustomer);
  } catch (error) {
    console.error('Extend membership error:', error);
    res.status(500).json({ error: 'Failed to extend membership' });
  }
});

// Check in
router.post('/:id/check-in', authenticateToken, requireActiveSubscription, (req, res) => {
  try {
    const gymId = req.user.gym_id;

    const existingCheckIn = getOne(`
      SELECT * FROM attendance 
      WHERE customer_id = ? AND gym_id = ? AND check_out IS NULL 
      ORDER BY check_in DESC LIMIT 1
    `, [req.params.id, gymId]);

    if (existingCheckIn) {
      return res.status(400).json({ error: 'Customer is already checked in', attendance: existingCheckIn });
    }

    // Get customer info to check visit limits
    const customer = getOne('SELECT * FROM customers WHERE id = ? AND gym_id = ?', [req.params.id, gymId]);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check membership validity
    const today = new Date();
    const endDate = new Date(customer.membership_end);
    if (endDate < today) {
      return res.status(400).json({ error: 'Customer membership has expired' });
    }

    // Check visit limits for limited membership types
    if (customer.max_visits_per_week && customer.max_visits_per_week > 0) {
      const currentWeekStart = getWeekStart();
      
      // Reset visits if new week
      if (customer.week_start_date !== currentWeekStart) {
        runQuery('UPDATE customers SET visits_this_week = 0, week_start_date = ? WHERE id = ?', 
          [currentWeekStart, customer.id]);
        customer.visits_this_week = 0;
      }

      if (customer.visits_this_week >= customer.max_visits_per_week) {
        return res.status(403).json({ 
          error: `Weekly visit limit reached (${customer.max_visits_per_week}/${customer.max_visits_per_week} visits)`,
          visits_this_week: customer.visits_this_week,
          max_visits: customer.max_visits_per_week,
          week_resets_on: getWeekStart(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
        });
      }
    }

    const attendanceId = uuidv4();
    const checkInTime = new Date().toISOString();

    runQuery(`
      INSERT INTO attendance (id, gym_id, customer_id, check_in)
      VALUES (?, ?, ?, ?)
    `, [attendanceId, gymId, req.params.id, checkInTime]);

    // Increment visit count for limited memberships
    if (customer.max_visits_per_week && customer.max_visits_per_week > 0) {
      const currentWeekStart = getWeekStart();
      const newVisits = (customer.visits_this_week || 0) + 1;
      runQuery('UPDATE customers SET visits_this_week = ?, week_start_date = ? WHERE id = ?', 
        [newVisits, currentWeekStart, customer.id]);
    }

    const attendance = getOne('SELECT * FROM attendance WHERE id = ?', [attendanceId]);
    logCheckIn(gymId, req.user.id, req.params.id, customer.name);
    res.status(201).json({
      ...attendance,
      visits_this_week: customer.max_visits_per_week ? (customer.visits_this_week || 0) + 1 : null,
      max_visits: customer.max_visits_per_week
    });
  } catch (error) {
    console.error('Check in error:', error);
    res.status(500).json({ error: 'Failed to check in' });
  }
});

// Check out
router.post('/:id/check-out', authenticateToken, requireActiveSubscription, (req, res) => {
  try {
    const gymId = req.user.gym_id;

    const attendance = getOne(`
      SELECT * FROM attendance 
      WHERE customer_id = ? AND gym_id = ? AND check_out IS NULL 
      ORDER BY check_in DESC LIMIT 1
    `, [req.params.id, gymId]);

    if (!attendance) {
      return res.status(400).json({ error: 'No active check-in found' });
    }

    const checkOutTime = new Date().toISOString();
    runQuery('UPDATE attendance SET check_out = ? WHERE id = ?', [checkOutTime, attendance.id]);

    const customer = getOne('SELECT name FROM customers WHERE id = ?', [req.params.id]);
    logCheckOut(gymId, req.user.id, req.params.id, customer?.name);
    const updated = getOne('SELECT * FROM attendance WHERE id = ?', [attendance.id]);
    res.json(updated);
  } catch (error) {
    console.error('Check out error:', error);
    res.status(500).json({ error: 'Failed to check out' });
  }
});

export default router;
