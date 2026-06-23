import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getOne, getAll, saveDatabase } from '../models/database.js';
import { validateRegister, validateLogin, validateChangePassword } from '../middleware/validate.js';
import { smsService } from '../services/smsService.js';
import { sendOtpEmail } from '../services/emailService.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Server will not start.');
  process.exit(1);
}
const TRIAL_DAYS = 14;
const GRACE_PERIOD_DAYS = 5; // days after expiry before full lock-out

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Check subscription status
function checkSubscription(gym) {
  // Trial must be checked FIRST — a gym can have subscription_plan='free' while still on trial
  if (gym.subscription_status === 'trial') {
    const startDate = new Date(gym.subscription_start);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + TRIAL_DAYS);
    const today = new Date();
    const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 0) {
      return { valid: false, status: 'trial_expired', daysLeft: 0, plan: gym.subscription_plan || 'free' };
    }
    return { valid: true, status: 'trial', daysLeft, plan: gym.subscription_plan || 'starter' };
  }

  // Legacy free plan — always valid, just member-count limited
  if (!gym.subscription_plan || gym.subscription_plan === 'free') {
    return { valid: true, status: 'free', daysLeft: -1, plan: 'free', maxMembers: gym.max_members || 10 };
  }

  if (!gym.subscription_status) {
    return { valid: false, status: 'inactive', daysLeft: 0, plan: gym.subscription_plan };
  }

  if (gym.subscription_status === 'active') {
    const endDate = new Date(gym.subscription_end);
    const today = new Date();
    const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

    if (daysLeft > 0) {
      return { valid: true, status: 'active', daysLeft, plan: gym.subscription_plan };
    }

    // Expired — check if still within grace period
    const graceDaysLeft = GRACE_PERIOD_DAYS + daysLeft; // daysLeft is ≤ 0 here
    if (graceDaysLeft > 0) {
      return {
        valid: true,
        status: 'grace',
        daysLeft: 0,
        graceDaysLeft,
        plan: gym.subscription_plan,
      };
    }

    // Past grace period — full lock-out (reads still work via route design)
    return { valid: false, status: 'expired', daysLeft: 0, plan: gym.subscription_plan };
  }

  return { valid: false, status: gym.subscription_status, daysLeft: 0, plan: gym.subscription_plan };
}

// Middleware to check subscription validity for write operations
export async function requireActiveSubscription(req, res, next) {
  try {
    const gym = await getOne('SELECT * FROM gyms WHERE id = ?', [req.user.gym_id]);

    if (!gym) {
      return res.status(404).json({ error: 'Gym not found' });
    }

    const subscription = checkSubscription(gym);

    if (!subscription.valid) {
      return res.status(403).json({
        error: `Your subscription has ${subscription.status === 'trial_expired' ? 'trial has expired' : 'expired'}. Please renew to continue using the system.`,
        subscription_status: subscription.status,
        subscription_valid: false
      });
    }

    // Attach subscription info to request
    req.subscription = subscription;
    req.gym = gym;
    next();
  } catch (error) {
    console.error('requireActiveSubscription error:', error);
    res.status(500).json({ error: 'Failed to verify subscription' });
  }
}

// Register a new gym
router.post('/register', validateRegister, async (req, res) => {
  try {
    const { gymName, ownerName, email, phone, password, colorTheme, logo } = req.body;

    if (!gymName || !ownerName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if email already exists
    const existingUser = await getOne('SELECT * FROM gym_users WHERE username = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create gym
    const gymId = uuidv4();
    let slug = gymName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    // Make slug unique if it already exists
    const existingSlug = await getOne('SELECT id FROM gyms WHERE slug = ?', [slug]);
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const today = new Date();
    const trialEnd = new Date(today);
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

    const gymInsertSql = `
      INSERT INTO gyms (id, name, slug, email, phone, subscription_status, subscription_plan, subscription_start, subscription_end, color_theme, logo, max_members, sms_enabled)
      VALUES (?, ?, ?, ?, ?, 'trial', 'free', ?, ?, ?, ?, 10, 1)
    `;
    const gymParams = [gymId, gymName, slug, email, phone || null, today.toISOString().split('T')[0], trialEnd.toISOString().split('T')[0], colorTheme || 'default', logo || null];

    await runQuery(gymInsertSql, gymParams);

    // Create admin user for the gym
    const userId = uuidv4();
    const hashedPassword = bcrypt.hashSync(password, 10);
    await runQuery(`
      INSERT INTO gym_users (id, gym_id, username, password, role)
      VALUES (?, ?, ?, ?, 'owner')
    `, [userId, gymId, email, hashedPassword]);

    // Create token
    const token = jwt.sign(
      { id: userId, gym_id: gymId, username: email, role: 'owner' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const subscription = checkSubscription({ subscription_status: 'trial', subscription_start: today.toISOString(), subscription_end: trialEnd.toISOString() });

    res.status(201).json({
      token,
      gym: {
        id: gymId,
        name: gymName,
        slug,
        email,
        color_theme: colorTheme || 'default',
        logo: logo || null,
        subscription_status: 'trial',
        subscription_plan: 'free',
        subscription_start: today.toISOString().split('T')[0],
        subscription_end: trialEnd.toISOString().split('T')[0],
        max_members: 10
      },
      user: {
        id: userId,
        username: email,
        role: 'owner'
      },
      subscription,
      message: `Welcome! Your 14-day free trial has started.`
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ error: 'Registration failed: ' + error.message });
  }
});

// Get features based on subscription plan
function getFeatures(plan) {
  const features = {
    free: {
      max_members: 10,
      sms_reminders: false,
      staff_management: false,
      reports_tab: false,
      revenue_tab: false
    },
    starter: {
      max_members: 100,
      sms_reminders: true,
      staff_management: true,
      reports_tab: false,
      revenue_tab: false
    },
    pro: {
      max_members: -1, // unlimited
      sms_reminders: true,
      staff_management: true,
      reports_tab: true,
      revenue_tab: true
    }
  };
  return features[plan] || features.free;
}

// Login
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await getOne('SELECT * FROM gym_users WHERE username = ?', [email]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const gym = await getOne('SELECT * FROM gyms WHERE id = ?', [user.gym_id]);
    if (!gym) {
      return res.status(404).json({ error: 'Gym not found' });
    }

    const subscription = checkSubscription(gym);
    const effectivePlan = subscription.status === 'trial' ? 'pro' : gym.subscription_plan;
    const features = getFeatures(effectivePlan);

    const token = jwt.sign(
      { id: user.id, gym_id: user.gym_id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      gym: {
        id: gym.id,
        name: gym.name,
        slug: gym.slug,
        email: gym.email,
        phone: gym.phone,
        address: gym.address,
        color_theme: gym.color_theme || 'default',
        logo: gym.logo,
        subscription_status: gym.subscription_status,
        subscription_plan: gym.subscription_plan,
        max_members: gym.max_members
      },
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      },
      subscription,
      features
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user and gym info
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await getOne('SELECT * FROM gym_users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const gym = await getOne('SELECT * FROM gyms WHERE id = ?', [user.gym_id]);
    if (!gym) {
      return res.status(404).json({ error: 'Gym not found' });
    }

    const subscription = checkSubscription(gym);
    const effectivePlan = subscription.status === 'trial' ? 'pro' : gym.subscription_plan;
    const features = getFeatures(effectivePlan);

    res.json({
      token: req.headers['authorization']?.split(' ')[1],
      gym: {
        id: gym.id,
        name: gym.name,
        slug: gym.slug,
        email: gym.email,
        phone: gym.phone,
        address: gym.address,
        logo: gym.logo,
        color_theme: gym.color_theme || 'default',
        subscription_status: gym.subscription_status,
        subscription_plan: gym.subscription_plan,
        subscription_start: gym.subscription_start,
        subscription_end: gym.subscription_end,
        max_members: gym.max_members,
        sms_enabled: gym.sms_enabled,
        sms_available: !!process.env.GEEZSMS_API_KEY
      },
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      },
      subscription,
      features
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Get subscription plans
router.get('/plans', (req, res) => {
  try {
    const plans = [
      {
        id: 'starter',
        name: 'Starter',
        price: 1499,
        currency: 'ETB',
        period: 'month',
        max_members: 100,
        trial_days: 14,
        features: [
          'Up to 100 members',
          'Automated SMS — welcome, payment & expiry alerts',
          'Up to 3 staff accounts with role-based access',
          'Attendance analytics — visit trends & peak hours',
          'Monthly expense & recurring bill tracking',
          'Pricing packages for faster registration',
        ]
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 3499,
        currency: 'ETB',
        period: 'month',
        max_members: -1,
        features: [
          'Unlimited members',
          'Everything in Starter',
          'Revenue analytics — income, plan breakdown & trends',
          'Retention insights — spot members at risk of leaving',
          'Equipment tracker — maintenance & condition logs',
          'CSV export & reports for any date range',
          'Unlimited staff accounts',
          'Priority support',
        ]
      }
    ];

    res.json(plans);
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: 'Failed to get plans' });
  }
});

// Update gym subscription (submit request to admin)
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const { plan_id, amount_paid, payment_proof, payment_method } = req.body;

    const plans = {
      'free': { price: 0, max_members: 10 },
      'starter': { price: 1499, max_members: 100 },
      'pro': { price: 5000, max_members: -1 }
    };

    if (!plans[plan_id]) {
      return res.status(400).json({ error: 'Invalid plan. Choose free, starter, or pro.' });
    }

    // Check if there's already a pending request
    let existingRequest = null;
    try {
      existingRequest = await getOne(`
        SELECT * FROM subscription_requests
        WHERE gym_id = ? AND status = 'pending'
      `, [req.user.gym_id]);
    } catch (e) {
      // Table might not exist, continue
    }

    if (existingRequest) {
      return res.status(400).json({ error: 'You already have a pending subscription request. Please wait for it to be reviewed.' });
    }

    // For free plan, activate immediately
    if (plan_id === 'free') {
      await runQuery(`
        UPDATE gyms SET
          subscription_status = 'active',
          subscription_plan = 'free',
          max_members = 10,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [req.user.gym_id]);

      const gym = await getOne('SELECT * FROM gyms WHERE id = ?', [req.user.gym_id]);
      return res.json({
        message: 'Free plan activated successfully',
        gym: {
          subscription_status: gym.subscription_status,
          subscription_plan: 'free',
          max_members: 10
        }
      });
    }

    // For paid plans, create a subscription request
    const requestId = uuidv4();

    try {
      await runQuery(`
        INSERT INTO subscription_requests (id, gym_id, requested_plan, amount_paid, payment_proof, payment_method, status)
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
      `, [requestId, req.user.gym_id, plan_id, amount_paid || plans[plan_id].price, payment_proof, payment_method]);
    } catch (e) {
      console.error('Failed to create subscription request:', e.message);
      return res.status(500).json({
        error: 'Database error. Please contact support.',
        details: e.message
      });
    }

    res.json({
      message: 'Subscription request submitted! Contact Hullu Gyms admin to approve your payment.',
      request_id: requestId,
      status: 'pending',
      next_steps: 'Go to admin dashboard at /admin-login to approve this request'
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ error: 'Failed to submit subscription request: ' + error.message });
  }
});

// Get gym settings
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const settings = await getAll("SELECT * FROM settings WHERE gym_id = ? OR gym_id = 'global'", [req.user.gym_id]);
    const settingsObj = {};
    settings.forEach(s => {
      settingsObj[s.key] = s.value;
    });
    res.json(settingsObj);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// Update gym profile
router.put('/gym', authenticateToken, async (req, res) => {
  try {
    const { name, phone, email, address, sms_enabled, color_theme, logo } = req.body;

    const VALID_THEMES = ['default', 'indigo', 'purple', 'rose', 'red', 'amber', 'lime', 'emerald', 'teal', 'gold', 'chocolate', 'slate'];

    const updates = [];
    const values = [];

    if (name) {
      updates.push('name = ?');
      values.push(name);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (address !== undefined) {
      updates.push('address = ?');
      values.push(address);
    }
    if (sms_enabled !== undefined) {
      updates.push('sms_enabled = ?');
      values.push(sms_enabled ? 1 : 0);
    }
    if (color_theme !== undefined && VALID_THEMES.includes(color_theme)) {
      updates.push('color_theme = ?');
      values.push(color_theme);
    }
    if (logo !== undefined) {
      updates.push('logo = ?');
      values.push(logo);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(req.user.gym_id);

      await runQuery(`UPDATE gyms SET ${updates.join(', ')} WHERE id = ?`, values);
      saveDatabase();
    }

    const gym = await getOne('SELECT * FROM gyms WHERE id = ?', [req.user.gym_id]);

    res.json({
      message: 'Gym profile updated',
      gym: {
        id: gym.id,
        name: gym.name,
        slug: gym.slug,
        email: gym.email,
        phone: gym.phone,
        address: gym.address,
        color_theme: gym.color_theme || 'default',
        logo: gym.logo,
        sms_enabled: gym.sms_enabled,
        sms_available: !!process.env.GEEZSMS_API_KEY,
      }
    });
  } catch (error) {
    console.error('Update gym error:', error);
    res.status(500).json({ error: 'Failed to update gym profile' });
  }
});

// Test SMS endpoint
router.post('/test-sms', authenticateToken, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });

    if (!process.env.GEEZSMS_API_KEY) {
      return res.status(503).json({ error: 'SMS is not configured on this server. Contact Hullu Gyms support.' });
    }

    const gym = await getOne('SELECT * FROM gyms WHERE id = ?', [req.user.gym_id]);
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    if (!gym.sms_enabled) return res.status(400).json({ error: 'SMS is not enabled for your gym. Turn it on in Settings first.' });

    const result = await smsService.sendSms(
      phone,
      `Test from ${gym.name} — SMS notifications are working! 💪 Powered by Hullu Gyms.`
    );

    if (result.success) {
      res.json({ message: 'Test SMS sent successfully' });
    } else {
      res.status(500).json({ error: result.message || 'Failed to send SMS' });
    }
  } catch (error) {
    console.error('Test SMS error:', error);
    res.status(500).json({ error: 'Failed to send test SMS' });
  }
});

// Forgot password — generate OTP and send via email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await getOne('SELECT * FROM gym_users WHERE username = ?', [email]);
    // Always respond generically to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If that email is registered, a reset code has been sent.' });
    }

    const gym = await getOne('SELECT * FROM gyms WHERE id = ?', [user.gym_id]);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const settingKey = `reset_otp_${email}`;

    // Store OTP (upsert)
    const existing = await getOne('SELECT * FROM settings WHERE gym_id = ? AND key = ?', [user.gym_id, settingKey]);
    if (existing) {
      await runQuery('UPDATE settings SET value = ? WHERE gym_id = ? AND key = ?',
        [JSON.stringify({ otp, expiry }), user.gym_id, settingKey]);
    } else {
      await runQuery('INSERT INTO settings (gym_id, key, value) VALUES (?, ?, ?)',
        [user.gym_id, settingKey, JSON.stringify({ otp, expiry })]);
    }

    // Send OTP via email
    try {
      await sendOtpEmail(email, otp, gym?.name);
    } catch (emailErr) {
      console.error('OTP email failed:', emailErr.message);
      return res.status(500).json({ error: emailErr.message });
    }

    res.json({ message: 'Reset code sent! Check your email inbox (and spam folder).' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset' });
  }
});

// Reset password with OTP
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const user = await getOne('SELECT * FROM gym_users WHERE username = ?', [email]);
    if (!user) return res.status(400).json({ error: 'Invalid or expired OTP' });

    const settingKey = `reset_otp_${email}`;
    const otpSetting = await getOne('SELECT * FROM settings WHERE gym_id = ? AND key = ?', [user.gym_id, settingKey]);
    if (!otpSetting) return res.status(400).json({ error: 'Invalid or expired OTP' });

    let stored;
    try { stored = JSON.parse(otpSetting.value); } catch { return res.status(400).json({ error: 'Invalid or expired OTP' }); }

    if (stored.otp !== otp || new Date(stored.expiry) < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await runQuery('UPDATE gym_users SET password = ? WHERE id = ?', [hashedPassword, user.id]);
    await runQuery('DELETE FROM settings WHERE gym_id = ? AND key = ?', [user.gym_id, settingKey]);

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// ── Per-gym key-value settings ────────────────────────────────────────────
// GET  /api/auth/gym-settings  → { revenue_goal: '50000', ... }
router.get('/gym-settings', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const rows = await getAll('SELECT key, value FROM settings WHERE gym_id = ?', [gymId]);
    const settings = {};
    for (const row of rows) settings[row.key] = row.value;
    res.json(settings);
  } catch (error) {
    console.error('Get gym settings error:', error);
    res.status(500).json({ error: 'Failed to load gym settings' });
  }
});

// PUT  /api/auth/gym-settings  body: { revenue_goal: 50000 }
router.put('/gym-settings', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const ALLOWED_KEYS = new Set(['revenue_goal']);
    for (const [key, value] of Object.entries(req.body)) {
      if (!ALLOWED_KEYS.has(key)) continue;
      await runQuery(
        `INSERT INTO settings (gym_id, key, value) VALUES (?, ?, ?)
         ON CONFLICT (gym_id, key) DO UPDATE SET value = EXCLUDED.value`,
        [gymId, key, String(value)]
      );
    }
    const rows = await getAll('SELECT key, value FROM settings WHERE gym_id = ?', [gymId]);
    const settings = {};
    for (const row of rows) settings[row.key] = row.value;
    res.json(settings);
  } catch (error) {
    console.error('Put gym settings error:', error);
    res.status(500).json({ error: 'Failed to save gym settings' });
  }
});

// Change password
router.post('/change-password', authenticateToken, validateChangePassword, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }

    const user = await getOne('SELECT * FROM gym_users WHERE id = ?', [req.user.id]);

    if (!bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await runQuery('UPDATE gym_users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ── Demo account ─────────────────────────────────────────────────────────────
// POST /demo — spin up a fresh isolated demo gym with realistic seed data.
// Each visitor gets their own copy so nobody interferes with anyone else.
// Demo gyms are silently purged after 3 hours.
router.post('/demo', async (req, res) => {
  try {
    // Fire-and-forget cleanup of demo gyms older than 3 hours
    runQuery(`DELETE FROM gyms WHERE slug LIKE 'demo-%' AND created_at < NOW() - INTERVAL '3 hours'`)
      .catch(() => {});

    const gymId  = uuidv4();
    const userId = uuidv4();
    const tag    = gymId.slice(0, 8);
    const slug   = `demo-${tag}`;
    const email  = `demo-${tag}@demo.hullugyms.com`;
    const now    = new Date();
    const subEnd = new Date(now); subEnd.setFullYear(subEnd.getFullYear() + 1);
    const rng    = (n) => Math.floor(Math.random() * n);
    const daysAgo = (d) => { const x = new Date(now); x.setDate(x.getDate() - d); return x; };
    const daysFrom = (d) => { const x = new Date(now); x.setDate(x.getDate() + d); return x; };
    const fmt = (d) => d.toISOString().split('T')[0];

    // Pro gym — SMS disabled (never send real messages from demo)
    await runQuery(`
      INSERT INTO gyms (id, name, slug, email, subscription_status, subscription_plan,
                        subscription_start, subscription_end, color_theme, max_members, sms_enabled)
      VALUES (?, 'Hullu Demo Gym', ?, ?, 'active', 'pro', ?, ?, 'default', 999, 0)
    `, [gymId, slug, email, fmt(now), fmt(subEnd)]);

    // Owner account
    await runQuery(
      `INSERT INTO gym_users (id, gym_id, username, password, role, name) VALUES (?, ?, ?, ?, 'owner', 'Demo Owner')`,
      [userId, gymId, email, bcrypt.hashSync('demo1234', 8)]
    );

    // ── Staff accounts ─────────────────────────────────────────────────────
    const STAFF = [
      { name: 'Kebede Alemu',   role: 'manager',      phone: '0912000001' },
      { name: 'Tigist Worku',   role: 'receptionist', phone: '0912000002' },
      { name: 'Samuel Tesfaye', role: 'trainer',      phone: '0912000003' },
    ];
    for (const s of STAFF) {
      const sEmail = `${s.name.toLowerCase().replace(' ', '.')}.${tag}@demo.com`;
      await runQuery(
        `INSERT INTO gym_users (id, gym_id, username, password, role, name) VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), gymId, sEmail, bcrypt.hashSync('demo1234', 8), s.role, s.name]
      );
    }

    // ── Members ────────────────────────────────────────────────────────────
    const AMOUNTS = { daily: 50, '3_days_week': 600, '1_month': 800,
                      '2_months': 1400, '3_months': 1900, '6_months': 3200, '1_year': 5500 };
    const MEMBERS = [
      // active — regular members
      { name: 'Abebe Tadesse',    phone: '0911100001', type: '1_month',     ago: 15,  left: 15,   st: 'active',   gender: 'male'   },
      { name: 'Meron Hailu',      phone: '0911100002', type: '3_months',    ago: 20,  left: 70,   st: 'active',   gender: 'female' },
      { name: 'Dawit Kebede',     phone: '0911100003', type: '6_months',    ago: 30,  left: 150,  st: 'active',   gender: 'male'   },
      { name: 'Yonas Girma',      phone: '0911100004', type: '1_year',      ago: 5,   left: 360,  st: 'active',   gender: 'male'   },
      { name: 'Hana Tesfaye',     phone: '0911100005', type: '3_days_week', ago: 10,  left: 20,   st: 'active',   gender: 'female' },
      { name: 'Tigist Ayele',     phone: '0911100006', type: '2_months',    ago: 25,  left: 35,   st: 'active',   gender: 'female' },
      { name: 'Almaz Bekele',     phone: '0911100007', type: '1_month',     ago: 12,  left: 18,   st: 'active',   gender: 'female' },
      { name: 'Kirubel Haile',    phone: '0911100008', type: '3_months',    ago: 45,  left: 45,   st: 'active',   gender: 'male'   },
      { name: 'Selam Tesfaye',    phone: '0911100009', type: '1_year',      ago: 60,  left: 305,  st: 'active',   gender: 'female' },
      { name: 'Biruk Alemu',      phone: '0911100010', type: '3_days_week', ago: 8,   left: 22,   st: 'active',   gender: 'male'   },
      { name: 'Lidya Girma',      phone: '0911100011', type: '1_month',     ago: 3,   left: 27,   st: 'active',   gender: 'female' },
      { name: 'Robel Mengistu',   phone: '0911100012', type: '6_months',    ago: 90,  left: 90,   st: 'active',   gender: 'male'   },
      // expiring soon — good for retention view
      { name: 'Sara Alemu',       phone: '0911100013', type: '1_month',     ago: 28,  left: 2,    st: 'expiring', gender: 'female' },
      { name: 'Bethlehem Girma',  phone: '0911100014', type: '6_months',    ago: 177, left: 3,    st: 'expiring', gender: 'female' },
      { name: 'Henok Tadesse',    phone: '0911100015', type: '3_months',    ago: 88,  left: 2,    st: 'expiring', gender: 'male'   },
      // expired — shows churn / retention needs
      { name: 'Bekele Worku',     phone: '0911100016', type: '1_month',     ago: 45,  left: -15,  st: 'expired',  gender: 'male'   },
      { name: 'Natnael Assefa',   phone: '0911100017', type: '1_month',     ago: 40,  left: -10,  st: 'expired',  gender: 'male'   },
      { name: 'Selamawit Hailu',  phone: '0911100018', type: '3_months',    ago: 100, left: -10,  st: 'expired',  gender: 'female' },
      // inactive
      { name: 'Firehiwot Dagne',  phone: '0911100019', type: '1_month',     ago: 70,  left: -40,  st: 'inactive', gender: 'female' },
      { name: 'Amanuel Bekele',   phone: '0911100020', type: '2_months',    ago: 120, left: -60,  st: 'inactive', gender: 'male'   },
    ];

    const seeded = [];
    for (const m of MEMBERS) {
      const cid    = uuidv4();
      const start  = daysAgo(m.ago);
      const end    = daysFrom(m.left);
      const isSess = ['daily', '3_days_week'].includes(m.type);
      seeded.push({ id: cid, st: m.st, name: m.name });

      await runQuery(`
        INSERT INTO customers (id, gym_id, name, phone, membership_type, membership_start,
                               membership_end, status, total_sessions, sessions_used,
                               welcome_sms_sent, gender)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      `, [cid, gymId, m.name, m.phone, m.type, fmt(start), fmt(end),
          m.st, isSess ? 12 : 0, isSess ? 4 : 0, m.gender]);

      // Primary payment (at registration)
      await runQuery(`
        INSERT INTO payments (id, gym_id, customer_id, amount, payment_method, payment_date,
                              membership_type, start_date, end_date)
        VALUES (?, ?, ?, ?, 'cash', ?, ?, ?, ?)
      `, [uuidv4(), gymId, cid, AMOUNTS[m.type] || 800,
          fmt(start), m.type, fmt(start), fmt(end)]);

      // Renewal payments for long-standing active members (adds revenue history)
      if (m.st === 'active' && m.ago > 35 && m.type !== '1_year' && m.type !== '6_months') {
        const prevEnd   = daysAgo(m.ago);
        const prevStart = daysAgo(m.ago + 30);
        await runQuery(`
          INSERT INTO payments (id, gym_id, customer_id, amount, payment_method, payment_date,
                                membership_type, start_date, end_date)
          VALUES (?, ?, ?, ?, 'mobile_transfer', ?, ?, ?, ?)
        `, [uuidv4(), gymId, cid, AMOUNTS['1_month'],
            fmt(prevStart), '1_month', fmt(prevStart), fmt(prevEnd)]);
      }
    }

    // ── Attendance — 30 days of realistic daily check-ins ─────────────────
    const active = seeded.filter(m => m.st === 'active' || m.st === 'expiring');
    for (let day = 0; day < 30; day++) {
      const base  = daysAgo(day);
      const isWkd = [0, 6].includes(base.getDay()); // fewer on weekends
      const count = isWkd ? 2 + rng(4) : 5 + rng(7);
      const picks = [...active].sort(() => Math.random() - 0.5).slice(0, count);
      for (const m of picks) {
        const cin  = new Date(base); cin.setHours(6 + rng(14), rng(60), 0, 0);
        const cout = new Date(cin);  cout.setMinutes(cout.getMinutes() + 45 + rng(75));
        await runQuery(
          `INSERT INTO attendance (id, gym_id, customer_id, check_in, check_out) VALUES (?, ?, ?, ?, ?)`,
          [uuidv4(), gymId, m.id, cin.toISOString(), cout.toISOString()]
        );
      }
    }

    // ── Equipment ─────────────────────────────────────────────────────────
    const EQUIPMENT = [
      { name: 'Treadmill Pro X3',      cat: 'Cardio',    price: 45000, ago: 400, svcAgo: 30,  nextSvc: 60,  status: 'operational', cond: 'good'      },
      { name: 'Treadmill Pro X3 #2',   cat: 'Cardio',    price: 45000, ago: 200, svcAgo: 20,  nextSvc: 70,  status: 'operational', cond: 'excellent'  },
      { name: 'Stationary Bike',        cat: 'Cardio',    price: 18000, ago: 500, svcAgo: 60,  nextSvc: 30,  status: 'operational', cond: 'fair'       },
      { name: 'Rowing Machine',         cat: 'Cardio',    price: 22000, ago: 300, svcAgo: 15,  nextSvc: 75,  status: 'operational', cond: 'good'       },
      { name: 'Barbell Set (Olympic)',  cat: 'Free Weights', price: 32000, ago: 600, svcAgo: 90, nextSvc: 90, status: 'operational', cond: 'good'      },
      { name: 'Dumbbell Rack 5-50kg',  cat: 'Free Weights', price: 28000, ago: 600, svcAgo: 90, nextSvc: 90, status: 'operational', cond: 'good'      },
      { name: 'Squat Rack',            cat: 'Strength',  price: 35000, ago: 450, svcAgo: 45,  nextSvc: 45,  status: 'operational', cond: 'good'       },
      { name: 'Leg Press Machine',     cat: 'Strength',  price: 40000, ago: 350, svcAgo: 30,  nextSvc: 60,  status: 'operational', cond: 'excellent'  },
      { name: 'Cable Crossover',       cat: 'Strength',  price: 55000, ago: 250, svcAgo: 25,  nextSvc: 65,  status: 'maintenance', cond: 'fair'       },
      { name: 'Smith Machine',         cat: 'Strength',  price: 48000, ago: 500, svcAgo: 60,  nextSvc: 30,  status: 'operational', cond: 'good'       },
      { name: 'Pull-up / Dip Station', cat: 'Bodyweight',price: 12000, ago: 700, svcAgo: 120, nextSvc: 60,  status: 'operational', cond: 'fair'       },
      { name: 'Battle Ropes (15m)',    cat: 'Cardio',    price: 4500,  ago: 200, svcAgo: 60,  nextSvc: 120, status: 'operational', cond: 'good'       },
    ];
    for (const eq of EQUIPMENT) {
      const purchased  = daysAgo(eq.ago);
      const lastSvc    = daysAgo(eq.svcAgo);
      const nextSvc    = daysFrom(eq.nextSvc);
      const warranty   = new Date(purchased); warranty.setFullYear(warranty.getFullYear() + 2);
      await runQuery(`
        INSERT INTO equipment (id, gym_id, name, category, purchase_date, purchase_price,
                               warranty_expiry, last_service_date, next_service_date, status, condition)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [uuidv4(), gymId, eq.name, eq.cat, fmt(purchased), eq.price,
          fmt(warranty), fmt(lastSvc), fmt(nextSvc), eq.status, eq.cond]);
    }

    // ── Expenses ──────────────────────────────────────────────────────────
    const EXPENSES = [
      ['Rent',              5000, 30, 'rent'],
      ['Electricity',        920, 25, 'utilities'],
      ['Water',              280, 25, 'utilities'],
      ['Equipment repair',  1800, 18, 'maintenance'],
      ['Cleaning supplies',  350, 10, 'supplies'],
      ['Rent',              5000, 60, 'rent'],
      ['Electricity',        870, 55, 'utilities'],
      ['Internet',           600, 28, 'utilities'],
      ['Staff refreshments', 450, 5,  'supplies'],
    ];
    for (const [desc, amt, dAgo, cat] of EXPENSES) {
      await runQuery(
        `INSERT INTO expenses (id, gym_id, description, amount, expense_date, category)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), gymId, desc, amt, fmt(daysAgo(dAgo)), cat]
      ).catch(() => {});
    }

    // ── JWT (3-hour expiry — demo only) ───────────────────────────────────
    const token = jwt.sign(
      { id: userId, gym_id: gymId, username: email, role: 'owner', is_demo: true },
      JWT_SECRET,
      { expiresIn: '3h' }
    );

    res.json({
      token,
      gym: {
        id: gymId, name: 'Hullu Demo Gym', slug, email,
        color_theme: 'default', logo: null,
        subscription_status: 'active', subscription_plan: 'pro', max_members: 999,
        sms_enabled: 0,
      },
      user: { id: userId, username: email, role: 'owner' },
      subscription: { valid: true, status: 'active', daysLeft: 365, plan: 'pro' },
      features: getFeatures('pro'),
      is_demo: true,
    });
  } catch (error) {
    console.error('Demo account error:', error.message);
    res.status(500).json({ error: 'Failed to create demo: ' + error.message });
  }
});

export { authenticateToken, JWT_SECRET };
export default router;
