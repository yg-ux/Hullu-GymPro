import express from 'express';
import { getOne, getAll } from '../models/database.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Get dashboard stats for this gym
router.get('/dashboard', authenticateToken, (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const today = new Date();

    // Total customers
    const totalCustomersResult = getOne('SELECT COUNT(*) as count FROM customers WHERE gym_id = ?', [gymId]);
    const totalCustomers = totalCustomersResult?.count || 0;

    // Active customers
    const activeResult = getOne(`
      SELECT COUNT(*) as count FROM customers 
      WHERE gym_id = ? AND date(membership_end) >= date('now')
    `, [gymId]);
    const activeCustomers = activeResult?.count || 0;

    // Expiring soon
    const expiringResult = getOne(`
      SELECT COUNT(*) as count FROM customers 
      WHERE gym_id = ? AND date(membership_end) > date('now') AND date(membership_end) <= date('now', '+7 days')
    `, [gymId]);
    const expiringSoon = expiringResult?.count || 0;

    // Expired
    const expiredResult = getOne(`
      SELECT COUNT(*) as count FROM customers 
      WHERE gym_id = ? AND date(membership_end) < date('now')
    `, [gymId]);
    const expiredCustomers = expiredResult?.count || 0;

    // Today's revenue
    const todayRevenueResult = getOne(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments 
      WHERE gym_id = ? AND date(payment_date) = date('now')
    `, [gymId]);
    const todayRevenue = todayRevenueResult?.total || 0;

    // This month's revenue
    const monthRevenueResult = getOne(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments 
      WHERE gym_id = ? AND strftime('%Y-%m', payment_date) = strftime('%Y-%m', 'now')
    `, [gymId]);
    const monthRevenue = monthRevenueResult?.total || 0;

    // Last 30 days revenue
    const last30DaysResult = getOne(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments 
      WHERE gym_id = ? AND date(payment_date) >= date('now', '-30 days')
    `, [gymId]);
    const last30DaysRevenue = last30DaysResult?.total || 0;

    // All time revenue
    const allTimeRevenueResult = getOne(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE gym_id = ?
    `, [gymId]);
    const allTimeRevenue = allTimeRevenueResult?.total || 0;

    // All time payment count
    const allTimePaymentsResult = getOne(`
      SELECT COUNT(*) as count FROM payments WHERE gym_id = ?
    `, [gymId]);
    const allTimePayments = allTimePaymentsResult?.count || 0;

    // New this month
    const newThisMonthResult = getOne(`
      SELECT COUNT(*) as count FROM customers 
      WHERE gym_id = ? AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `, [gymId]);
    const newThisMonth = newThisMonthResult?.count || 0;

    // Recent payments
    const recentPayments = getAll(`
      SELECT p.*, c.name as customer_name 
      FROM payments p 
      LEFT JOIN customers c ON p.customer_id = c.id 
      WHERE p.gym_id = ?
      ORDER BY p.created_at DESC LIMIT 10
    `, [gymId]);

    // Membership distribution
    const membershipDistribution = getAll(`
      SELECT membership_type, COUNT(*) as count 
      FROM customers 
      WHERE gym_id = ? AND date(membership_end) >= date('now')
      GROUP BY membership_type
    `, [gymId]);

    // Monthly revenue trend
    const monthlyTrend = getAll(`
      SELECT 
        strftime('%Y-%m', payment_date) as month,
        SUM(amount) as total,
        COUNT(*) as count
      FROM payments 
      WHERE gym_id = ? AND date(payment_date) >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', payment_date)
      ORDER BY month
    `, [gymId]);

    // Top paying customers
    const topCustomers = getAll(`
      SELECT c.*, SUM(p.amount) as total_paid
      FROM customers c
      JOIN payments p ON c.id = p.customer_id AND p.gym_id = ?
      WHERE c.gym_id = ?
      GROUP BY c.id
      ORDER BY total_paid DESC
      LIMIT 10
    `, [gymId, gymId]);

    // Payment methods
    const paymentMethods = getAll(`
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
router.get('/export', authenticateToken, (req, res) => {
  try {
    const gymId = req.user.gym_id;

    const customers = getAll('SELECT * FROM customers WHERE gym_id = ? ORDER BY name', [gymId]);
    const payments = getAll(`
      SELECT p.*, c.name as customer_name 
      FROM payments p 
      LEFT JOIN customers c ON p.customer_id = c.id 
      WHERE p.gym_id = ?
      ORDER BY p.payment_date DESC
    `, [gymId]);

    const allTimeRevenue = getOne('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE gym_id = ?', [gymId])?.total || 0;

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
router.get('/reports', authenticateToken, (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const range = req.query.range || 'this_month';

    // Calculate date range
    let dateFilter = '';
    let groupBy = 'strftime("%Y-%m", payment_date)';
    
    switch (range) {
      case 'this_week':
        dateFilter = "date(payment_date) >= date('now', '-7 days')";
        groupBy = 'date(payment_date)';
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
      default: // this_month
        dateFilter = "strftime('%Y-%m', payment_date) = strftime('%Y-%m', 'now')";
    }

    // Total revenue
    const revenueResult = getOne(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM payments 
      WHERE gym_id = ? AND ${dateFilter}
    `, [gymId]);
    const totalRevenue = revenueResult?.total || 0;

    // Payment count
    const paymentCountResult = getOne(`
      SELECT COUNT(*) as count 
      FROM payments 
      WHERE gym_id = ? AND ${dateFilter}
    `, [gymId]);
    const paymentCount = paymentCountResult?.count || 0;

    // Average transaction
    const avgTransaction = paymentCount > 0 ? totalRevenue / paymentCount : 0;

    // Revenue by method
    const revenueByMethod = getAll(`
      SELECT 
        COALESCE(payment_method, 'cash') as method,
        SUM(amount) as total,
        COUNT(*) as count
      FROM payments 
      WHERE gym_id = ? AND ${dateFilter}
      GROUP BY payment_method
      ORDER BY total DESC
    `, [gymId]);

    // Monthly summary (last 12 months)
    const monthlySummary = getAll(`
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

    // Max month for percentage calculation
    const maxMonth = monthlySummary.length > 0 ? Math.max(...monthlySummary.map(m => m.total)) : 1;

    // Member statistics
    const activeMembersResult = getOne(`
      SELECT COUNT(*) as count FROM customers 
      WHERE gym_id = ? AND date(membership_end) >= date('now')
    `, [gymId]);
    const activeMembers = activeMembersResult?.count || 0;

    // New members this period
    let newMembersFilter = "strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')";
    if (range === 'this_week') {
      newMembersFilter = "date(created_at) >= date('now', '-7 days')";
    } else if (range === 'this_year' || range === 'all_time') {
      newMembersFilter = "1=1";
    }

    const newMembersResult = getOne(`
      SELECT COUNT(*) as count FROM customers WHERE gym_id = ? AND ${newMembersFilter}
    `, [gymId]);
    const newMembers = newMembersResult?.count || 0;

    // Membership breakdown
    const membershipBreakdown = getAll(`
      SELECT 
        membership_type as type,
        COUNT(*) as count
      FROM customers 
      WHERE gym_id = ? AND date(membership_end) >= date('now')
      GROUP BY membership_type
    `, [gymId]);

    // Attendance data (check-ins last 30 days)
    const attendanceData = getAll(`
      SELECT 
        date(created_at) as date,
        COUNT(*) as count
      FROM check_ins 
      WHERE gym_id = ? AND date(created_at) >= date('now', '-30 days')
      GROUP BY date(created_at)
      ORDER BY date DESC
    `, [gymId]);

    // Calculate attendance stats
    const totalCheckIns = attendanceData.reduce((sum, d) => sum + d.count, 0);
    const avgDaily = attendanceData.length > 0 ? Math.round(totalCheckIns / attendanceData.length) : 0;
    const peakDay = attendanceData.length > 0 ? attendanceData[0].date : 'N/A';
    
    // Find busiest hour (if check_ins has time data)
    const busiestHourResult = getOne(`
      SELECT strftime('%H', created_at) as hour, COUNT(*) as count
      FROM check_ins 
      WHERE gym_id = ? AND date(created_at) >= date('now', '-30 days')
      GROUP BY strftime('%H', created_at)
      ORDER BY count DESC
      LIMIT 1
    `, [gymId]);
    const busiestHour = busiestHourResult ? `${busiestHourResult.hour}:00` : 'N/A';

    // Top customers by payment
    const topCustomers = getAll(`
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

    // Calculate trends (compare to previous period)
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

    const previousRevenueResult = getOne(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM payments 
      WHERE gym_id = ? AND ${previousPeriodFilter}
    `, [gymId]);
    const previousRevenue = previousRevenueResult?.total || 0;

    const revenueTrend = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    const paymentsTrend = revenueTrend; // Simplified
    const avgTrend = revenueTrend; // Simplified

    res.json({
      revenue: {
        total: totalRevenue,
        average: Math.round(avgTransaction),
        maxMonth,
        trend: Math.round(revenueTrend * 10) / 10,
        avgTrend: Math.round(avgTrend * 10) / 10
      },
      payments: {
        count: paymentCount,
        trend: Math.round(paymentsTrend * 10) / 10
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

export default router;
