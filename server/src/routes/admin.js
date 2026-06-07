import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getOne, getAll, saveDatabase } from '../models/database.js';
import { authenticateToken, JWT_SECRET } from './auth.js';

const router = express.Router();

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const admin = await getOne('SELECT * FROM admins WHERE email = ?', [email]);

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = bcrypt.compareSync(password, admin.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify admin token
router.get('/verify', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  res.json({ valid: true, role: 'admin' });
});

// Get all gyms
router.get('/gyms', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const gyms = await getAll(`
      SELECT
        g.*,
        (SELECT COUNT(*) FROM customers WHERE gym_id = g.id) as member_count,
        (SELECT COUNT(*) FROM payments WHERE gym_id = g.id) as payment_count,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE gym_id = g.id) as total_revenue
      FROM gyms g
      ORDER BY g.created_at DESC
    `);

    res.json(gyms);
  } catch (error) {
    console.error('Get gyms error:', error);
    res.status(500).json({ error: 'Failed to get gyms' });
  }
});

// Get current gym's own subscription request status
router.get('/my-request', authenticateToken, async (req, res) => {
  try {
    const request = await getOne(`
      SELECT id, requested_plan, amount_paid, payment_method, transaction_id, duration_months, status, admin_notes, created_at, reviewed_at
      FROM subscription_requests
      WHERE gym_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `, [req.user.gym_id]);
    res.json(request || null);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get request status' });
  }
});

// Get all subscription requests (admin only)
router.get('/subscription-requests', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const requests = await getAll(`
      SELECT
        sr.*,
        g.name as gym_name,
        g.email as gym_email,
        g.phone as gym_phone
      FROM subscription_requests sr
      JOIN gyms g ON sr.gym_id = g.id
      ORDER BY sr.created_at DESC
    `);

    res.json(requests);
  } catch (error) {
    console.error('Get subscription requests error:', error);
    res.status(500).json({ error: 'Failed to get requests' });
  }
});

// Create subscription request (from gym owner)
router.post('/subscription-request', authenticateToken, async (req, res) => {
  try {
    const { plan_id, amount_paid, payment_method, transaction_id, duration_months } = req.body;
    const gymId = req.user.gym_id;

    const plans = {
      'starter': 1999,
      'pro': 4999,
    };

    if (!plans[plan_id]) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    if (!transaction_id || !transaction_id.trim()) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    // Check if there's already a pending request
    const existingRequest = await getOne(`
      SELECT * FROM subscription_requests
      WHERE gym_id = ? AND status = 'pending'
    `, [gymId]);

    if (existingRequest) {
      return res.status(400).json({ error: 'You already have a pending subscription request. Please wait for it to be reviewed.' });
    }

    // Check if transaction_id was already used
    const duplicateTx = await getOne(`
      SELECT * FROM subscription_requests WHERE transaction_id = ?
    `, [transaction_id.trim()]);

    if (duplicateTx) {
      return res.status(400).json({ error: 'This transaction ID has already been used.' });
    }

    const months = parseInt(duration_months) || 1;
    const id = uuidv4();
    await runQuery(`
      INSERT INTO subscription_requests (id, gym_id, requested_plan, amount_paid, payment_method, transaction_id, duration_months, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [id, gymId, plan_id, amount_paid || plans[plan_id] * months, payment_method || 'telebirr', transaction_id.trim(), months]);

    res.status(201).json({
      message: 'Request submitted successfully. We will review and activate your plan shortly.',
      request_id: id
    });
  } catch (error) {
    console.error('Create subscription request error:', error);
    res.status(500).json({ error: 'Failed to submit request' });
  }
});

// Approve subscription request
router.post('/approve-request/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { id } = req.params;
    const { admin_notes } = req.body;

    const request = await getOne('SELECT * FROM subscription_requests WHERE id = ?', [id]);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request already processed' });
    }

    await runQuery(`
      UPDATE subscription_requests
      SET status = 'approved', admin_notes = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [admin_notes || null, req.user.id, id]);

    const today = new Date();
    const months = parseInt(request.duration_months) || 1;
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + months);

    const planLimits = {
      'starter': 100,
      'pro': -1,
    };

    await runQuery(`
      UPDATE gyms SET
        subscription_status = 'active',
        subscription_plan = ?,
        subscription_start = ?,
        subscription_end = ?,
        max_members = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [request.requested_plan, today.toISOString().split('T')[0], endDate.toISOString().split('T')[0], planLimits[request.requested_plan], request.gym_id]);

    res.json({ message: 'Request approved successfully' });
  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

// Decline subscription request
router.post('/decline-request/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { id } = req.params;
    const { admin_notes } = req.body;

    const request = await getOne('SELECT * FROM subscription_requests WHERE id = ?', [id]);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request already processed' });
    }

    await runQuery(`
      UPDATE subscription_requests
      SET status = 'declined', admin_notes = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [admin_notes || null, req.user.id, id]);

    res.json({ message: 'Request declined' });
  } catch (error) {
    console.error('Decline request error:', error);
    res.status(500).json({ error: 'Failed to decline request' });
  }
});

// Get dashboard stats (admin overview)
router.get('/stats', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const totalGymsRow = await getOne('SELECT COUNT(*) as count FROM gyms');
    const totalGyms = totalGymsRow?.count || 0;

    const activeGymsRow = await getOne("SELECT COUNT(*) as count FROM gyms WHERE subscription_status = 'active'");
    const activeGyms = activeGymsRow?.count || 0;

    const trialGymsRow = await getOne("SELECT COUNT(*) as count FROM gyms WHERE subscription_status = 'trial'");
    const trialGyms = trialGymsRow?.count || 0;

    const pendingRequestsRow = await getOne("SELECT COUNT(*) as count FROM subscription_requests WHERE status = 'pending'");
    const pendingRequests = pendingRequestsRow?.count || 0;

    const totalRevenueRow = await getOne("SELECT COALESCE(SUM(amount_paid), 0) as total FROM subscription_requests WHERE status = 'approved'");
    const totalRevenue = totalRevenueRow?.total || 0;

    const thisMonthRevenueRow = await getOne(`
      SELECT COALESCE(SUM(amount_paid), 0) as total
      FROM subscription_requests
      WHERE status = 'approved' AND date(reviewed_at) >= date('now', '-30 days')
    `);
    const thisMonthRevenue = thisMonthRevenueRow?.total || 0;

    const planDistribution = await getAll(`
      SELECT subscription_plan, COUNT(*) as count
      FROM gyms
      GROUP BY subscription_plan
    `);

    const recentRegistrations = await getAll(`
      SELECT id, name, email, created_at, subscription_plan
      FROM gyms
      ORDER BY created_at DESC
      LIMIT 10
    `);

    res.json({
      total_gyms: totalGyms,
      active_gyms: activeGyms,
      trial_gyms: trialGyms,
      pending_requests: pendingRequests,
      total_revenue: totalRevenue,
      this_month_revenue: thisMonthRevenue,
      plan_distribution: planDistribution,
      recent_registrations: recentRegistrations
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Migrate all gyms to correct plan (admin utility)
router.post('/migrate-plans', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    await runQuery("UPDATE gyms SET subscription_plan = 'free', subscription_status = 'active', max_members = 10 WHERE subscription_plan IS NULL OR subscription_plan = '' OR subscription_plan = 'starter' OR subscription_plan = 'pro'");

    const countRow = await getOne('SELECT COUNT(*) as count FROM gyms');
    const updatedCount = countRow?.count || 0;

    res.json({
      message: 'All gyms migrated to free plan',
      total_gyms: updatedCount
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ error: 'Failed to migrate plans' });
  }
});

// Enable SMS for a gym (admin utility)
router.post('/enable-sms', async (req, res) => {
  const { secret, gym_id, api_key } = req.body;

  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (!gym_id || !api_key) {
      return res.status(400).json({ error: 'gym_id and api_key are required' });
    }

    await runQuery('UPDATE gyms SET sms_enabled = 1, sms_api_key = ? WHERE id = ?', [api_key, gym_id]);

    const gym = await getOne('SELECT id, name, sms_enabled FROM gyms WHERE id = ?', [gym_id]);

    res.json({ success: true, message: 'SMS enabled for gym', gym });
  } catch (error) {
    console.error('Enable SMS failed:', error);
    res.status(500).json({ error: 'Failed to enable SMS' });
  }
});

export default router;
