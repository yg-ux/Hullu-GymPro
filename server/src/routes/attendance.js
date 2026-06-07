import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getOne, getAll } from '../models/database.js';
import { authenticateToken, requireActiveSubscription } from './auth.js';

const router = express.Router();

// Get today's attendance
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;

    const todayAttendance = await getAll(`
      SELECT
        a.id,
        a.customer_id,
        a.check_in,
        a.check_out,
        c.name as customer_name,
        c.phone as customer_phone,
        c.membership_type,
        c.membership_end,
        c.photo
      FROM attendance a
      JOIN customers c ON a.customer_id = c.id
      WHERE a.gym_id = ? AND date(a.check_in) = date('now')
      ORDER BY a.check_in DESC
    `, [gymId]);

    const checkedIn = todayAttendance.filter(a => !a.check_out);
    const checkedOut = todayAttendance.filter(a => a.check_out);

    res.json({
      date: new Date().toISOString().split('T')[0],
      currently_present: checkedIn,
      checked_out: checkedOut,
      total_visits: todayAttendance.length,
      present_count: checkedIn.length
    });
  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({ error: 'Failed to get today attendance' });
  }
});

// Get currently checked-in customers (no check_out yet)
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;

    const currentlyPresent = await getAll(`
      SELECT
        a.id,
        a.customer_id,
        a.check_in,
        a.check_out,
        c.name as customer_name,
        c.phone as customer_phone,
        c.membership_type,
        c.membership_end,
        c.photo
      FROM attendance a
      JOIN customers c ON a.customer_id = c.id
      WHERE a.gym_id = ? AND a.check_out IS NULL
      ORDER BY a.check_in DESC
    `, [gymId]);

    res.json({
      currently_present: currentlyPresent,
      count: currentlyPresent.length
    });
  } catch (error) {
    console.error('Get current attendance error:', error);
    res.status(500).json({ error: 'Failed to get current attendance' });
  }
});

// Check in customer by phone or ID
router.post('/check-in', authenticateToken, requireActiveSubscription, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { phone, customer_id } = req.body;

    if (!phone && !customer_id) {
      return res.status(400).json({ error: 'Phone number or customer ID is required' });
    }

    let customer;
    if (customer_id) {
      customer = await getOne('SELECT * FROM customers WHERE id = ? AND gym_id = ?', [customer_id, gymId]);
    } else {
      customer = await getOne('SELECT * FROM customers WHERE phone LIKE ? AND gym_id = ?', [`%${phone}%`, gymId]);
    }

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check if customer membership is valid
    const today = new Date();
    const endDate = new Date(customer.membership_end);
    if (endDate < today) {
      return res.status(400).json({
        error: 'Customer membership has expired',
        customer: {
          id: customer.id,
          name: customer.name,
          membership_end: customer.membership_end
        }
      });
    }

    // Check if already checked in
    const existingCheckIn = await getOne(`
      SELECT * FROM attendance
      WHERE customer_id = ? AND gym_id = ? AND check_out IS NULL
      ORDER BY check_in DESC LIMIT 1
    `, [customer.id, gymId]);

    if (existingCheckIn) {
      return res.status(400).json({
        error: 'Customer is already checked in',
        attendance: existingCheckIn,
        customer: {
          id: customer.id,
          name: customer.name
        }
      });
    }

    const attendanceId = uuidv4();
    const checkInTime = new Date().toISOString();

    await runQuery(`
      INSERT INTO attendance (id, gym_id, customer_id, check_in)
      VALUES (?, ?, ?, ?)
    `, [attendanceId, gymId, customer.id, checkInTime]);

    const attendance = await getOne(`
      SELECT a.*, c.name as customer_name, c.phone as customer_phone
      FROM attendance a
      JOIN customers c ON a.customer_id = c.id
      WHERE a.id = ?
    `, [attendanceId]);

    res.status(201).json({
      message: 'Check-in successful',
      attendance
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Failed to check in customer' });
  }
});

// Check out customer
router.post('/check-out', authenticateToken, requireActiveSubscription, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { customer_id, phone } = req.body;

    let attendance;
    let customer;

    if (customer_id) {
      attendance = await getOne(`
        SELECT a.*, c.name as customer_name
        FROM attendance a
        JOIN customers c ON a.customer_id = c.id
        WHERE a.customer_id = ? AND a.gym_id = ? AND a.check_out IS NULL
        ORDER BY a.check_in DESC LIMIT 1
      `, [customer_id, gymId]);
    } else if (phone) {
      customer = await getOne('SELECT * FROM customers WHERE phone LIKE ? AND gym_id = ?', [`%${phone}%`, gymId]);
      if (customer) {
        attendance = await getOne(`
          SELECT a.*, c.name as customer_name
          FROM attendance a
          JOIN customers c ON a.customer_id = c.id
          WHERE a.customer_id = ? AND a.gym_id = ? AND a.check_out IS NULL
          ORDER BY a.check_in DESC LIMIT 1
        `, [customer.id, gymId]);
      }
    }

    if (!attendance) {
      return res.status(400).json({
        error: customer_id || phone
          ? 'No active check-in found for this customer'
          : 'Customer ID or phone is required'
      });
    }

    const checkOutTime = new Date().toISOString();
    await runQuery('UPDATE attendance SET check_out = ? WHERE id = ?', [checkOutTime, attendance.id]);

    // Calculate duration
    const checkIn = new Date(attendance.check_in);
    const checkOut = new Date(checkOutTime);
    const durationMinutes = Math.round((checkOut - checkIn) / (1000 * 60));

    const updated = await getOne(`
      SELECT a.*, c.name as customer_name
      FROM attendance a
      JOIN customers c ON a.customer_id = c.id
      WHERE a.id = ?
    `, [attendance.id]);

    res.json({
      message: 'Check-out successful',
      attendance: {
        ...updated,
        duration_minutes: durationMinutes
      }
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ error: 'Failed to check out customer' });
  }
});

// Get customer attendance history
router.get('/history/:customerId', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { customerId } = req.params;
    const { limit = 50, start_date, end_date } = req.query;

    const customer = await getOne('SELECT * FROM customers WHERE id = ? AND gym_id = ?', [customerId, gymId]);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    let dateFilter = '';
    const params = [customerId, gymId];

    if (start_date) {
      dateFilter += ' AND date(a.check_in) >= ?';
      params.push(start_date);
    }
    if (end_date) {
      dateFilter += ' AND date(a.check_in) <= ?';
      params.push(end_date);
    }

    const history = await getAll(`
      SELECT
        a.*,
        ROUND((julianday(a.check_out) - julianday(a.check_in)) * 24 * 60) as duration_minutes
      FROM attendance a
      WHERE a.customer_id = ? AND a.gym_id = ? ${dateFilter}
      ORDER BY a.check_in DESC
      LIMIT ?
    `, [...params, parseInt(limit)]);

    const totalVisits = history.length;
    const completedVisits = history.filter(h => h.check_out);
    const totalMinutes = completedVisits.reduce((sum, v) => sum + (v.duration_minutes || 0), 0);
    const avgDuration = completedVisits.length > 0
      ? Math.round(totalMinutes / completedVisits.length)
      : 0;

    const thisMonthVisits = history.filter(h => {
      const checkIn = new Date(h.check_in);
      const now = new Date();
      return checkIn.getMonth() === now.getMonth() && checkIn.getFullYear() === now.getFullYear();
    });

    res.json({
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        membership_end: customer.membership_end
      },
      stats: {
        total_visits: totalVisits,
        this_month: thisMonthVisits.length,
        avg_duration_minutes: avgDuration
      },
      history
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to get attendance history' });
  }
});

// Get attendance statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;

    const todayStats = await getOne(`
      SELECT
        COUNT(*) as total_visits,
        SUM(CASE WHEN check_out IS NULL THEN 1 ELSE 0 END) as currently_present,
        SUM(CASE WHEN check_out IS NOT NULL THEN 1 ELSE 0 END) as completed
      FROM attendance
      WHERE gym_id = ? AND date(check_in) = date('now')
    `, [gymId]);

    const weeklyStats = await getOne(`
      SELECT
        COUNT(*) as total_visits,
        COUNT(DISTINCT customer_id) as unique_visitors
      FROM attendance
      WHERE gym_id = ? AND date(check_in) >= date('now', '-7 days')
    `, [gymId]);

    const monthlyStats = await getOne(`
      SELECT
        COUNT(*) as total_visits,
        COUNT(DISTINCT customer_id) as unique_visitors
      FROM attendance
      WHERE gym_id = ? AND strftime('%Y-%m', check_in) = strftime('%Y-%m', 'now')
    `, [gymId]);

    const dailyBreakdown = await getAll(`
      SELECT
        date(check_in) as date,
        COUNT(*) as visits,
        COUNT(DISTINCT customer_id) as unique_visitors
      FROM attendance
      WHERE gym_id = ? AND date(check_in) >= date('now', '-7 days')
      GROUP BY date(check_in)
      ORDER BY date DESC
    `, [gymId]);

    const peakHours = await getAll(`
      SELECT
        strftime('%H', check_in) as hour,
        COUNT(*) as visits
      FROM attendance
      WHERE gym_id = ? AND date(check_in) >= date('now', '-30 days')
      GROUP BY strftime('%H', check_in)
      ORDER BY visits DESC
      LIMIT 5
    `, [gymId]);

    res.json({
      today: {
        date: new Date().toISOString().split('T')[0],
        total_visits: todayStats?.total_visits || 0,
        currently_present: todayStats?.currently_present || 0,
        completed: todayStats?.completed || 0
      },
      weekly: {
        total_visits: weeklyStats?.total_visits || 0,
        unique_visitors: weeklyStats?.unique_visitors || 0
      },
      monthly: {
        total_visits: monthlyStats?.total_visits || 0,
        unique_visitors: monthlyStats?.unique_visitors || 0
      },
      daily_breakdown: dailyBreakdown,
      peak_hours: peakHours.map(p => ({
        hour: `${p.hour}:00`,
        visits: p.visits
      }))
    });
  } catch (error) {
    console.error('Get attendance stats error:', error);
    res.status(500).json({ error: 'Failed to get attendance statistics' });
  }
});

export default router;
