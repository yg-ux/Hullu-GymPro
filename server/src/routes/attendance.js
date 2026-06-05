import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getOne, getAll } from '../models/database.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Get today's attendance
router.get('/today', authenticateToken, (req, res) => {
  try {
    const gymId = req.user.gym_id;

    const todayAttendance = getAll(`
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

    // Separate checked in and currently present
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
router.get('/current', authenticateToken, (req, res) => {
  try {
    const gymId = req.user.gym_id;

    const currentlyPresent = getAll(`
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
router.post('/check-in', authenticateToken, (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { phone, customer_id } = req.body;

    if (!phone && !customer_id) {
      return res.status(400).json({ error: 'Phone number or customer ID is required' });
    }

    let customer;
    if (customer_id) {
      customer = getOne('SELECT * FROM customers WHERE id = ? AND gym_id = ?', [customer_id, gymId]);
    } else {
      customer = getOne('SELECT * FROM customers WHERE phone LIKE ? AND gym_id = ?', [`%${phone}%`, gymId]);
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
    const existingCheckIn = getOne(`
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

    runQuery(`
      INSERT INTO attendance (id, gym_id, customer_id, check_in)
      VALUES (?, ?, ?, ?)
    `, [attendanceId, gymId, customer.id, checkInTime]);

    const attendance = getOne(`
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
router.post('/check-out', authenticateToken, (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { customer_id, phone } = req.body;

    let attendance;
    let customer;

    if (customer_id) {
      attendance = getOne(`
        SELECT a.*, c.name as customer_name
        FROM attendance a
        JOIN customers c ON a.customer_id = c.id
        WHERE a.customer_id = ? AND a.gym_id = ? AND a.check_out IS NULL
        ORDER BY a.check_in DESC LIMIT 1
      `, [customer_id, gymId]);
    } else if (phone) {
      customer = getOne('SELECT * FROM customers WHERE phone LIKE ? AND gym_id = ?', [`%${phone}%`, gymId]);
      if (customer) {
        attendance = getOne(`
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
    runQuery('UPDATE attendance SET check_out = ? WHERE id = ?', [checkOutTime, attendance.id]);

    // Calculate duration
    const checkIn = new Date(attendance.check_in);
    const checkOut = new Date(checkOutTime);
    const durationMinutes = Math.round((checkOut - checkIn) / (1000 * 60));

    const updated = getOne(`
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
router.get('/history/:customerId', authenticateToken, (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { customerId } = req.params;
    const { limit = 50, start_date, end_date } = req.query;

    // Verify customer belongs to this gym
    const customer = getOne('SELECT * FROM customers WHERE id = ? AND gym_id = ?', [customerId, gymId]);
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

    const history = getAll(`
      SELECT
        a.*,
        ROUND((julianday(a.check_out) - julianday(a.check_in)) * 24 * 60) as duration_minutes
      FROM attendance a
      WHERE a.customer_id = ? AND a.gym_id = ? ${dateFilter}
      ORDER BY a.check_in DESC
      LIMIT ?
    `, [...params, parseInt(limit)]);

    // Calculate stats
    const totalVisits = history.length;
    const completedVisits = history.filter(h => h.check_out);
    const totalMinutes = completedVisits.reduce((sum, v) => sum + (v.duration_minutes || 0), 0);
    const avgDuration = completedVisits.length > 0
      ? Math.round(totalMinutes / completedVisits.length)
      : 0;

    // This month stats
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
router.get('/stats', authenticateToken, (req, res) => {
  try {
    const gymId = req.user.gym_id;

    // Today's stats
    const todayStats = getOne(`
      SELECT
        COUNT(*) as total_visits,
        SUM(CASE WHEN check_out IS NULL THEN 1 ELSE 0 END) as currently_present,
        SUM(CASE WHEN check_out IS NOT NULL THEN 1 ELSE 0 END) as completed
      FROM attendance
      WHERE gym_id = ? AND date(check_in) = date('now')
    `, [gymId]);

    // Weekly stats
    const weeklyStats = getOne(`
      SELECT
        COUNT(*) as total_visits,
        COUNT(DISTINCT customer_id) as unique_visitors
      FROM attendance
      WHERE gym_id = ? AND date(check_in) >= date('now', '-7 days')
    `, [gymId]);

    // Monthly stats
    const monthlyStats = getOne(`
      SELECT
        COUNT(*) as total_visits,
        COUNT(DISTINCT customer_id) as unique_visitors
      FROM attendance
      WHERE gym_id = ? AND strftime('%Y-%m', check_in) = strftime('%Y-%m', 'now')
    `, [gymId]);

    // Daily breakdown for last 7 days
    const dailyBreakdown = getAll(`
      SELECT
        date(check_in) as date,
        COUNT(*) as visits,
        COUNT(DISTINCT customer_id) as unique_visitors
      FROM attendance
      WHERE gym_id = ? AND date(check_in) >= date('now', '-7 days')
      GROUP BY date(check_in)
      ORDER BY date DESC
    `, [gymId]);

    // Peak hours (busiest times)
    const peakHours = getAll(`
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