import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getOne, getAll, saveDatabase } from '../models/database.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'afro-gym-saas-secret-key-2024';
const TRIAL_DAYS = 14;

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
  if (!gym.subscription_status) {
    return { valid: false, status: 'inactive', daysLeft: 0 };
  }

  if (gym.subscription_status === 'active') {
    const endDate = new Date(gym.subscription_end);
    const today = new Date();
    const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 0) {
      return { valid: false, status: 'expired', daysLeft: 0 };
    }
    return { valid: true, status: 'active', daysLeft };
  }

  if (gym.subscription_status === 'trial') {
    const startDate = new Date(gym.subscription_start);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + TRIAL_DAYS);
    const today = new Date();
    const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 0) {
      return { valid: false, status: 'trial_expired', daysLeft: 0 };
    }
    return { valid: true, status: 'trial', daysLeft };
  }

  return { valid: false, status: gym.subscription_status, daysLeft: 0 };
}

// Register a new gym
router.post('/register', async (req, res) => {
  try {
    const { gymName, ownerName, email, phone, password, colorTheme, logo } = req.body;

    if (!gymName || !ownerName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if email already exists
    const existingUser = getOne('SELECT * FROM gym_users WHERE username = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create gym
    const gymId = uuidv4();
    let slug = gymName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    
    // Make slug unique if it already exists
    let existingSlug = getOne('SELECT id FROM gyms WHERE slug = ?', [slug]);
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }
    
    const today = new Date();
    const trialEnd = new Date(today);
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

    const gymInsertSql = `
      INSERT INTO gyms (id, name, slug, email, phone, subscription_status, subscription_plan, subscription_start, subscription_end, color_theme, logo, max_members)
      VALUES (?, ?, ?, ?, ?, 'active', 'free', ?, ?, ?, ?, 10)
    `;
    const gymParams = [gymId, gymName, slug, email, phone || null, today.toISOString().split('T')[0], today.toISOString().split('T')[0], colorTheme || 'default', logo || null];
    
    runQuery(gymInsertSql, gymParams);

    // Create admin user for the gym
    const userId = uuidv4();
    const hashedPassword = bcrypt.hashSync(password, 10);
    runQuery(`
      INSERT INTO gym_users (id, gym_id, username, password, role)
      VALUES (?, ?, ?, ?, 'owner')
    `, [userId, gymId, email, hashedPassword]);

    // Create token
    const token = jwt.sign(
      { id: userId, gym_id: gymId, username: email, role: 'owner' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const subscription = checkSubscription({ subscription_status: 'active', subscription_start: today.toISOString(), subscription_end: today.toISOString() });

    res.status(201).json({
      token,
      gym: {
        id: gymId,
        name: gymName,
        slug,
        email,
        color_theme: colorTheme || 'default',
        logo: logo || null,
        subscription_status: 'active',
        subscription_plan: 'free',
        max_members: 10
      },
      user: {
        id: userId,
        username: email,
        role: 'owner'
      },
      subscription,
      message: `Welcome! Your free plan includes up to 10 members.`
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
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = getOne('SELECT * FROM gym_users WHERE username = ?', [email]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const gym = getOne('SELECT * FROM gyms WHERE id = ?', [user.gym_id]);
    if (!gym) {
      return res.status(404).json({ error: 'Gym not found' });
    }

    const subscription = checkSubscription(gym);
    const features = getFeatures(gym.subscription_plan);

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
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = getOne('SELECT * FROM gym_users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const gym = getOne('SELECT * FROM gyms WHERE id = ?', [user.gym_id]);
    if (!gym) {
      return res.status(404).json({ error: 'Gym not found' });
    }

    const subscription = checkSubscription(gym);
    const features = getFeatures(gym.subscription_plan);

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
        subscription_status: gym.subscription_status,
        subscription_plan: gym.subscription_plan,
        subscription_start: gym.subscription_start,
        subscription_end: gym.subscription_end,
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
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Get subscription plans
router.get('/plans', (req, res) => {
  try {
    const plans = [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        currency: 'ETB',
        period: 'forever',
        max_members: 10,
        features: [
          'Up to 10 members',
          'Basic customer management',
          'Payment tracking',
          'Check-in/out system'
        ]
      },
      {
        id: 'starter',
        name: 'Starter',
        price: 1600,
        currency: 'ETB',
        period: 'month',
        max_members: 100,
        features: [
          'Up to 100 members',
          'Everything in Free',
          'Staff management',
          'SMS reminders',
          'Email support'
        ]
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 5000,
        currency: 'ETB',
        period: 'month',
        max_members: -1, // unlimited
        features: [
          'Unlimited members',
          'Everything in Starter',
          'Reports & Analytics',
          'Revenue tracking',
          'Priority support',
          'SMS reminders'
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
router.post('/subscribe', authenticateToken, (req, res) => {
  try {
    const { plan_id, amount_paid, payment_proof, payment_method } = req.body;

    const plans = {
      'free': { price: 0, max_members: 10 },
      'starter': { price: 1600, max_members: 100 },
      'pro': { price: 5000, max_members: -1 }
    };

    if (!plans[plan_id]) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    // Check if there's already a pending request
    const existingRequest = getOne(`
      SELECT * FROM subscription_requests 
      WHERE gym_id = ? AND status = 'pending'
    `, [req.user.gym_id]);

    if (existingRequest) {
      return res.status(400).json({ error: 'You already have a pending subscription request' });
    }

    // For free plan, activate immediately
    if (plan_id === 'free') {
      runQuery(`
        UPDATE gyms SET
          subscription_status = 'active',
          subscription_plan = 'free',
          max_members = 10,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [req.user.gym_id]);

      const gym = getOne('SELECT * FROM gyms WHERE id = ?', [req.user.gym_id]);
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
    runQuery(`
      INSERT INTO subscription_requests (id, gym_id, requested_plan, amount_paid, payment_proof, payment_method, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `, [requestId, req.user.gym_id, plan_id, amount_paid || plans[plan_id].price, payment_proof, payment_method]);

    res.json({
      message: 'Subscription request submitted. You will be notified once reviewed by admin.',
      request_id: requestId,
      status: 'pending'
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ error: 'Failed to submit subscription request' });
  }
});

// Get gym settings
router.get('/settings', authenticateToken, (req, res) => {
  try {
    const settings = getAll('SELECT * FROM settings WHERE gym_id = ? OR gym_id = "global"', [req.user.gym_id]);
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
router.put('/gym', authenticateToken, (req, res) => {
  try {
    const { name, phone, address } = req.body;

    const updates = [];
    const values = [];

    if (name) {
      updates.push('name = ?');
      values.push(name);
    }
    if (phone) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (address) {
      updates.push('address = ?');
      values.push(address);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(req.user.gym_id);
      
      runQuery(`UPDATE gyms SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    const gym = getOne('SELECT * FROM gyms WHERE id = ?', [req.user.gym_id]);

    res.json({
      message: 'Gym profile updated',
      gym: {
        id: gym.id,
        name: gym.name,
        slug: gym.slug,
        email: gym.email,
        phone: gym.phone,
        address: gym.address
      }
    });
  } catch (error) {
    console.error('Update gym error:', error);
    res.status(500).json({ error: 'Failed to update gym profile' });
  }
});

// Change password
router.post('/change-password', authenticateToken, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }

    const user = getOne('SELECT * FROM gym_users WHERE id = ?', [req.user.id]);

    if (!bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    runQuery('UPDATE gym_users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export { authenticateToken, JWT_SECRET };
export default router;
