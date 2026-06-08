import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getOne, getAll, logActivity } from '../models/database.js';
import { authenticateToken, requireActiveSubscription } from './auth.js';
import { smsService } from '../services/smsService.js';
import { validateCreateCustomer, validateUpdateCustomer } from '../middleware/validate.js';
import { logCustomerAdded, logCustomerUpdated, logCustomerDeleted, logCheckIn, logCheckOut } from '../services/activityService.js';

const router = express.Router();

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split('T')[0];
}

const membershipDurations = {
  'daily': 1, '1_month': 30, '2_months': 60, '3_months': 90,
  '6_months': 180, '1_year': 365, '3_days_week': 30
};

const membershipMaxVisits = { '3_days_week': 3 };

// Session-based types: expiry tracked by check-in count, not calendar date
const SESSION_TYPES = new Set(['3_days_week', 'daily']);

// Sessions included per duration for 3_days_week (3 days/week × N weeks)
const SESSIONS_FOR_3DAYS = {
  '1_month': 12, '2_months': 24, '3_months': 36, '6_months': 72, '1_year': 144,
};

// Get all customers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const gymId = req.user.gym_id;

    // Batch-update stale statuses — date-based (skip session types)
    await runQuery(`
      UPDATE customers SET
        status = CASE
          WHEN EXTRACT(EPOCH FROM (membership_end::timestamp - NOW())) / 86400 <= 0 THEN 'expired'
          WHEN EXTRACT(EPOCH FROM (membership_end::timestamp - NOW())) / 86400 <= 7 THEN 'expiring'
          ELSE 'active'
        END,
        updated_at = NOW()
      WHERE gym_id = ?
        AND status != 'inactive'
        AND membership_end IS NOT NULL
        AND membership_type NOT IN ('3_days_week', 'daily')
        AND status != CASE
          WHEN EXTRACT(EPOCH FROM (membership_end::timestamp - NOW())) / 86400 <= 0 THEN 'expired'
          WHEN EXTRACT(EPOCH FROM (membership_end::timestamp - NOW())) / 86400 <= 7 THEN 'expiring'
          ELSE 'active'
        END
    `, [gymId]);

    // Session-based status updates (3_days_week and daily)
    await runQuery(`
      UPDATE customers SET status = 'expired', updated_at = NOW()
      WHERE gym_id = ? AND membership_type IN ('3_days_week', 'daily')
        AND total_sessions > 0 AND sessions_used >= total_sessions
        AND status NOT IN ('expired', 'inactive')
    `, [gymId]);
    await runQuery(`
      UPDATE customers SET status = 'expiring', updated_at = NOW()
      WHERE gym_id = ? AND membership_type IN ('3_days_week', 'daily')
        AND total_sessions > 0 AND sessions_used < total_sessions
        AND (total_sessions - sessions_used) <= 3 AND status = 'active'
    `, [gymId]);

    let countSql = 'SELECT COUNT(*) as total FROM customers WHERE gym_id = ?';
    let sql = `SELECT *,
      FLOOR(EXTRACT(EPOCH FROM (membership_end::timestamp - NOW())) / 86400)::integer as days_until_expiry
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
      sql += ' AND (name ILIKE ? OR phone LIKE ?)';
      countSql += ' AND (name ILIKE ? OR phone LIKE ?)';
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

    const customers = await getAll(sql, params);
    const totalRow = await getOne(countSql, countParams);
    const total = parseInt(totalRow?.total || 0);

    const statusRows = await getAll(`
      SELECT status, COUNT(*) as count FROM customers WHERE gym_id = ? GROUP BY status
    `, [gymId]);
    const statusCounts = statusRows.reduce((acc, row) => { acc[row.status] = parseInt(row.count); return acc; }, {});

    res.json({
      data: customers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      summary: {
        total: (statusCounts.active || 0) + (statusCounts.expiring || 0) + (statusCounts.expired || 0) + (statusCounts.inactive || 0),
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

function normalizePhone(phone) {
  if (!phone) return '';
  return phone.replace(/\D/g, '').replace(/^251/, '').replace(/^0+/, '');
}

router.get('/search/phone', authenticateToken, async (req, res) => {
  try {
    const { phone } = req.query;
    const gymId = req.user.gym_id;
    if (!phone || phone.length < 3) return res.status(400).json({ error: 'Phone must be at least 3 characters' });

    const normalizedSearch = normalizePhone(phone);
    const customers = await getAll(`
      SELECT *,
        FLOOR(EXTRACT(EPOCH FROM (membership_end::timestamp - NOW())) / 86400)::integer as days_until_expiry
      FROM customers
      WHERE gym_id = ?
        AND REGEXP_REPLACE(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), '^(251|0)', '', 'g') LIKE ?
      ORDER BY
        CASE status WHEN 'active' THEN 1 WHEN 'expiring' THEN 2 WHEN 'expired' THEN 3 ELSE 4 END,
        name ASC
      LIMIT 20
    `, [gymId, `%${normalizedSearch}%`]);

    res.json({ customers: customers.map(c => ({ ...c, visits_this_week: c.visits_this_week || 0, max_visits_per_week: c.max_visits_per_week || 0 })) });
  } catch (error) {
    console.error('Phone search error:', error);
    res.status(500).json({ error: 'Failed to search customers' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const customer = await getOne('SELECT * FROM customers WHERE id = ? AND gym_id = ?', [req.params.id, req.user.gym_id]);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const payments = await getAll('SELECT * FROM payments WHERE customer_id = ? AND gym_id = ? ORDER BY payment_date DESC', [req.params.id, req.user.gym_id]);
    const attendance = await getAll('SELECT * FROM attendance WHERE customer_id = ? AND gym_id = ? ORDER BY check_in DESC LIMIT 30', [req.params.id, req.user.gym_id]);

    const today = new Date();
    const endDate = new Date(customer.membership_end);
    const daysUntilExpiry = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

    res.json({ ...customer, days_until_expiry: daysUntilExpiry, visits_this_week: customer.visits_this_week || 0, max_visits_per_week: customer.max_visits_per_week || 0, payments, attendance });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Failed to get customer' });
  }
});

router.post('/', authenticateToken, requireActiveSubscription, validateCreateCustomer, async (req, res) => {
  try {
    const { name, phone, email, membership_type = '1_month', membership_duration, amount, emergency_contact, notes, photo } = req.body;
    const gymId = req.user.gym_id;
    if (!name) return res.status(400).json({ error: 'Customer name is required' });

    const gym = await getOne('SELECT * FROM gyms WHERE id = ?', [gymId]);
    const maxMembers = gym.max_members || 10;
    const countRow = await getOne("SELECT COUNT(*) as count FROM customers WHERE gym_id = ? AND status != 'inactive'", [gymId]);
    const totalCustomers = parseInt(countRow?.count || 0);

    if (maxMembers !== -1 && totalCustomers >= maxMembers) {
      return res.status(403).json({ error: `Member limit reached (${totalCustomers}/${maxMembers}). Upgrade your plan to add more members.`, limit_reached: true, current: totalCustomers, max: maxMembers });
    }

    const customerId = uuidv4();
    const today = new Date();
    const membershipStart = today.toISOString().split('T')[0];
    const durationKey = membership_type === '3_days_week' ? (membership_duration || '1_month') : membership_type;
    const duration = membershipDurations[durationKey] || 30;

    // Session-based types: track expiry by check-in count, not calendar dates
    let membershipEnd, totalSessions;
    if (membership_type === 'daily') {
      totalSessions = 1;
      membershipEnd = '2099-12-31'; // date is irrelevant — sessions govern expiry
    } else if (membership_type === '3_days_week') {
      totalSessions = SESSIONS_FOR_3DAYS[durationKey] || 12;
      // Safety date = 4× the calendar duration so date never triggers before sessions run out
      const safetyDays = duration * 4;
      membershipEnd = new Date(today.getTime() + safetyDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    } else {
      totalSessions = 0;
      membershipEnd = new Date(today.getTime() + duration * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    const maxVisitsPerWeek = membershipMaxVisits[membership_type] || 0;
    const weekStart = maxVisitsPerWeek > 0 ? getWeekStart() : null;

    await runQuery(`
      INSERT INTO customers (id, gym_id, name, phone, email, photo, membership_type, membership_start, membership_end, status, emergency_contact, notes, max_visits_per_week, visits_this_week, week_start_date, total_sessions, sessions_used)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, 0, ?, ?, 0)
    `, [customerId, gymId, name, phone || null, email || null, photo || null, membership_type, membershipStart, membershipEnd, emergency_contact || null, notes || null, maxVisitsPerWeek, weekStart, totalSessions]);

    await runQuery('UPDATE gyms SET total_customers = total_customers + 1 WHERE id = ?', [gymId]);

    if (amount && parseFloat(amount) > 0) {
      await runQuery(`
        INSERT INTO payments (id, gym_id, customer_id, amount, payment_method, payment_date, membership_type, start_date, end_date)
        VALUES (?, ?, ?, ?, 'cash', ?, ?, ?, ?)
      `, [uuidv4(), gymId, customerId, parseFloat(amount), membershipStart, membership_type, membershipStart, membershipEnd]);
    }

    const customer = await getOne('SELECT * FROM customers WHERE id = ?', [customerId]);
    logCustomerAdded(gymId, req.user.id, customerId, name);

    if (customer.phone && gym.sms_enabled && !customer.welcome_sms_sent) {
      try {
        await smsService.sendWelcomeSms({ ...customer, amount: amount || null }, gym);
        await runQuery('UPDATE customers SET welcome_sms_sent = 1 WHERE id = ?', [customerId]);
      } catch (smsError) { console.warn('Failed to send welcome SMS:', smsError.message); }
    }

    res.status(201).json({ ...customer, member_limit: maxMembers, total_customers: totalCustomers + 1 });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

router.put('/:id', authenticateToken, requireActiveSubscription, validateUpdateCustomer, async (req, res) => {
  try {
    const { name, phone, email, membership_type, membership_start, membership_end, emergency_contact, notes, status, photo } = req.body;
    const existingCustomer = await getOne('SELECT * FROM customers WHERE id = ? AND gym_id = ?', [req.params.id, req.user.gym_id]);
    if (!existingCustomer) return res.status(404).json({ error: 'Customer not found' });

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
      updates.push('updated_at = NOW()');
      values.push(req.params.id, req.user.gym_id);
      await runQuery(`UPDATE customers SET ${updates.join(', ')} WHERE id = ? AND gym_id = ?`, values);
    }

    const customer = await getOne('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    logCustomerUpdated(req.user.gym_id, req.user.id, req.params.id, customer?.name);
    res.json(customer);
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

router.delete('/:id', authenticateToken, requireActiveSubscription, async (req, res) => {
  try {
    const { delete_code } = req.body;
    const gymId = req.user.gym_id;
    if (!delete_code) return res.status(400).json({ error: 'Security code is required' });

    const validCode = await getOne("SELECT value FROM settings WHERE key = 'delete_code' AND (gym_id = ? OR gym_id = 'global') LIMIT 1", [gymId]);
    if (!validCode || validCode.value !== delete_code) return res.status(403).json({ error: 'Invalid security code' });

    const customer = await getOne('SELECT * FROM customers WHERE id = ? AND gym_id = ?', [req.params.id, gymId]);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    logCustomerDeleted(gymId, req.user.id, req.params.id, customer.name);
    await runQuery('DELETE FROM payments WHERE customer_id = ? AND gym_id = ?', [req.params.id, gymId]);
    await runQuery('DELETE FROM attendance WHERE customer_id = ? AND gym_id = ?', [req.params.id, gymId]);
    await runQuery('DELETE FROM customers WHERE id = ? AND gym_id = ?', [req.params.id, gymId]);

    const gym = await getOne('SELECT total_customers, max_members FROM gyms WHERE id = ?', [gymId]);
    res.json({ message: 'Customer deleted successfully', total_customers: gym?.total_customers || 0, max_members: gym?.max_members || 10 });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

router.post('/:id/extend', authenticateToken, requireActiveSubscription, async (req, res) => {
  try {
    const { membership_type } = req.body;
    const gymId = req.user.gym_id;
    if (!membership_type || !membershipDurations[membership_type]) return res.status(400).json({ error: 'Valid membership type is required' });

    const customer = await getOne('SELECT * FROM customers WHERE id = ? AND gym_id = ?', [req.params.id, gymId]);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const today = new Date();
    const currentEnd = new Date(customer.membership_end);
    const duration = membershipDurations[membership_type];
    const maxVisits = membershipMaxVisits[membership_type] || 0;
    const newStartDate = currentEnd > today ? customer.membership_end : today.toISOString().split('T')[0];
    const newEndDate = new Date(new Date(newStartDate).getTime() + duration * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    await runQuery(`
      UPDATE customers SET membership_type = ?, membership_start = ?, membership_end = ?,
        status = 'active', max_visits_per_week = ?, visits_this_week = 0, week_start_date = ?, updated_at = NOW()
      WHERE id = ?
    `, [membership_type, newStartDate, newEndDate, maxVisits, getWeekStart(), req.params.id]);

    const updatedCustomer = await getOne('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    res.json(updatedCustomer);
  } catch (error) {
    console.error('Extend membership error:', error);
    res.status(500).json({ error: 'Failed to extend membership' });
  }
});

router.post('/:id/check-in', authenticateToken, requireActiveSubscription, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const existingCheckIn = await getOne(`SELECT * FROM attendance WHERE customer_id = ? AND gym_id = ? AND check_out IS NULL ORDER BY check_in DESC LIMIT 1`, [req.params.id, gymId]);
    if (existingCheckIn) return res.status(400).json({ error: 'Customer is already checked in', attendance: existingCheckIn });

    const customer = await getOne('SELECT * FROM customers WHERE id = ? AND gym_id = ?', [req.params.id, gymId]);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const isSessionType = SESSION_TYPES.has(customer.membership_type);

    if (isSessionType) {
      // Session-based expiry check
      const sessionsLeft = (customer.total_sessions || 0) - (customer.sessions_used || 0);
      if (sessionsLeft <= 0) {
        const msg = customer.membership_type === 'daily'
          ? 'No daily passes remaining. Please pay for a new visit first.'
          : 'All sessions used up. Please renew the membership.';
        return res.status(400).json({
          error: msg,
          sessions_used: customer.sessions_used || 0,
          total_sessions: customer.total_sessions || 0,
        });
      }
      // Weekly limit still applies for 3_days_week
      if (customer.membership_type === '3_days_week' && customer.max_visits_per_week > 0) {
        const currentWeekStart = getWeekStart();
        if (customer.week_start_date !== currentWeekStart) {
          await runQuery('UPDATE customers SET visits_this_week = 0, week_start_date = ? WHERE id = ?', [currentWeekStart, customer.id]);
          customer.visits_this_week = 0;
        }
        if (customer.visits_this_week >= customer.max_visits_per_week) {
          return res.status(403).json({
            error: `Weekly visit limit reached (${customer.max_visits_per_week}/week) — resets next Monday`,
            visits_this_week: customer.visits_this_week,
            max_visits: customer.max_visits_per_week,
          });
        }
      }
    } else {
      // Date-based expiry check
      const today = new Date();
      const endDate = new Date(customer.membership_end);
      if (endDate < today) return res.status(400).json({ error: 'Customer membership has expired' });
    }

    const attendanceId = uuidv4();
    await runQuery(`INSERT INTO attendance (id, gym_id, customer_id, check_in) VALUES (?, ?, ?, NOW())`, [attendanceId, gymId, req.params.id]);

    if (isSessionType) {
      const newUsed = (customer.sessions_used || 0) + 1;
      await runQuery('UPDATE customers SET sessions_used = ?, updated_at = NOW() WHERE id = ?', [newUsed, customer.id]);
      if (newUsed >= (customer.total_sessions || 0)) {
        await runQuery("UPDATE customers SET status = 'expired', updated_at = NOW() WHERE id = ?", [customer.id]);
      } else if ((customer.total_sessions || 0) - newUsed <= 3) {
        await runQuery("UPDATE customers SET status = 'expiring', updated_at = NOW() WHERE id = ?", [customer.id]);
      }
      if (customer.membership_type === '3_days_week' && customer.max_visits_per_week > 0) {
        await runQuery('UPDATE customers SET visits_this_week = ?, week_start_date = ? WHERE id = ?',
          [(customer.visits_this_week || 0) + 1, getWeekStart(), customer.id]);
      }
    } else if (customer.max_visits_per_week && customer.max_visits_per_week > 0) {
      await runQuery('UPDATE customers SET visits_this_week = ?, week_start_date = ? WHERE id = ?', [(customer.visits_this_week || 0) + 1, getWeekStart(), customer.id]);
    }

    const attendance = await getOne('SELECT * FROM attendance WHERE id = ?', [attendanceId]);
    const updatedCustomer = await getOne('SELECT sessions_used, total_sessions, visits_this_week, max_visits_per_week FROM customers WHERE id = ?', [req.params.id]);
    logCheckIn(gymId, req.user.id, req.params.id, customer.name);
    res.status(201).json({
      ...attendance,
      sessions_used: updatedCustomer?.sessions_used,
      total_sessions: updatedCustomer?.total_sessions,
      sessions_remaining: (updatedCustomer?.total_sessions || 0) - (updatedCustomer?.sessions_used || 0),
      visits_this_week: updatedCustomer?.visits_this_week,
      max_visits: updatedCustomer?.max_visits_per_week,
    });
  } catch (error) {
    console.error('Check in error:', error);
    res.status(500).json({ error: 'Failed to check in' });
  }
});

router.post('/:id/check-out', authenticateToken, requireActiveSubscription, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const attendance = await getOne(`SELECT * FROM attendance WHERE customer_id = ? AND gym_id = ? AND check_out IS NULL ORDER BY check_in DESC LIMIT 1`, [req.params.id, gymId]);
    if (!attendance) return res.status(400).json({ error: 'No active check-in found' });

    await runQuery('UPDATE attendance SET check_out = NOW() WHERE id = ?', [attendance.id]);
    const customer = await getOne('SELECT name FROM customers WHERE id = ?', [req.params.id]);
    logCheckOut(gymId, req.user.id, req.params.id, customer?.name);
    const updated = await getOne('SELECT * FROM attendance WHERE id = ?', [attendance.id]);
    res.json(updated);
  } catch (error) {
    console.error('Check out error:', error);
    res.status(500).json({ error: 'Failed to check out' });
  }
});

export default router;
