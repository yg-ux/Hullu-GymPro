import express from 'express';
import { getOne, getAll } from '../models/database.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Get revenue summary (daily/weekly/monthly/yearly)
router.get('/summary', authenticateToken, (req, res) => {
  try {
    const gymId = req.user.gym_id;

    // Daily revenue (today)
    const dailyResult = getOne(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE gym_id = ? AND date(payment_date) = date('now')
    `, [gymId]);

    // Weekly revenue (last 7 days)
    const weeklyResult = getOne(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE gym_id = ? AND date(payment_date) >= date('now', '-7 days')
    `, [gymId]);

    // Monthly revenue (current month)
    const monthlyResult = getOne(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE gym_id = ? AND strftime('%Y-%m', payment_date) = strftime('%Y-%m', 'now')
    `, [gymId]);

    // Yearly revenue (current year)
    const yearlyResult = getOne(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE gym_id = ? AND strftime('%Y', payment_date) = strftime('%Y', 'now')
    `, [gymId]);

    // Transaction counts
    const dailyCount = getOne(`
      SELECT COUNT(*) as count FROM payments
      WHERE gym_id = ? AND date(payment_date) = date('now')
    `, [gymId]);

    const weeklyCount = getOne(`
      SELECT COUNT(*) as count FROM payments
      WHERE gym_id = ? AND date(payment_date) >= date('now', '-7 days')
    `, [gymId]);

    const monthlyCount = getOne(`
      SELECT COUNT(*) as count FROM payments
      WHERE gym_id = ? AND strftime('%Y-%m', payment_date) = strftime('%Y-%m', 'now')
    `, [gymId]);

    const yearlyCount = getOne(`
      SELECT COUNT(*) as count FROM payments
      WHERE gym_id = ? AND strftime('%Y', payment_date) = strftime('%Y', 'now')
    `, [gymId]);

    res.json({
      daily: {
        total: dailyResult?.total || 0,
        count: dailyCount?.count || 0
      },
      weekly: {
        total: weeklyResult?.total || 0,
        count: weeklyCount?.count || 0
      },
      monthly: {
        total: monthlyResult?.total || 0,
        count: monthlyCount?.count || 0
      },
      yearly: {
        total: yearlyResult?.total || 0,
        count: yearlyCount?.count || 0
      }
    });
  } catch (error) {
    console.error('Revenue summary error:', error);
    res.status(500).json({ error: 'Failed to get revenue summary' });
  }
});

// Get revenue chart data
router.get('/chart', authenticateToken, (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { period = '30days' } = req.query;

    let dateFilter = "date(payment_date) >= date('now', '-30 days')";
    let groupBy = 'date(payment_date)';
    let orderBy = 'date(payment_date)';
    let labelFormat = '%Y-%m-%d';

    switch (period) {
      case '7days':
        dateFilter = "date(payment_date) >= date('now', '-7 days')";
        break;
      case '90days':
        dateFilter = "date(payment_date) >= date('now', '-90 days')";
        groupBy = "strftime('%Y-%W', payment_date)";
        labelFormat = 'Week %W, %Y';
        break;
      case '12months':
        dateFilter = "date(payment_date) >= date('now', '-12 months')";
        groupBy = "strftime('%Y-%m', payment_date)";
        labelFormat = '%Y-%m';
        break;
      default: // 30days
        dateFilter = "date(payment_date) >= date('now', '-30 days')";
    }

    const chartData = getAll(`
      SELECT
        ${groupBy === 'date(payment_date)' ? 'date(payment_date)' : groupBy} as period,
        SUM(amount) as revenue,
        COUNT(*) as count
      FROM payments
      WHERE gym_id = ? AND ${dateFilter}
      GROUP BY ${groupBy}
      ORDER BY ${orderBy}
    `, [gymId]);

    res.json({
      period,
      data: chartData.map(d => ({
        date: d.period,
        revenue: d.revenue,
        transactions: d.count
      }))
    });
  } catch (error) {
    console.error('Revenue chart error:', error);
    res.status(500).json({ error: 'Failed to get revenue chart data' });
  }
});

// Get revenue by payment method
router.get('/by-method', authenticateToken, (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { start_date, end_date } = req.query;

    let dateFilter = '1=1';
    const params = [gymId];

    if (start_date) {
      dateFilter += ' AND date(payment_date) >= ?';
      params.push(start_date);
    }
    if (end_date) {
      dateFilter += ' AND date(payment_date) <= ?';
      params.push(end_date);
    }

    const methodBreakdown = getAll(`
      SELECT
        COALESCE(payment_method, 'cash') as method,
        SUM(amount) as total,
        COUNT(*) as count,
        AVG(amount) as average
      FROM payments
      WHERE gym_id = ? AND ${dateFilter}
      GROUP BY payment_method
      ORDER BY total DESC
    `, params);

    const grandTotal = getOne(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE gym_id = ? AND ${dateFilter}
    `, params);

    res.json({
      breakdown: methodBreakdown,
      grand_total: grandTotal?.total || 0
    });
  } catch (error) {
    console.error('Revenue by method error:', error);
    res.status(500).json({ error: 'Failed to get revenue by method' });
  }
});

// Get top paying customers
router.get('/top-customers', authenticateToken, (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { limit = 10, period = 'all' } = req.query;

    let dateFilter = '1=1';
    const params = [gymId, gymId];

    if (period === 'month') {
      dateFilter = "strftime('%Y-%m', p.payment_date) = strftime('%Y-%m', 'now')";
    } else if (period === 'quarter') {
      dateFilter = "date(p.payment_date) >= date('now', '-3 months')";
    } else if (period === 'year') {
      dateFilter = "strftime('%Y', p.payment_date) = strftime('%Y', 'now')";
    }

    const topCustomers = getAll(`
      SELECT
        c.id,
        c.name,
        c.phone,
        c.email,
        c.membership_type,
        c.membership_end,
        COALESCE(SUM(p.amount), 0) as total_paid,
        COUNT(p.id) as payment_count,
        MAX(p.payment_date) as last_payment
      FROM customers c
      LEFT JOIN payments p ON c.id = p.customer_id AND p.gym_id = ?
      WHERE c.gym_id = ? ${dateFilter ? 'AND ' + dateFilter : ''}
      GROUP BY c.id
      ORDER BY total_paid DESC
      LIMIT ?
    `, [...params, parseInt(limit)]);

    res.json({
      period,
      customers: topCustomers
    });
  } catch (error) {
    console.error('Top customers error:', error);
    res.status(500).json({ error: 'Failed to get top customers' });
  }
});

// Simple trend forecast
router.get('/forecast', authenticateToken, (req, res) => {
  try {
    const gymId = req.user.gym_id;

    // Get last 6 months data
    const monthlyData = getAll(`
      SELECT
        strftime('%Y-%m', payment_date) as month,
        SUM(amount) as revenue,
        COUNT(*) as count
      FROM payments
      WHERE gym_id = ? AND date(payment_date) >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', payment_date)
      ORDER BY month ASC
    `, [gymId]);

    if (monthlyData.length < 2) {
      return res.json({
        forecast: null,
        message: 'Not enough data for forecast',
        trend: 'insufficient_data'
      });
    }

    // Calculate simple moving average
    const revenues = monthlyData.map(d => d.revenue);
    const avgRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length;

    // Calculate trend
    const n = revenues.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    revenues.forEach((y, i) => {
      sumX += i;
      sumY += y;
      sumXY += i * y;
      sumX2 += i * i;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Forecast next month
    const nextMonthIndex = n;
    const forecast = Math.max(0, intercept + slope * nextMonthIndex);

    // Growth rate
    const firstRevenue = revenues[0];
    const lastRevenue = revenues[revenues.length - 1];
    const growthRate = firstRevenue > 0 ? ((lastRevenue - firstRevenue) / firstRevenue) * 100 : 0;

    // Trend direction
    let trend = 'stable';
    if (slope > avgRevenue * 0.05) trend = 'increasing';
    else if (slope < -avgRevenue * 0.05) trend = 'decreasing';

    res.json({
      forecast: Math.round(forecast),
      trend,
      growth_rate: Math.round(growthRate * 10) / 10,
      average_monthly: Math.round(avgRevenue),
      projection_3months: Math.round(forecast * 3),
      historical: monthlyData
    });
  } catch (error) {
    console.error('Forecast error:', error);
    res.status(500).json({ error: 'Failed to generate forecast' });
  }
});

export default router;