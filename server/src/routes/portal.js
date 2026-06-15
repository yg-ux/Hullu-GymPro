import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getOne, getAll } from '../models/database.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// POST /generate/:customerId — (authenticated) generate or refresh portal token
router.post('/generate/:customerId', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { customerId } = req.params;

    const customer = await getOne('SELECT id FROM customers WHERE id = $1 AND gym_id = $2', [customerId, gymId]);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    await runQuery('DELETE FROM portal_tokens WHERE customer_id = $1 AND gym_id = $2', [customerId, gymId]);

    const token = uuidv4();
    const id = uuidv4();
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    await runQuery(
      `INSERT INTO portal_tokens (id, gym_id, customer_id, token, expires_at) VALUES ($1, $2, $3, $4, $5)`,
      [id, gymId, customerId, token, expiresAt.toISOString()]
    );

    const clientUrl = process.env.CLIENT_URL?.split(',')[0]?.trim() || 'http://localhost:5173';
    res.status(201).json({ token, url: `${clientUrl}/portal/${token}` });
  } catch (err) {
    console.error('POST /portal/generate error:', err);
    res.status(500).json({ error: 'Failed to generate portal token' });
  }
});

// GET /view/:token — (PUBLIC, no auth) return member portal data
router.get('/view/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const portalToken = await getOne(
      `SELECT * FROM portal_tokens WHERE token = $1 AND (expires_at IS NULL OR expires_at > NOW())`,
      [token]
    );
    if (!portalToken) return res.status(404).json({ error: 'Invalid or expired portal link' });

    const { gym_id: gymId, customer_id: customerId } = portalToken;

    const gym = await getOne('SELECT name, logo, color_theme, phone FROM gyms WHERE id = $1', [gymId]);

    const customer = await getOne(
      `SELECT name, photo, membership_type, membership_start, membership_end, status,
              sessions_used, total_sessions, outstanding_balance, date_of_birth
       FROM customers WHERE id = $1 AND gym_id = $2`,
      [customerId, gymId]
    );
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    let daysUntilExpiry = null;
    if (customer.membership_end) {
      daysUntilExpiry = Math.ceil((new Date(customer.membership_end) - new Date()) / (1000 * 60 * 60 * 24));
    }

    const sessionsRemaining = customer.total_sessions != null
      ? Math.max(0, (customer.total_sessions || 0) - (customer.sessions_used || 0))
      : null;

    const [attendance, payments, progressPhotos] = await Promise.all([
      getAll(`SELECT check_in, check_out FROM attendance WHERE customer_id = $1 ORDER BY check_in DESC LIMIT 10`, [customerId]),
      getAll(`SELECT amount, payment_date, membership_type, payment_method FROM payments WHERE customer_id = $1 ORDER BY payment_date DESC LIMIT 5`, [customerId]),
      getAll(`SELECT photo_data, taken_at, angle, notes, weight FROM progress_photos WHERE customer_id = $1 ORDER BY taken_at DESC LIMIT 4`, [customerId]),
    ]);

    // Build member object with all computed fields the client expects
    const member = {
      ...customer,
      days_until_expiry: daysUntilExpiry,
      sessions_remaining: sessionsRemaining,
    };

    res.json({ gym, member, attendance, payments, progress_photos: progressPhotos });
  } catch (err) {
    console.error('GET /portal/view error:', err);
    res.status(500).json({ error: 'Failed to load portal data' });
  }
});

// GET /my/:customerId — (authenticated) get existing token for a customer
router.get('/my/:customerId', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { customerId } = req.params;

    const portalToken = await getOne(
      `SELECT token FROM portal_tokens WHERE customer_id = $1 AND gym_id = $2 AND (expires_at IS NULL OR expires_at > NOW())`,
      [customerId, gymId]
    );
    if (!portalToken) return res.json({ token: null });

    const clientUrl = process.env.CLIENT_URL?.split(',')[0]?.trim() || 'http://localhost:5173';
    res.json({ token: portalToken.token, url: `${clientUrl}/portal/${portalToken.token}` });
  } catch (err) {
    console.error('GET /portal/my error:', err);
    res.status(500).json({ error: 'Failed to fetch portal token' });
  }
});

export default router;
