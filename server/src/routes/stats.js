import express from 'express';
import { getOne, getAll } from '../models/database.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

function checkPremiumFeature(gym) {
  return gym.subscription_plan === 'pro' || gym.subscription_plan === 'enterprise';
}

// Get dashboard stats for this gym
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;

    const totalCustomersResult = await getOne('SELECT COUNT(*) as count FROM customers WHERE gym_id = ?', [gymId]);
    const totalCustomers = totalCustomersResult?.count || 0;

    const activeResult = await getOne(`
      SELECT COUNT(*) as count FROM customers
      WHERE gym_id = ? AND membership_end::date >= CURRENT_DATE
    `, [gymId]);
    const activeCustomers = activeResult?.count || 0;

    const expiringResult = await getOne(`
      SELECT COUNT(*) as count FROM customers
      WHERE gym_id = ? AND membership_end::date > CURRENT_DATE AND membership_end::date <= CURRENT_DATE + INTERVAL '7 days'
    `, [gymId]);
    const expiringSoon = expiringResult?.count || 0;

    const expiredResult = await getOne(`
      SELECT COUNT(*) as count FROM customers
      WHERE gym_id = ? AND membership_end::date < CURRENT_DATE
    `, [gymId]);
    const expiredCustomers = expiredResult?.count || 0;

    const todayRevenueResult = await getOne(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments
      WHERE gym_id = ? AND payment_date::date = CURRENT_DATE
    `, [gymId]);
    const todayRevenue = todayRevenueResult?.total || 0;

    const monthRevenueResult = await getOne(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments
      WHERE gym_id = ? AND TO_CHAR(payment_date::date, 'YYYY-MM') = TO_CHAR(NOW(), 'YYYY-MM')
    `, [gymId]);
    const monthRevenue = monthRevenueResult?.total || 0;

    const last30DaysResult = await getOne(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments
      WHERE gym_id = ? AND payment_date::date >= CURRENT_DATE - INTERVAL '30 days'
    `, [gymId]);
    const last30DaysRevenue = last30DaysResult?.total || 0;

    const allTimeRevenueResult = await getOne(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE gym_id = ?
    `, [gymId]);
    const allTimeRevenue = allTimeRevenueResult?.total || 0;

    const allTimePaymentsResult = await getOne(`
      SELECT COUNT(*) as count FROM payments WHERE gym_id = ?
    `, [gymId]);
    const allTimePayments = allTimePaymentsResult?.count || 0;

    const newThisMonthResult = await getOne(`
      SELECT COUNT(*) as count FROM customers
      WHERE gym_id = ? AND TO_CHAR(created_at, 'YYYY-MM') = TO_CHAR(NOW(), 'YYYY-MM')
    `, [gymId]);
    const newThisMonth = newThisMonthResult?.count || 0;

    const recentPayments = await getAll(`
      SELECT p.*, c.name as customer_name
      FROM payments p
      LEFT JOIN customers c ON p.customer_id = c.id
      WHERE p.gym_id = ?
      ORDER BY p.created_at DESC LIMIT 10
    `, [gymId]);

    const membershipDistribution = await getAll(`
      SELECT membership_type, COUNT(*) as count
      FROM customers
      WHERE gym_id = ? AND membership_end::date >= CURRENT_DATE
      GROUP BY membership_type
    `, [gymId]);

    const monthlyTrend = await getAll(`
      SELECT
        TO_CHAR(payment_date::date, 'YYYY-MM') as month,
        SUM(amount) as total,
        COUNT(*) as count
      FROM payments
      WHERE gym_id = ? AND payment_date::date >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(payment_date::date, 'YYYY-MM')
      ORDER BY month
    `, [gymId]);

    const topCustomers = await getAll(`
      SELECT c.*, SUM(p.amount) as total_paid
      FROM customers c
      JOIN payments p ON c.id = p.customer_id AND p.gym_id = ?
      WHERE c.gym_id = ?
      GROUP BY c.id
      ORDER BY total_paid DESC
      LIMIT 10
    `, [gymId, gymId]);

    const paymentMethods = await getAll(`
      SELECT payment_method, COUNT(*) as count, SUM(amount) as total
      FROM payments
      WHERE gym_id = ?
      GROUP BY payment_method
    `, [gymId]);

    const genderBreakdown = await getAll(`
      SELECT
        COALESCE(gender, 'unknown') as gender,
        COUNT(*) as count
      FROM customers
      WHERE gym_id = ?
      GROUP BY COALESCE(gender, 'unknown')
    `, [gymId]);

    res.json({
      overview: {
        total_customers: totalCustomers,
        active_customers: activeCustomers,
        expiring_soon: expiringSoon,
        expired: expiredCustomers
      },
      revenue: {
        today: todayRevenue,
        this_month: monthRevenue,
        last_30_days: last30DaysRevenue,
        all_time: allTimeRevenue,
        all_time_count: allTimePayments
      },
      new_this_month: newThisMonth,
      recent_payments: recentPayments,
      membership_distribution: membershipDistribution,
      monthly_trend: monthlyTrend,
      top_customers: topCustomers,
      payment_methods: paymentMethods,
      gender_breakdown: genderBreakdown
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Export data
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;

    const gym = await getOne('SELECT subscription_plan FROM gyms WHERE id = ?', [gymId]);
    if (!gym || !checkPremiumFeature(gym)) {
      return res.status(403).json({ error: 'Data export requires Pro plan', requires_plan: 'pro' });
    }

    const customers = await getAll('SELECT * FROM customers WHERE gym_id = ? ORDER BY name', [gymId]);
    const payments = await getAll(`
      SELECT p.*, c.name as customer_name
      FROM payments p
      LEFT JOIN customers c ON p.customer_id = c.id
      WHERE p.gym_id = ?
      ORDER BY p.payment_date DESC
    `, [gymId]);

    const allTimeRevenueRow = await getOne('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE gym_id = ?', [gymId]);
    const allTimeRevenue = allTimeRevenueRow?.total || 0;

    res.json({
      export_date: new Date().toISOString(),
      gym_id: gymId,
      customers,
      payments,
      summary: {
        total_customers: customers.length,
        total_payments: payments.length,
        total_revenue: allTimeRevenue
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Reports endpoint for detailed analytics
router.get('/reports', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;

    const gym = await getOne('SELECT subscription_plan FROM gyms WHERE id = ?', [gymId]);
    if (!gym || !checkPremiumFeature(gym)) {
      return res.status(403).json({ error: 'Reports require Pro plan', requires_plan: 'pro' });
    }

    const range = req.query.range || 'this_month';
    const startDateParam = req.query.start_date;
    const endDateParam = req.query.end_date;

    let dateFilter = '';
    // Custom date range takes priority
    if (startDateParam && endDateParam) {
      dateFilter = `payment_date::date BETWEEN '${startDateParam}' AND '${endDateParam}'`;
    } else {
      switch (range) {
        case 'this_week':
          dateFilter = "payment_date::date >= CURRENT_DATE - INTERVAL '7 days'";
          break;
        case 'last_month':
          dateFilter = "TO_CHAR(payment_date::date, 'YYYY-MM') = TO_CHAR(NOW() - INTERVAL '1 month', 'YYYY-MM')";
          break;
        case 'last_3_months':
          dateFilter = "payment_date::date >= CURRENT_DATE - INTERVAL '3 months'";
          break;
        case 'last_6_months':
          dateFilter = "payment_date::date >= CURRENT_DATE - INTERVAL '6 months'";
          break;
        case 'this_year':
          dateFilter = "TO_CHAR(payment_date::date, 'YYYY') = TO_CHAR(NOW(), 'YYYY')";
          break;
        case 'all_time':
          dateFilter = '1=1';
          break;
        default:
          dateFilter = "TO_CHAR(payment_date::date, 'YYYY-MM') = TO_CHAR(NOW(), 'YYYY-MM')";
      }
    }

    const revenueResult = await getOne(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE gym_id = ? AND ${dateFilter}
    `, [gymId]);
    const totalRevenue = revenueResult?.total || 0;

    const paymentCountResult = await getOne(`
      SELECT COUNT(*) as count
      FROM payments
      WHERE gym_id = ? AND ${dateFilter}
    `, [gymId]);
    const paymentCount = paymentCountResult?.count || 0;

    const avgTransaction = paymentCount > 0 ? totalRevenue / paymentCount : 0;

    const revenueByMethod = await getAll(`
      SELECT
        COALESCE(payment_method, 'cash') as method,
        SUM(amount) as total,
        COUNT(*) as count
      FROM payments
      WHERE gym_id = ? AND ${dateFilter}
      GROUP BY payment_method
      ORDER BY total DESC
    `, [gymId]);

    const monthlySummary = await getAll(`
      SELECT month, total, count FROM (
        SELECT
          TO_CHAR(payment_date::date, 'YYYY-MM') as month,
          SUM(amount) as total,
          COUNT(*) as count
        FROM payments
        WHERE gym_id = ? AND payment_date::date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY TO_CHAR(payment_date::date, 'YYYY-MM')
        ORDER BY month DESC
        LIMIT 12
      ) t ORDER BY month ASC
    `, [gymId]);

    const maxMonth = monthlySummary.length > 0 ? Math.max(...monthlySummary.map(m => m.total)) : 1;

    const activeMembersResult = await getOne(`
      SELECT COUNT(*) as count FROM customers
      WHERE gym_id = ? AND membership_end::date >= CURRENT_DATE
    `, [gymId]);
    const activeMembers = activeMembersResult?.count || 0;

    let newMembersFilter = "TO_CHAR(created_at, 'YYYY-MM') = TO_CHAR(NOW(), 'YYYY-MM')";
    if (range === 'this_week') {
      newMembersFilter = "created_at::date >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (range === 'this_year' || range === 'all_time') {
      newMembersFilter = '1=1';
    }

    const newMembersResult = await getOne(`
      SELECT COUNT(*) as count FROM customers WHERE gym_id = ? AND ${newMembersFilter}
    `, [gymId]);
    const newMembers = newMembersResult?.count || 0;

    const membershipBreakdown = await getAll(`
      SELECT
        membership_type as type,
        COUNT(*) as count
      FROM customers
      WHERE gym_id = ? AND membership_end::date >= CURRENT_DATE
      GROUP BY membership_type
    `, [gymId]);

    const attendanceData = await getAll(`
      SELECT
        check_in::date as date,
        COUNT(*) as count
      FROM attendance
      WHERE gym_id = ? AND check_in::date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY check_in::date
      ORDER BY date DESC
    `, [gymId]);

    const totalCheckIns = attendanceData.reduce((sum, d) => sum + parseInt(d.count), 0);
    const avgDaily = attendanceData.length > 0 ? Math.round(totalCheckIns / attendanceData.length) : 0;
    const peakDay = attendanceData.length > 0
      ? attendanceData.reduce((max, d) => parseInt(d.count) > parseInt(max.count) ? d : max).date
      : 'N/A';

    const busiestHourResult = await getOne(`
      SELECT TO_CHAR(check_in, 'HH24') as hour, COUNT(*) as count
      FROM attendance
      WHERE gym_id = ? AND check_in::date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY TO_CHAR(check_in, 'HH24')
      ORDER BY count DESC
      LIMIT 1
    `, [gymId]);
    const busiestHour = busiestHourResult ? `${busiestHourResult.hour}:00` : 'N/A';

    const topCustomers = await getAll(`
      SELECT
        c.id,
        c.name,
        c.phone,
        c.email,
        c.membership_type,
        c.membership_start,
        c.membership_end,
        COALESCE(SUM(p.amount), 0) as total_paid,
        COUNT(p.id) as payment_count,
        MAX(p.payment_date) as last_payment_date
      FROM customers c
      LEFT JOIN payments p ON c.id = p.customer_id AND p.gym_id = ?
      WHERE c.gym_id = ?
      GROUP BY c.id
      ORDER BY total_paid DESC
      LIMIT 20
    `, [gymId, gymId]);

    const revenueByPlan = await getAll(`
      SELECT c.membership_type as type, SUM(p.amount) as total, COUNT(p.id) as count
      FROM payments p
      JOIN customers c ON p.customer_id = c.id
      WHERE p.gym_id = ? AND ${dateFilter}
      GROUP BY c.membership_type
      ORDER BY total DESC
    `, [gymId]);

    let previousPeriodFilter = '';
    switch (range) {
      case 'this_week':
        previousPeriodFilter = "payment_date::date >= CURRENT_DATE - INTERVAL '14 days' AND payment_date::date < CURRENT_DATE - INTERVAL '7 days'";
        break;
      case 'this_month':
        previousPeriodFilter = "TO_CHAR(payment_date::date, 'YYYY-MM') = TO_CHAR(NOW() - INTERVAL '1 month', 'YYYY-MM')";
        break;
      case 'last_month':
        previousPeriodFilter = "TO_CHAR(payment_date::date, 'YYYY-MM') = TO_CHAR(NOW() - INTERVAL '2 months', 'YYYY-MM')";
        break;
      case 'last_3_months':
        previousPeriodFilter = "payment_date::date >= CURRENT_DATE - INTERVAL '6 months' AND payment_date::date < CURRENT_DATE - INTERVAL '3 months'";
        break;
      case 'last_6_months':
        previousPeriodFilter = "payment_date::date >= CURRENT_DATE - INTERVAL '12 months' AND payment_date::date < CURRENT_DATE - INTERVAL '6 months'";
        break;
      default:
        previousPeriodFilter = dateFilter;
    }

    const previousRevenueResult = await getOne(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE gym_id = ? AND ${previousPeriodFilter}
    `, [gymId]);
    const previousRevenue = previousRevenueResult?.total || 0;

    const revenueTrend = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    res.json({
      revenue: {
        total: totalRevenue,
        average: Math.round(avgTransaction),
        maxMonth,
        trend: Math.round(revenueTrend * 10) / 10,
        avgTrend: Math.round(revenueTrend * 10) / 10
      },
      payments: {
        count: paymentCount,
        trend: Math.round(revenueTrend * 10) / 10
      },
      members: {
        active: activeMembers,
        new: newMembers,
        renewals: membershipBreakdown.reduce((sum, m) => sum + parseInt(m.count), 0),
        trend: 0,
        newTrend: 0
      },
      monthly_summary: monthlySummary,
      revenue_by_method: revenueByMethod,
      membership_breakdown: membershipBreakdown,
      revenue_by_plan: revenueByPlan,
      attendance: {
        total: totalCheckIns,
        daily: attendanceData,
        avg_daily: avgDaily,
        peak_day: peakDay,
        busiest_hour: busiestHour
      },
      top_customers: topCustomers
    });
  } catch (error) {
    console.error('Reports error:', error);
    res.status(500).json({ error: 'Failed to get reports' });
  }
});

// ── GET /api/stats/activity ──────────────────────────────────────────────────
// Returns today's activity feed: check-ins, new members, payments — merged & sorted
router.get('/activity', authenticateToken, async (req, res) => {
  const gymId = req.user.gym_id;
  if (!gymId) return res.status(403).json({ error: 'Gym access required' });
  try {
    const [checkIns, newMembers, payments] = await Promise.all([
      // Today's check-ins
      getAll(`
        SELECT
          a.id, 'check_in' AS type,
          c.name AS customer_name,
          a.check_in AS event_time,
          NULL AS amount,
          c.membership_type
        FROM attendance a
        JOIN customers c ON a.customer_id = c.id
        WHERE a.gym_id = ?
          AND a.check_in::date = CURRENT_DATE
        ORDER BY a.check_in DESC
        LIMIT 30
      `, [gymId]),

      // Today's new member registrations
      getAll(`
        SELECT
          id, 'new_member' AS type,
          name AS customer_name,
          created_at AS event_time,
          NULL AS amount,
          membership_type
        FROM customers
        WHERE gym_id = ?
          AND created_at::date = CURRENT_DATE
        ORDER BY created_at DESC
        LIMIT 10
      `, [gymId]),

      // Today's payments
      getAll(`
        SELECT
          p.id, 'payment' AS type,
          c.name AS customer_name,
          p.created_at AS event_time,
          p.amount,
          p.membership_type
        FROM payments p
        JOIN customers c ON p.customer_id = c.id
        WHERE p.gym_id = ?
          AND p.created_at::date = CURRENT_DATE
        ORDER BY p.created_at DESC
        LIMIT 10
      `, [gymId]),
    ]);

    // Merge and sort newest first
    const feed = [...checkIns, ...newMembers, ...payments]
      .sort((a, b) => new Date(b.event_time) - new Date(a.event_time))
      .slice(0, 30);

    res.json(feed);
  } catch (error) {
    console.error('Activity feed error:', error);
    res.status(500).json({ error: 'Failed to load activity feed' });
  }
});

// Get revenue stats for revenue page
router.get('/revenue', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;

    const gym = await getOne('SELECT subscription_plan FROM gyms WHERE id = ?', [gymId]);
    if (!gym || !checkPremiumFeature(gym)) {
      return res.status(403).json({ error: 'Revenue analytics require Pro plan', requires_plan: 'pro' });
    }

    const totalResult = await getOne(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE gym_id = ?
    `, [gymId]);

    const monthResult = await getOne(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments
      WHERE gym_id = ? AND TO_CHAR(payment_date::date, 'YYYY-MM') = TO_CHAR(NOW(), 'YYYY-MM')
    `, [gymId]);

    const weekResult = await getOne(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments
      WHERE gym_id = ? AND payment_date::date >= CURRENT_DATE - INTERVAL '7 days'
    `, [gymId]);

    const todayResult = await getOne(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments
      WHERE gym_id = ? AND payment_date::date = CURRENT_DATE
    `, [gymId]);

    const paymentMethods = await getAll(`
      SELECT COALESCE(payment_method, 'cash') as payment_method, COUNT(*) as count, SUM(amount) as total
      FROM payments WHERE gym_id = ? GROUP BY payment_method
    `, [gymId]);

    const topCustomers = await getAll(`
      SELECT c.id, c.name, COALESCE(SUM(p.amount), 0) as total_spent, COUNT(p.id) as payment_count
      FROM customers c
      LEFT JOIN payments p ON c.id = p.customer_id AND p.gym_id = ?
      WHERE c.gym_id = ?
      GROUP BY c.id ORDER BY total_spent DESC LIMIT 10
    `, [gymId, gymId]);

    const recentTransactions = await getAll(`
      SELECT p.id, p.customer_id, c.name as customer_name, p.amount, p.payment_date, p.payment_method
      FROM payments p
      LEFT JOIN customers c ON p.customer_id = c.id
      WHERE p.gym_id = ?
      ORDER BY p.payment_date DESC LIMIT 10
    `, [gymId]);

    const monthlyTrend = await getAll(`
      SELECT TO_CHAR(payment_date::date, 'YYYY-MM') as label, SUM(amount) as total, COUNT(*) as count
      FROM payments
      WHERE gym_id = ? AND payment_date::date >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(payment_date::date, 'YYYY-MM')
      ORDER BY label
    `, [gymId]);

    const dailyTrend = await getAll(`
      SELECT payment_date::date as label, SUM(amount) as total, COUNT(*) as count
      FROM payments
      WHERE gym_id = ? AND payment_date::date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY payment_date::date
      ORDER BY label
    `, [gymId]);

    const weeklyTrend = await getAll(`
      SELECT TO_CHAR(payment_date::date, 'IYYY-"W"IW') as label, SUM(amount) as total, COUNT(*) as count
      FROM payments
      WHERE gym_id = ? AND payment_date::date >= CURRENT_DATE - INTERVAL '91 days'
      GROUP BY TO_CHAR(payment_date::date, 'IYYY-"W"IW')
      ORDER BY label
    `, [gymId]);

    const yearlyTrend = await getAll(`
      SELECT TO_CHAR(payment_date::date, 'YYYY') as label, SUM(amount) as total, COUNT(*) as count
      FROM payments
      WHERE gym_id = ?
      GROUP BY TO_CHAR(payment_date::date, 'YYYY')
      ORDER BY label
    `, [gymId]);

    const [lastMonthResult, lastWeekResult, yesterdayResult, forecastResult, prevPeriodResult, projCountResult] = await Promise.all([
      getOne(`SELECT COALESCE(SUM(amount), 0) as total FROM payments
        WHERE gym_id = ? AND TO_CHAR(payment_date::date, 'YYYY-MM') = TO_CHAR(NOW() - INTERVAL '1 month', 'YYYY-MM')`, [gymId]),
      getOne(`SELECT COALESCE(SUM(amount), 0) as total FROM payments
        WHERE gym_id = ? AND payment_date::date >= CURRENT_DATE - INTERVAL '14 days' AND payment_date::date < CURRENT_DATE - INTERVAL '7 days'`, [gymId]),
      getOne(`SELECT COALESCE(SUM(amount), 0) as total FROM payments
        WHERE gym_id = ? AND payment_date::date = CURRENT_DATE - INTERVAL '1 day'`, [gymId]),
      getOne(`SELECT COALESCE(SUM(amount), 0) as total FROM payments
        WHERE gym_id = ? AND payment_date::date >= CURRENT_DATE - INTERVAL '30 days'`, [gymId]),
      getOne(`SELECT COALESCE(SUM(amount), 0) as total FROM payments
        WHERE gym_id = ? AND payment_date::date >= CURRENT_DATE - INTERVAL '60 days' AND payment_date::date < CURRENT_DATE - INTERVAL '30 days'`, [gymId]),
      getOne(`SELECT COUNT(*) as count FROM payments
        WHERE gym_id = ? AND payment_date::date >= CURRENT_DATE - INTERVAL '30 days'`, [gymId]),
    ]);

    const monthlyAvg = forecastResult?.total || 0;
    const prevPeriodAvg = prevPeriodResult?.total || 0;
    const growthRate = prevPeriodAvg > 0
      ? Math.round(((monthlyAvg - prevPeriodAvg) / prevPeriodAvg) * 1000) / 10
      : 0;
    const projectedPayments = Math.round((projCountResult?.count || 0) * 1.05);

    res.json({
      total_revenue: totalResult?.total || 0,
      this_month: monthResult?.total || 0,
      last_month: lastMonthResult?.total || 0,
      this_week: weekResult?.total || 0,
      last_week: lastWeekResult?.total || 0,
      today: todayResult?.total || 0,
      yesterday: yesterdayResult?.total || 0,
      payment_methods: paymentMethods,
      top_customers: topCustomers,
      recent_transactions: recentTransactions,
      monthly_trend: monthlyTrend,
      daily_trend: dailyTrend,
      weekly_trend: weeklyTrend,
      yearly_trend: yearlyTrend,
      forecast: {
        predicted_revenue: Math.round(monthlyAvg * 1.05),
        growth_rate: growthRate,
        projected_payments: projectedPayments
      }
    });
  } catch (error) {
    console.error('Revenue stats error:', error);
    res.status(500).json({ error: 'Failed to get revenue stats' });
  }
});

// ── GET /api/stats/forecast ──────────────────────────────────────────────────
// Revenue forecasting: upcoming renewals + projected revenue for next 30/60/90 days
router.get('/forecast', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;

    // Members expiring in next 90 days — partitioned into 30/60/90 buckets
    const expiringAll90 = await getAll(`
      SELECT id, name, phone, membership_type, membership_end, status,
        FLOOR(EXTRACT(EPOCH FROM (membership_end::timestamp - NOW())) / 86400)::integer as days_left
      FROM customers
      WHERE gym_id = ?
        AND membership_end::date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
        AND status NOT IN ('inactive', 'frozen')
        AND membership_type != 'daily'
      ORDER BY membership_end ASC
    `, [gymId]);

    const expiringNext30 = expiringAll90.filter(m => (m.days_left || 0) <= 30);
    const expiringNext60 = { count: expiringAll90.filter(m => (m.days_left || 0) <= 60).length };
    const expiringNext90 = { count: expiringAll90.length };

    // Average revenue per membership type from last 90 days
    const avgByType = await getAll(`
      SELECT membership_type, AVG(amount) as avg_amount, COUNT(*) as count
      FROM payments
      WHERE gym_id = ? AND created_at >= NOW() - INTERVAL '90 days'
      GROUP BY membership_type
    `, [gymId]);

    const typeAvgMap = {};
    for (const r of avgByType) typeAvgMap[r.membership_type] = parseFloat(r.avg_amount) || 0;

    // Calculate projected revenue from expiring members (assume 70% renewal rate)
    const RENEWAL_RATE = 0.70;
    let projected30 = 0, projected60 = 0, projected90 = 0;
    for (const m of expiringAll90) {
      const avg = typeAvgMap[m.membership_type] || 0;
      const daysLeft = m.days_left || 0;
      if (daysLeft <= 30) projected30 += avg * RENEWAL_RATE;
      if (daysLeft <= 60) projected60 += avg * RENEWAL_RATE;
      if (daysLeft <= 90) projected90 += avg * RENEWAL_RATE;
    }

    // Historical monthly revenue for trend
    const historicalMonthly = await getAll(`
      SELECT TO_CHAR(payment_date::date, 'YYYY-MM') as month, SUM(amount) as total
      FROM payments WHERE gym_id = ?
        AND payment_date::date >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY TO_CHAR(payment_date::date, 'YYYY-MM')
      ORDER BY month ASC
    `, [gymId]);

    // At-risk revenue = members expiring in 7 days who haven't been seen in 14+ days
    const atRisk = await getAll(`
      SELECT c.id, c.name, c.phone, c.membership_type, c.membership_end,
        FLOOR(EXTRACT(EPOCH FROM (c.membership_end::timestamp - NOW())) / 86400)::integer as days_left,
        MAX(a.check_in) as last_visit
      FROM customers c
      LEFT JOIN attendance a ON a.customer_id = c.id AND a.gym_id = c.gym_id
      WHERE c.gym_id = ?
        AND c.membership_end::date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
        AND c.status NOT IN ('inactive', 'frozen')
      GROUP BY c.id, c.name, c.phone, c.membership_type, c.membership_end
      HAVING (MAX(a.check_in) IS NULL OR MAX(a.check_in) < NOW() - INTERVAL '14 days')
      ORDER BY c.membership_end ASC
      LIMIT 20
    `, [gymId]);

    const atRiskRevenue = atRisk.reduce((sum, m) => sum + (typeAvgMap[m.membership_type] || 0) * RENEWAL_RATE, 0);

    res.json({
      expiring: {
        next_30: { members: expiringNext30, count: expiringNext30.length, projected_revenue: Math.round(projected30) },
        next_60: { count: parseInt(expiringNext60?.count || 0), projected_revenue: Math.round(projected60) },
        next_90: { count: parseInt(expiringNext90?.count || 0), projected_revenue: Math.round(projected90) },
      },
      at_risk: { members: atRisk, count: atRisk.length, at_risk_revenue: Math.round(atRiskRevenue) },
      historical_monthly: historicalMonthly,
      renewal_rate_assumption: RENEWAL_RATE,
      avg_by_type: typeAvgMap,
    });
  } catch (error) {
    console.error('Forecast error:', error);
    res.status(500).json({ error: 'Failed to get forecast' });
  }
});

// ── GET /api/stats/retention ─────────────────────────────────────────────────
// Smart retention: inactive active members, churn risk, win-back candidates
router.get('/retention', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;

    // Members who visited 2+ weeks ago and haven't renewed (still active)
    const inactive14 = await getAll(`
      SELECT c.id, c.name, c.phone, c.photo, c.membership_type, c.membership_end, c.status,
        MAX(a.check_in) as last_visit,
        FLOOR(EXTRACT(EPOCH FROM (NOW() - MAX(a.check_in))) / 86400)::integer as days_since_visit,
        FLOOR(EXTRACT(EPOCH FROM (c.membership_end::timestamp - NOW())) / 86400)::integer as days_until_expiry
      FROM customers c
      LEFT JOIN attendance a ON a.customer_id = c.id AND a.gym_id = c.gym_id
      WHERE c.gym_id = ? AND c.status IN ('active', 'expiring')
      GROUP BY c.id, c.name, c.phone, c.photo, c.membership_type, c.membership_end, c.status
      HAVING MAX(a.check_in) < NOW() - INTERVAL '14 days'
      ORDER BY last_visit ASC NULLS FIRST
      LIMIT 30
    `, [gymId]);

    // Expired members who might come back (expired in last 60 days)
    const winBack = await getAll(`
      SELECT c.id, c.name, c.phone, c.photo, c.membership_type, c.membership_end,
        MAX(a.check_in) as last_visit,
        FLOOR(EXTRACT(EPOCH FROM (NOW() - c.membership_end::timestamp)) / 86400)::integer as days_expired
      FROM customers c
      LEFT JOIN attendance a ON a.customer_id = c.id AND a.gym_id = c.gym_id
      WHERE c.gym_id = ? AND c.status = 'expired'
        AND c.membership_end::date >= CURRENT_DATE - INTERVAL '60 days'
      GROUP BY c.id, c.name, c.phone, c.photo, c.membership_type, c.membership_end
      ORDER BY c.membership_end DESC
      LIMIT 20
    `, [gymId]);

    // Churn rate: expired vs active this month vs last month
    const thisMonthExpired = await getOne(`
      SELECT COUNT(*) as count FROM customers
      WHERE gym_id = ? AND status = 'expired'
        AND TO_CHAR(membership_end::date, 'YYYY-MM') = TO_CHAR(NOW(), 'YYYY-MM')
    `, [gymId]);

    const lastMonthExpired = await getOne(`
      SELECT COUNT(*) as count FROM customers
      WHERE gym_id = ? AND status = 'expired'
        AND TO_CHAR(membership_end::date, 'YYYY-MM') = TO_CHAR(NOW() - INTERVAL '1 month', 'YYYY-MM')
    `, [gymId]);

    const totalActive = await getOne(`SELECT COUNT(*) as count FROM customers WHERE gym_id = ? AND status IN ('active', 'expiring')`, [gymId]);

    // Members expiring in the next 7 days
    const expiringSoon = await getAll(`
      SELECT c.id, c.name, c.phone, c.membership_type, c.membership_end,
        FLOOR(EXTRACT(EPOCH FROM (c.membership_end::timestamp - NOW())) / 86400)::integer as days_until_expiry,
        MAX(a.check_in) as last_visit,
        FLOOR(EXTRACT(EPOCH FROM (NOW() - MAX(a.check_in))) / 86400)::integer as days_since_visit
      FROM customers c
      LEFT JOIN attendance a ON a.customer_id = c.id AND a.gym_id = c.gym_id
      WHERE c.gym_id = ?
        AND c.membership_end::date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
        AND c.status IN ('active', 'expiring')
      GROUP BY c.id, c.name, c.phone, c.membership_type, c.membership_end
      ORDER BY c.membership_end ASC
      LIMIT 20
    `, [gymId]);

    res.json({
      inactive: { members: inactive14, count: inactive14.length },
      win_back: { members: winBack, count: winBack.length },
      expiring_soon: { members: expiringSoon, count: expiringSoon.length },
      churn: {
        this_month: parseInt(thisMonthExpired?.count || 0),
        last_month: parseInt(lastMonthExpired?.count || 0),
        total_active: parseInt(totalActive?.count || 0),
      },
    });
  } catch (error) {
    console.error('Retention error:', error);
    res.status(500).json({ error: 'Failed to get retention data' });
  }
});

export default router;
