import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getOne, getAll } from '../models/database.js';
import { authenticateToken, requireActiveSubscription } from './auth.js';

const router = express.Router();

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split('T')[0];
}

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
      WHERE a.gym_id = ? AND a.check_in::date = CURRENT_DATE
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

    // Block check-in if membership is frozen
    if (customer.is_frozen) {
      return res.status(400).json({
        error: `Membership is frozen until ${customer.frozen_until}. Please unfreeze first.`,
        customer: { id: customer.id, name: customer.name },
        frozen_until: customer.frozen_until,
      });
    }

    // Check if customer membership is valid
    const today = new Date();
    if (customer.membership_type === '3_days_week') {
      const sessionsLeft = (customer.total_sessions || 0) - (customer.sessions_used || 0);
      if (sessionsLeft <= 0) {
        return res.status(400).json({
          error: 'All sessions used up. Please renew the membership.',
          customer: { id: customer.id, name: customer.name },
          sessions_used: customer.sessions_used || 0,
          total_sessions: customer.total_sessions || 0,
        });
      }
      if (new Date(customer.membership_end) < today) {
        return res.status(400).json({
          error: 'Membership period has expired. Please renew.',
          customer: { id: customer.id, name: customer.name },
        });
      }
    } else if (customer.membership_type === 'daily') {
      const sessionsLeft = (customer.total_sessions || 0) - (customer.sessions_used || 0);
      if (sessionsLeft <= 0) {
        return res.status(400).json({
          error: 'No daily passes remaining. Please pay for a new visit first.',
          customer: { id: customer.id, name: customer.name },
          sessions_used: customer.sessions_used || 0,
          total_sessions: customer.total_sessions || 0,
        });
      }
    } else {
      if (new Date(customer.membership_end) < today) {
        return res.status(400).json({
          error: 'Customer membership has expired',
          customer: { id: customer.id, name: customer.name, membership_end: customer.membership_end }
        });
      }
    }
    const SESSION_TYPES = new Set(['3_days_week', 'daily']);

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

    // Increment session counter for session-based types
    if (SESSION_TYPES.has(customer.membership_type)) {
      const newUsed = (customer.sessions_used || 0) + 1;
      await runQuery('UPDATE customers SET sessions_used = ?, updated_at = NOW() WHERE id = ?', [newUsed, customer.id]);
      if (newUsed >= (customer.total_sessions || 0)) {
        await runQuery("UPDATE customers SET status = 'expired', updated_at = NOW() WHERE id = ?", [customer.id]);
      } else if ((customer.total_sessions || 0) - newUsed <= 3) {
        await runQuery("UPDATE customers SET status = 'expiring', updated_at = NOW() WHERE id = ?", [customer.id]);
      }
    }

    // Update weekly visit counter (reset if new week, then increment)
    if (customer.max_visits_per_week > 0) {
      const currentWeekStart = getWeekStart();
      const visitsThisWeek = customer.week_start_date !== currentWeekStart
        ? 1
        : (customer.visits_this_week || 0) + 1;
      await runQuery(
        'UPDATE customers SET visits_this_week = ?, week_start_date = ? WHERE id = ?',
        [visitsThisWeek, currentWeekStart, customer.id]
      );
    }

    const attendance = await getOne(`
      SELECT a.*, c.name as customer_name, c.phone as customer_phone,
             c.sessions_used, c.total_sessions, c.membership_type
      FROM attendance a
      JOIN customers c ON a.customer_id = c.id
      WHERE a.id = ?
    `, [attendanceId]);

    res.status(201).json({
      message: 'Check-in successful',
      attendance,
      sessions_remaining: SESSION_TYPES.has(customer.membership_type)
        ? Math.max(0, (attendance.total_sessions || 0) - (attendance.sessions_used || 0))
        : null,
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
      dateFilter += ' AND a.check_in::date >= ?::date';
      params.push(start_date);
    }
    if (end_date) {
      dateFilter += ' AND a.check_in::date <= ?::date';
      params.push(end_date);
    }

    const history = await getAll(`
      SELECT
        a.*,
        ROUND(EXTRACT(EPOCH FROM (a.check_out - a.check_in)) / 60)::integer as duration_minutes
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
      WHERE gym_id = ? AND check_in::date = CURRENT_DATE
    `, [gymId]);

    const weeklyStats = await getOne(`
      SELECT
        COUNT(*) as total_visits,
        COUNT(DISTINCT customer_id) as unique_visitors
      FROM attendance
      WHERE gym_id = ? AND check_in::date >= CURRENT_DATE - INTERVAL '7 days'
    `, [gymId]);

    const monthlyStats = await getOne(`
      SELECT
        COUNT(*) as total_visits,
        COUNT(DISTINCT customer_id) as unique_visitors
      FROM attendance
      WHERE gym_id = ? AND TO_CHAR(check_in, 'YYYY-MM') = TO_CHAR(NOW(), 'YYYY-MM')
    `, [gymId]);

    const dailyBreakdown = await getAll(`
      SELECT
        gs.day::date AS date,
        COALESCE(COUNT(a.id), 0) AS visits,
        COALESCE(COUNT(DISTINCT a.customer_id), 0) AS unique_visitors
      FROM generate_series(
        CURRENT_DATE - INTERVAL '6 days',
        CURRENT_DATE,
        '1 day'::interval
      ) AS gs(day)
      LEFT JOIN attendance a
        ON a.check_in::date = gs.day AND a.gym_id = ?
      GROUP BY gs.day
      ORDER BY gs.day ASC
    `, [gymId]);

    const peakHours = await getAll(`
      SELECT
        EXTRACT(HOUR FROM check_in AT TIME ZONE 'Africa/Addis_Ababa')::int AS hour,
        COUNT(*) as visits
      FROM attendance
      WHERE gym_id = ? AND check_in >= NOW() - INTERVAL '30 days'
      GROUP BY EXTRACT(HOUR FROM check_in AT TIME ZONE 'Africa/Addis_Ababa')::int
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
      peak_hours: peakHours.map(p => {
        const h = parseInt(p.hour, 10);
        const label = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
        return { hour: label, visits: parseInt(p.visits, 10) };
      })
    });
  } catch (error) {
    console.error('Get attendance stats error:', error);
    res.status(500).json({ error: 'Failed to get attendance statistics' });
  }
});

// Attendance heatmap — day-of-week (0=Sun..6=Sat) x hour-of-day (0..23) matrix
// Supports ?month=YYYY-MM to view any past month. Defaults to current local month.
// Times are converted to local gym timezone (GYM_TIMEZONE env, default Africa/Addis_Ababa).
router.get('/heatmap', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const tz = process.env.GYM_TIMEZONE || 'Africa/Addis_Ababa';

    // Determine target month (YYYY-MM). Default = current local month.
    let targetMonth = req.query.month;
    if (!targetMonth || !/^\d{4}-\d{2}$/.test(targetMonth)) {
      // Get current month in local timezone from DB
      const row = await getOne(
        `SELECT TO_CHAR(NOW() AT TIME ZONE $1, 'YYYY-MM') AS month`,
        [tz]
      );
      targetMonth = row.month;
    }

    // Build the 7×24 matrix for the requested month
    const rows = await getAll(`
      SELECT
        EXTRACT(DOW  FROM check_in AT TIME ZONE $1)::int AS dow,
        EXTRACT(HOUR FROM check_in AT TIME ZONE $1)::int AS hour,
        COUNT(*)::int AS count
      FROM attendance
      WHERE gym_id = $2
        AND TO_CHAR(check_in AT TIME ZONE $1, 'YYYY-MM') = $3
      GROUP BY dow, hour
      ORDER BY dow, hour
    `, [tz, gymId, targetMonth]);

    const matrix = Array.from({ length: 7 }, () => Array(24).fill(0));
    let max = 0;
    for (const r of rows) {
      const d = r.dow;
      const h = r.hour;
      const c = r.count;
      if (d >= 0 && d < 7 && h >= 0 && h < 24) {
        matrix[d][h] = c;
        if (c > max) max = c;
      }
    }

    // Available months that have any check-in data (for dropdown), newest first
    const monthRows = await getAll(`
      SELECT DISTINCT TO_CHAR(check_in AT TIME ZONE $1, 'YYYY-MM') AS month
      FROM attendance
      WHERE gym_id = $2
      ORDER BY month DESC
      LIMIT 36
    `, [tz, gymId]);
    const availableMonths = monthRows.map(r => r.month);

    res.json({ month: targetMonth, matrix, max, availableMonths });
  } catch (error) {
    console.error('Get heatmap error:', error);
    res.status(500).json({ error: 'Failed to get attendance heatmap' });
  }
});

export default router;
