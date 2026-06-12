import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getOne, getAll, saveDatabase } from '../models/database.js';
import { authenticateToken, JWT_SECRET } from './auth.js';
import { verifyTelebirrTransaction } from '../services/telebirrService.js';
import { notifyNewSubscriptionRequest } from '../services/telegramService.js';

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

// Delete a gym and all its data (admin only)
router.delete('/gyms/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const gym = await getOne('SELECT * FROM gyms WHERE id = ?', [req.params.id]);
    if (!gym) return res.status(404).json({ error: 'Gym not found' });

    // Delete all related data in order (child tables first)
    await runQuery('DELETE FROM attendance WHERE gym_id = ?', [req.params.id]);
    await runQuery('DELETE FROM payments WHERE gym_id = ?', [req.params.id]);
    await runQuery('DELETE FROM customers WHERE gym_id = ?', [req.params.id]);
    await runQuery('DELETE FROM gym_users WHERE gym_id = ?', [req.params.id]);
    await runQuery('DELETE FROM subscription_requests WHERE gym_id = ?', [req.params.id]);
    await runQuery('DELETE FROM sms_logs WHERE gym_id = ?', [req.params.id]);
    await runQuery('DELETE FROM activity_log WHERE gym_id = ?', [req.params.id]);
    await runQuery('DELETE FROM gyms WHERE id = ?', [req.params.id]);

    saveDatabase();
    console.log(`🗑️ Admin deleted gym: ${gym.name} (${req.params.id})`);
    res.json({ message: `Gym "${gym.name}" and all its data deleted successfully` });
  } catch (error) {
    console.error('Delete gym error:', error);
    res.status(500).json({ error: 'Failed to delete gym' });
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
      'starter': 1499,
      'pro': 3499,
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
    const expectedAmount = amount_paid || plans[plan_id] * months;
    const id = uuidv4();

    await runQuery(`
      INSERT INTO subscription_requests (id, gym_id, requested_plan, amount_paid, payment_method, transaction_id, duration_months, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [id, gymId, plan_id, expectedAmount, payment_method || 'telebirr', transaction_id.trim(), months]);

    // Fire Telegram notification — non-blocking, never fails the request
    const gym = await getOne('SELECT name, email FROM gyms WHERE id = ?', [gymId]);
    notifyNewSubscriptionRequest({
      gymName:       gym?.name || 'Unknown Gym',
      gymEmail:      gym?.email || null,
      plan:          plan_id,
      amount:        expectedAmount,
      paymentMethod: payment_method || 'telebirr',
      transactionId: transaction_id.trim(),
      durationMonths: months,
    }).catch(e => console.warn('Telegram notify failed:', e.message));

    res.status(201).json({
      message: 'Request submitted! We\'ll review and activate your plan shortly.',
      request_id: id,
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
      SET status = 'approved', admin_notes = ?, reviewed_by = ?, reviewed_at = NOW()
      WHERE id = ?
    `, [admin_notes || null, req.user.id, id]);

    const today = new Date();
    const months = parseInt(request.duration_months) || 1;

    // If the gym still has days left on current subscription, extend from that
    // end date (don't waste remaining time). Otherwise extend from today.
    const gym = await getOne('SELECT * FROM gyms WHERE id = ?', [request.gym_id]);
    const existingEnd = gym?.subscription_end ? new Date(gym.subscription_end) : null;
    const startFrom = (existingEnd && existingEnd > today) ? existingEnd : today;
    const endDate = new Date(startFrom);
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
        updated_at = NOW()
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
      SET status = 'declined', admin_notes = ?, reviewed_by = ?, reviewed_at = NOW()
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
      WHERE status = 'approved' AND reviewed_at::date >= CURRENT_DATE - INTERVAL '30 days'
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

    const expiringRow = await getOne(`
      SELECT COUNT(*) as count FROM gyms
      WHERE subscription_end BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days'
        AND subscription_status = 'active'
    `);

    res.json({
      total_gyms: totalGyms,
      active_gyms: activeGyms,
      trial_gyms: trialGyms,
      pending_requests: pendingRequests,
      total_revenue: totalRevenue,
      this_month_revenue: thisMonthRevenue,
      expiring_soon: expiringRow?.count || 0,
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

// Create a test gym with a pro subscription that expires in N minutes (default 5)
// Accepts either ADMIN_SECRET body field OR a valid admin JWT (Authorization: Bearer ...)
router.post('/create-test-gym', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const { expires_in_minutes = 5 } = req.body;

  try {
    const gymId   = uuidv4();
    const userId  = uuidv4();
    const slug    = `test-gym-${Date.now()}`;
    const email   = `test-${Date.now()}@hullutest.com`;
    const password = 'Test1234!';
    const hash    = bcrypt.hashSync(password, 10);
    const mins    = Math.max(1, parseInt(expires_in_minutes) || 5);

    // subscription_end = now + N minutes (PostgreSQL interval)
    await runQuery(`
      INSERT INTO gyms
        (id, name, slug, email, phone,
         subscription_status, subscription_plan,
         subscription_start, subscription_end,
         max_members, color_theme)
      VALUES
        (?, 'Test Gym Pro', ?, ?, '0900000000',
         'active', 'pro',
         NOW()::date, NOW() + (? || ' minutes')::interval,
         9999, 'default')
    `, [gymId, slug, email, mins]);

    await runQuery(`
      INSERT INTO gym_users (id, gym_id, username, password, name, role)
      VALUES (?, ?, ?, ?, 'Test Owner', 'owner')
    `, [userId, gymId, email, hash]);

    res.json({
      message: `Test gym created — subscription expires in ${mins} minute(s)`,
      credentials: { email, password },
      gym_id: gymId,
      expires_at: new Date(Date.now() + mins * 60000).toISOString(),
    });
  } catch (error) {
    console.error('Create test gym error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Manual plan override — change a gym's plan instantly without a request
router.post('/gyms/:id/set-plan', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  const { plan, months = 1, notes } = req.body;
  const validPlans = ['free', 'starter', 'pro', 'enterprise'];
  if (!validPlans.includes(plan)) return res.status(400).json({ error: 'Invalid plan' });
  try {
    const gym = await getOne('SELECT * FROM gyms WHERE id = ?', [req.params.id]);
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    const planLimits = { free: 10, starter: 100, pro: -1, enterprise: -1 };
    let endDate = null;
    if (plan !== 'free') {
      const today = new Date();
      const existing = gym.subscription_end ? new Date(gym.subscription_end) : null;
      const base = existing && existing > today ? existing : today;
      const end = new Date(base);
      end.setMonth(end.getMonth() + parseInt(months));
      endDate = end.toISOString().split('T')[0];
    }
    await runQuery(`
      UPDATE gyms SET
        subscription_plan = ?, subscription_status = ?,
        subscription_start = NOW()::date, subscription_end = ?,
        max_members = ?, updated_at = NOW()
      WHERE id = ?
    `, [plan, plan === 'free' ? 'active' : 'active', endDate, planLimits[plan], req.params.id]);
    // Log to activity_log
    await runQuery(`INSERT INTO activity_log (id, gym_id, action, details, created_at)
      VALUES (?, ?, 'admin_plan_change', ?, NOW())`,
      [uuidv4(), req.params.id, JSON.stringify({ plan, months, notes: notes || null, by: req.user.email })]);
    res.json({ message: `Plan updated to ${plan}`, end_date: endDate });
  } catch (error) {
    console.error('Set plan error:', error);
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

// Extend subscription end date for a gym
router.post('/gyms/:id/extend', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  const { end_date, notes } = req.body;
  if (!end_date) return res.status(400).json({ error: 'end_date required (YYYY-MM-DD)' });
  try {
    const gym = await getOne('SELECT * FROM gyms WHERE id = ?', [req.params.id]);
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    await runQuery(`UPDATE gyms SET subscription_end = ?, subscription_status = 'active', updated_at = NOW() WHERE id = ?`,
      [end_date, req.params.id]);
    await runQuery(`INSERT INTO activity_log (id, gym_id, action, details, created_at)
      VALUES (?, ?, 'admin_extend', ?, NOW())`,
      [uuidv4(), req.params.id, JSON.stringify({ end_date, notes: notes || null, by: req.user.email })]);
    res.json({ message: 'Subscription extended', end_date });
  } catch (error) {
    console.error('Extend subscription error:', error);
    res.status(500).json({ error: 'Failed to extend subscription' });
  }
});

// Revenue analytics — monthly breakdown for last 12 months
router.get('/revenue-analytics', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  try {
    const monthly = await getAll(`
      SELECT
        TO_CHAR(reviewed_at, 'YYYY-MM') as month,
        COALESCE(SUM(amount_paid), 0) as revenue,
        COUNT(*) as approvals
      FROM subscription_requests
      WHERE status = 'approved' AND reviewed_at >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(reviewed_at, 'YYYY-MM')
      ORDER BY month ASC
    `);
    const byPlan = await getAll(`
      SELECT requested_plan as plan, COALESCE(SUM(amount_paid), 0) as revenue, COUNT(*) as count
      FROM subscription_requests WHERE status = 'approved'
      GROUP BY requested_plan
    `);
    const expiring = await getAll(`
      SELECT id, name, email, phone, subscription_plan, subscription_end
      FROM gyms
      WHERE subscription_end BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days'
        AND subscription_status = 'active'
      ORDER BY subscription_end ASC
    `);
    res.json({ monthly, by_plan: byPlan, expiring_soon: expiring });
  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).json({ error: 'Failed to get revenue analytics' });
  }
});

// Activity log — recent admin + system actions
router.get('/activity-log', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  try {
    const logs = await getAll(`
      SELECT al.*, g.name as gym_name
      FROM activity_log al
      LEFT JOIN gyms g ON al.gym_id = g.id
      ORDER BY al.created_at DESC
      LIMIT 100
    `);
    res.json(logs);
  } catch (error) {
    console.error('Activity log error:', error);
    res.status(500).json({ error: 'Failed to get activity log' });
  }
});

// Get broadcast message
router.get('/broadcast', authenticateToken, async (req, res) => {
  try {
    const row = await getOne(`SELECT value FROM settings WHERE gym_id = 'GLOBAL' AND key = 'broadcast'`);
    res.json(row ? JSON.parse(row.value) : null);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get broadcast' });
  }
});

// Set/clear broadcast message
router.post('/broadcast', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  const { message, type = 'info' } = req.body; // type: info | warning | success
  try {
    const existing = await getOne(`SELECT id FROM settings WHERE gym_id = 'GLOBAL' AND key = 'broadcast'`);
    if (!message) {
      await runQuery(`DELETE FROM settings WHERE gym_id = 'GLOBAL' AND key = 'broadcast'`);
      return res.json({ message: 'Broadcast cleared' });
    }
    const value = JSON.stringify({ message, type, created_at: new Date().toISOString() });
    if (existing) {
      await runQuery(`UPDATE settings SET value = ? WHERE gym_id = 'GLOBAL' AND key = 'broadcast'`, [value]);
    } else {
      await runQuery(`INSERT INTO settings (gym_id, key, value) VALUES ('GLOBAL', 'broadcast', ?)`, [value]);
    }
    res.json({ message: 'Broadcast saved' });
  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({ error: 'Failed to save broadcast' });
  }
});

// Force-expire a gym's subscription (admin utility for testing)
router.post('/force-expire-gym', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  const { gym_id, days_ago = 6 } = req.body;
  if (!gym_id) return res.status(400).json({ error: 'gym_id required' });
  try {
    await runQuery(
      `UPDATE gyms SET subscription_end = NOW() - (? || ' days')::interval WHERE id = ?`,
      [parseInt(days_ago), gym_id]
    );
    const gym = await getOne('SELECT id, name, subscription_end, subscription_status, subscription_plan FROM gyms WHERE id = ?', [gym_id]);
    res.json({ message: `Subscription set to ${days_ago} day(s) ago`, gym });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
