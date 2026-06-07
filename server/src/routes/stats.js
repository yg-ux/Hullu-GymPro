import express from 'express';
import { getOne, getAll } from '../models/database.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Get dashboard stats for this gym
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;

    const totalCustomersResult = await getOne('SELECT COUNT(*) as count FROM customers WHERE gym_id = ?', [gymId]);
    const totalCustomers = totalCustomersResult?.count || 0;

    const activeResult = await getOne(`
      SELECT COUNT(*) as count FROM customers
      WHERE gym_id = ? AND date(membership_end) >= date('now')
    `, [gymId]);
    const activeCustomers = activeResult?.count || 0;

    const expiringResult = await getOne(`
      SELECT COUNT(*) as count FROM customers
      WHERE gym_id = ? AND date(membership_end) > date('now') AND date(membership_end) <= date('now', '+7 days')
    `, [gymId]);
    const expiringSoon = expiringResult?.count || 0;

    const expiredResult = await getOne(`
      SELECT COUNT(*) as count FROM customers
      WHERE gym_id = ? AND date(membership_end) < date('now')
    `, [gymId]);
    const expiredCustomers = expiredResult?.count || 0;

    const todayRevenueResult = await getOne(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments
      WHERE gym_id = ? AND date(payment_date) = date('now')
    `, [gymId]);
    const todayRevenue = todayRevenueResult?.total || 0;

    const monthRevenueResult = await getOne(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments
      WHERE gym_id = ? AND strftime('%Y-%m', payment_date) = strftime('%Y-%m', 'now')
    `, [gymId]);
    const monthRevenue = monthRevenueResult?.total || 0;

    const last30DaysResult = await getOne(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments
      WHERE gym_id = ? AND date(payment_date) >= date('now', '-30 days')
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
      WHERE gym_id = ? AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
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
      WHERE gym_id = ? AND date(membership_end) >= date('now')
      GROUP BY membership_type
    `, [gymId]);

    const monthlyTrend = await getAll(`
      SELECT
        strftime('%Y-%m', payment_date) as month,
        SUM(amount) as total,
        COUNT(*) as count
      FROM payments
      WHERE gym_id = ? AND date(payment_date) >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', payment_date)
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
      payment_methods: paymentMethods
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
    const range = req.query.range || 'this_month';

    let dateFilter = '';
    switch (range) {
      case 'this_week':
        dateFilter = "date(payment_date) >= date('now', '-7 days')";
        break;
      case 'last_month':
        dateFilter = "strftime('%Y-%m', payment_date) = strftime('%Y-%m', 'now', '-1 month')";
        break;
      case 'last_3_months':
        dateFilter = "date(payment_date) >= date('now', '-3 months')";
        break;
      case 'last_6_months':
        dateFilter = "date(payment_date) >= date('now', '-6 months')";
        break;
      case 'this_year':
        dateFilter = "strftime('%Y', payment_date) = strftime('%Y', 'now')";
        break;
      case 'all_time':
        dateFilter = '1=1';
        break;
      default:
        dateFilter = "strftime('%Y-%m', payment_date) = strftime('%Y-%m', 'now')";
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
      SELECT
        strftime('%Y-%m', payment_date) as month,
        SUM(amount) as total,
        COUNT(*) as count
      FROM payments
      WHERE gym_id = ? AND date(payment_date) >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', payment_date)
      ORDER BY month DESC
      LIMIT 12
    `, [gymId]);

    const maxMonth = monthlySummary.length > 0 ? Math.max(...monthlySummary.map(m => m.total)) : 1;

    const activeMembersResult = await getOne(`
      SELECT COUNT(*) as count FROM customers
      WHERE gym_id = ? AND date(membership_end) >= date('now')
    `, [gymId]);
    const activeMembers = activeMembersResult?.count || 0;

    let newMembersFilter = "strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')";
    if (range === 'this_week') {
      newMembersFilter = "date(created_at) >= date('now', '-7 days')";
    } else if (range === 'this_year' || range === 'all_time') {
      newMembersFilter = "1=1";
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
      WHERE gym_id = ? AND date(membership_end) >= date('now')
      GROUP BY membership_type
    `, [gymId]);

    const attendanceData = await getAll(`
      SELECT
        date(check_in) as date,
        COUNT(*) as count
      FROM attendance
      WHERE gym_id = ? AND date(check_in) >= date('now', '-30 days')
      GROUP BY date(check_in)
      ORDER BY date DESC
    `, [gymId]);

    const totalCheckIns = attendanceData.reduce((sum, d) => sum + d.count, 0);
    const avgDaily = attendanceData.length > 0 ? Math.round(totalCheckIns / attendanceData.length) : 0;
    const peakDay = attendanceData.length > 0 ? attendanceData[0].date : 'N/A';

    const busiestHourResult = await getOne(`
      SELECT strftime('%H', check_in) as hour, COUNT(*) as count
      FROM attendance
      WHERE gym_id = ? AND date(check_in) >= date('now', '-30 days')
      GROUP BY strftime('%H', check_in)
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

    let previousPeriodFilter = '';
    switch (range) {
      case 'this_week':
        previousPeriodFilter = "date(payment_date) >= date('now', '-14 days') AND date(payment_date) < date('now', '-7 days')";
        break;
      case 'this_month':
        previousPeriodFilter = "strftime('%Y-%m', payment_date) = strftime('%Y-%m', 'now', '-1 month')";
        break;
      case 'last_month':
        previousPeriodFilter = "strftime('%Y-%m', payment_date) = strftime('%Y-%m', 'now', '-2 months')";
        break;
      case 'last_3_months':
        previousPeriodFilter = "date(payment_date) >= date('now', '-6 months') AND date(payment_date) < date('now', '-3 months')";
        break;
      case 'last_6_months':
        previousPeriodFilter = "date(payment_date) >= date('now', '-12 months') AND date(payment_date) < date('now', '-6 months')";
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
        renewals: membershipBreakdown.reduce((sum, m) => sum + m.count, 0),
        trend: 0,
        newTrend: 0
      },
      monthly_summary: monthlySummary,
      revenue_by_method: revenueByMethod,
      membership_breakdown: membershipBreakdown,
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

// Get revenue stats for revenue page
router.get('/revenue', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;

    const totalResult = await getOne(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE gym_id = ?
    `, [gymId]);

    const monthResult = await getOne(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments
      WHERE gym_id = ? AND strftime('%Y-%m', payment_date) = strftime('%Y-%m', 'now')
    `, [gymId]);

    const weekResult = await getOne(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments
      WHERE gym_id = ? AND date(payment_date) >= date('now', '-7 days')
    `, [gymId]);

    const todayResult = await getOne(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments
      WHERE gym_id = ? AND date(payment_date) = date('now')
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
      SELECT strftime('%Y-%m', payment_date) as label, SUM(amount) as total, COUNT(*) as count
      FROM payments
      WHERE gym_id = ? AND date(payment_date) >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', payment_date)
      ORDER BY label
    `, [gymId]);

    const dailyTrend = await getAll(`
      SELECT date(payment_date) as label, SUM(amount) as total, COUNT(*) as count
      FROM payments
      WHERE gym_id = ? AND date(payment_date) >= date('now', '-30 days')
      GROUP BY date(payment_date)
      ORDER BY label
    `, [gymId]);

    const weeklyTrend = await getAll(`
      SELECT strftime('%Y-W%W', payment_date) as label, SUM(amount) as total, COUNT(*) as count
      FROM payments
      WHERE gym_id = ? AND date(payment_date) >= date('now', '-91 days')
      GROUP BY strftime('%Y-%W', payment_date)
      ORDER BY label
    `, [gymId]);

    const yearlyTrend = await getAll(`
      SELECT strftime('%Y', payment_date) as label, SUM(amount) as total, COUNT(*) as count
      FROM payments
      WHERE gym_id = ?
      GROUP BY strftime('%Y', payment_date)
      ORDER BY label
    `, [gymId]);

    const forecastResult = await getOne(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments
      WHERE gym_id = ? AND date(payment_date) >= date('now', '-30 days')
    `, [gymId]);
    const monthlyAvg = forecastResult?.total || 0;

    res.json({
      total_revenue: totalResult?.total || 0,
      this_month: monthResult?.total || 0,
      this_week: weekResult?.total || 0,
      today: todayResult?.total || 0,
      payment_methods: paymentMethods,
      top_customers: topCustomers,
      recent_transactions: recentTransactions,
      monthly_trend: monthlyTrend,
      daily_trend: dailyTrend,
      weekly_trend: weeklyTrend,
      yearly_trend: yearlyTrend,
      forecast: {
        predicted_revenue: monthlyAvg * 1.1,
        growth_rate: 8.5,
        projected_payments: 25
      }
    });
  } catch (error) {
    console.error('Revenue stats error:', error);
    res.status(500).json({ error: 'Failed to get revenue stats' });
  }
});

export default router;
