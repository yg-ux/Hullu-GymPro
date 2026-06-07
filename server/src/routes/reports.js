import express from 'express';
import PDFDocument from 'pdfkit';
import { getOne, getAll } from '../models/database.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Check if gym has reports feature (Pro or Enterprise)
function checkReportsFeature(gym) {
  return gym.subscription_plan === 'pro' || gym.subscription_plan === 'enterprise';
}

// Generate monthly PDF report
router.get('/monthly', authenticateToken, (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { month = null, year = null } = req.query;

    // Check subscription
    const gym = getOne('SELECT * FROM gyms WHERE id = ?', [gymId]);
    if (!gym) {
      return res.status(404).json({ error: 'Gym not found' });
    }

    if (!checkReportsFeature(gym)) {
      return res.status(403).json({
        error: 'Reports are available on Pro and Enterprise plans only',
        requires_plan: 'pro'
      });
    }

    // Determine the month/year
    const now = new Date();
    const reportMonth = month || (now.getMonth() + 1).toString().padStart(2, '0');
    const reportYear = year || now.getFullYear().toString();
    const periodFilter = `${reportYear}-${reportMonth}`;

    // Get gym info
    const gymInfo = getOne('SELECT * FROM gyms WHERE id = ?', [gymId]);

    // Get revenue data
    const revenueData = getOne(`
      SELECT
        COALESCE(SUM(amount), 0) as total_revenue,
        COUNT(*) as total_payments,
        AVG(amount) as avg_payment
      FROM payments
      WHERE gym_id = ? AND strftime('%Y-%m', payment_date) = ?
    `, [gymId, periodFilter]);

    // Get revenue by payment method
    const revenueByMethod = getAll(`
      SELECT
        COALESCE(payment_method, 'cash') as method,
        SUM(amount) as total,
        COUNT(*) as count
      FROM payments
      WHERE gym_id = ? AND strftime('%Y-%m', payment_date) = ?
      GROUP BY payment_method
    `, [gymId, periodFilter]);

    // Get member stats
    const memberStats = getOne(`
      SELECT
        COUNT(*) as total_members,
        SUM(CASE WHEN date(membership_end) >= date('now') THEN 1 ELSE 0 END) as active_members,
        SUM(CASE WHEN date(membership_end) < date('now') THEN 1 ELSE 0 END) as expired_members
      FROM customers
      WHERE gym_id = ?
    `, [gymId]);

    // New members this month
    const newMembersThisMonth = getOne(`
      SELECT COUNT(*) as count FROM customers
      WHERE gym_id = ? AND strftime('%Y-%m', created_at) = ?
    `, [gymId, periodFilter]);

    // Attendance stats
    const attendanceStats = getOne(`
      SELECT
        COUNT(*) as total_visits,
        COUNT(DISTINCT customer_id) as unique_visitors
      FROM attendance
      WHERE gym_id = ? AND strftime('%Y-%m', check_in) = ?
    `, [gymId, periodFilter]);

    // Top customers
    const topCustomers = getAll(`
      SELECT
        c.name,
        c.phone,
        COALESCE(SUM(p.amount), 0) as total_paid,
        COUNT(p.id) as payment_count
      FROM customers c
      LEFT JOIN payments p ON c.id = p.customer_id AND p.gym_id = ? AND strftime('%Y-%m', p.payment_date) = ?
      WHERE c.gym_id = ?
      GROUP BY c.id
      ORDER BY total_paid DESC
      LIMIT 10
    `, [gymId, periodFilter, gymId]);

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${periodFilter}.pdf"`);

    doc.pipe(res);

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text(gymInfo?.name || 'Gym Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica').text(`Monthly Report: ${periodFilter}`, { align: 'center' });
    doc.moveDown(2);

    // Revenue Summary Section
    doc.fontSize(18).font('Helvetica-Bold').text('Revenue Summary');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');

    const revenueSection = [
      ['Total Revenue:', `ETB ${(revenueData?.total_revenue || 0).toLocaleString()}`],
      ['Total Payments:', (revenueData?.total_payments || 0).toString()],
      ['Average Payment:', `ETB ${Math.round(revenueData?.avg_payment || 0).toLocaleString()}`]
    ];

    revenueSection.forEach(([label, value]) => {
      doc.text(`${label} ${value}`);
    });

    doc.moveDown(1);

    // Revenue by Method
    doc.fontSize(14).font('Helvetica-Bold').text('Revenue by Payment Method');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');

    if (revenueByMethod.length > 0) {
      revenueByMethod.forEach(method => {
        doc.text(`${method.method}: ETB ${method.total.toLocaleString()} (${method.count} payments)`);
      });
    } else {
      doc.text('No payment data for this period');
    }

    doc.moveDown(1);

    // Member Statistics
    doc.fontSize(18).font('Helvetica-Bold').text('Member Statistics');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');

    const memberSection = [
      ['Total Members:', (memberStats?.total_members || 0).toString()],
      ['Active Members:', (memberStats?.active_members || 0).toString()],
      ['Expired Members:', (memberStats?.expired_members || 0).toString()],
      ['New Members This Month:', (newMembersThisMonth?.count || 0).toString()]
    ];

    memberSection.forEach(([label, value]) => {
      doc.text(`${label} ${value}`);
    });

    doc.moveDown(1);

    // Attendance Statistics
    doc.fontSize(18).font('Helvetica-Bold').text('Attendance Statistics');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');

    const attendanceSection = [
      ['Total Visits:', (attendanceStats?.total_visits || 0).toString()],
      ['Unique Visitors:', (attendanceStats?.unique_visitors || 0).toString()]
    ];

    attendanceSection.forEach(([label, value]) => {
      doc.text(`${label} ${value}`);
    });

    doc.moveDown(1);

    // Top Customers
    doc.fontSize(18).font('Helvetica-Bold').text('Top Customers by Payment');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');

    if (topCustomers.length > 0) {
      topCustomers.forEach((customer, index) => {
        doc.text(`${index + 1}. ${customer.name} - ETB ${customer.total_paid.toLocaleString()}`);
      });
    } else {
      doc.text('No customer data for this period');
    }

    // Footer
    doc.moveDown(2);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.text('Powered by Hullu Gym Management System', { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Monthly report error:', error);
    res.status(500).json({ error: 'Failed to generate monthly report' });
  }
});

// Customer list export
router.get('/customers', authenticateToken, (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { format = 'json', status = 'all' } = req.query;

    // Check subscription
    const gym = getOne('SELECT * FROM gyms WHERE id = ?', [gymId]);
    if (!gym) {
      return res.status(404).json({ error: 'Gym not found' });
    }

    if (!checkReportsFeature(gym)) {
      return res.status(403).json({
        error: 'Reports are available on Pro and Enterprise plans only',
        requires_plan: 'pro'
      });
    }

    let sql = `
      SELECT
        c.*,
        COALESCE(SUM(p.amount), 0) as total_paid,
        COUNT(p.id) as payment_count,
        MAX(p.payment_date) as last_payment_date
      FROM customers c
      LEFT JOIN payments p ON c.id = p.customer_id AND p.gym_id = ?
      WHERE c.gym_id = ?
    `;
    const params = [gymId, gymId];

    if (status !== 'all') {
      sql += ' AND c.status = ?';
      params.push(status);
    }

    sql += ' GROUP BY c.id ORDER BY c.name ASC';

    const customers = getAll(sql, params);

    if (format === 'csv') {
      const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const headers = ['Name', 'Phone', 'Email', 'Membership Type', 'Start Date', 'End Date', 'Status', 'Total Paid (ETB)', 'Payment Count'];
      const csvRows = [headers.map(esc).join(',')];

      customers.forEach(c => {
        csvRows.push([
          esc(c.name),
          esc(c.phone),
          esc(c.email),
          esc(c.membership_type),
          esc(c.membership_start),
          esc(c.membership_end),
          esc(c.status),
          esc(c.total_paid || 0),
          esc(c.payment_count || 0)
        ].join(','));
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="customers-export.csv"');
      res.send('﻿' + csvRows.join('\r\n')); // BOM for Excel UTF-8 compatibility
    } else {
      // JSON format
      res.json({
        export_date: new Date().toISOString(),
        total_customers: customers.length,
        customers: customers.map(c => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          membership_type: c.membership_type,
          membership_start: c.membership_start,
          membership_end: c.membership_end,
          status: c.status,
          total_paid: c.total_paid,
          payment_count: c.payment_count,
          last_payment_date: c.last_payment_date
        }))
      });
    }
  } catch (error) {
    console.error('Customer export error:', error);
    res.status(500).json({ error: 'Failed to export customers' });
  }
});

export default router;