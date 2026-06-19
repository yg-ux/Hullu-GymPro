import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getOne, getAll } from '../models/database.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// ── Short-code helpers ────────────────────────────────────────────────────────

/** Generate a random 7-char lowercase alphanumeric code. */
export function generateShortCode() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'; // no l/1/0/o to avoid confusion
  let code = '';
  for (let i = 0; i < 7; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/**
 * Return the short_code for a customer's portal token, generating and
 * persisting one on the fly if the row pre-dates this feature (lazy backfill).
 * Returns null if no portal token exists for this customer.
 */
export async function getOrCreateShortCode(customerId, gymId) {
  const row = await getOne(
    'SELECT token, short_code FROM portal_tokens WHERE customer_id = $1 AND gym_id = $2 LIMIT 1',
    [customerId, gymId]
  );
  if (!row) return null;
  if (row.short_code) return { token: row.token, shortCode: row.short_code };

  // Lazy backfill — existing token has no short_code yet; generate one.
  for (let attempt = 0; attempt < 5; attempt++) {
    const shortCode = generateShortCode();
    try {
      await runQuery(
        'UPDATE portal_tokens SET short_code = $1 WHERE customer_id = $2 AND gym_id = $3 AND short_code IS NULL',
        [shortCode, customerId, gymId]
      );
      return { token: row.token, shortCode };
    } catch (e) {
      // Unique constraint violation → retry with a new code
      const msg = e.message || '';
      if (!msg.includes('unique') && !msg.includes('UNIQUE') && !msg.includes('duplicate')) throw e;
    }
  }
  // Exhausted retries — fall back gracefully (no short URL this time)
  return { token: row.token, shortCode: null };
}

// Helper: compute current week start date (ISO Monday, local-ish)
function getCurrentWeekStart() {
  const now = new Date();
  const dow = now.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon);
  return monday.toISOString().split('T')[0];
}

// GET /resolve/:code — (PUBLIC) resolve a 7-char short code to its portal token
// Used by the /p/:code frontend redirect page.
router.get('/resolve/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const row = await getOne(
      'SELECT token FROM portal_tokens WHERE short_code = $1 LIMIT 1',
      [code]
    );
    if (!row) return res.status(404).json({ error: 'Link not found or expired' });
    res.json({ token: row.token });
  } catch (err) {
    console.error('GET /portal/resolve error:', err);
    res.status(500).json({ error: 'Failed to resolve link' });
  }
});

// POST /generate/:customerId — (authenticated) return existing token or create one if missing
router.post('/generate/:customerId', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { customerId } = req.params;

    const customer = await getOne('SELECT id FROM customers WHERE id = $1 AND gym_id = $2', [customerId, gymId]);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const clientUrl = process.env.CLIENT_URL?.split(',')[0]?.trim() || 'http://localhost:5173';

    // Return existing token if one already exists — never regenerate
    const existing = await getOne(
      'SELECT token, short_code FROM portal_tokens WHERE customer_id = $1 AND gym_id = $2 LIMIT 1',
      [customerId, gymId]
    );
    if (existing) {
      // Ensure it has a short_code (lazy backfill for old rows)
      const sc = await getOrCreateShortCode(customerId, gymId);
      return res.json({
        token: existing.token,
        url: `${clientUrl}/portal/${existing.token}`,
        short_url: sc?.shortCode ? `${clientUrl}/p/${sc.shortCode}` : null,
      });
    }

    // No token yet (member registered before this feature) — create one now
    const token = uuidv4();
    const id = uuidv4();
    const shortCode = generateShortCode();
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 10);

    await runQuery(
      `INSERT INTO portal_tokens (id, gym_id, customer_id, token, short_code, expires_at) VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, gymId, customerId, token, shortCode, expiresAt.toISOString()]
    );

    res.status(201).json({
      token,
      url: `${clientUrl}/portal/${token}`,
      short_url: `${clientUrl}/p/${shortCode}`,
    });
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
      `SELECT * FROM portal_tokens WHERE token = $1`,
      [token]
    );
    if (!portalToken) return res.status(404).json({ error: 'Invalid or expired portal link' });

    const { gym_id: gymId, customer_id: customerId } = portalToken;

    const gym = await getOne('SELECT name, logo, color_theme, phone FROM gyms WHERE id = $1', [gymId]);

    const customer = await getOne(
      `SELECT name, photo, membership_type, membership_start, membership_end, status,
              sessions_used, total_sessions, outstanding_balance, date_of_birth,
              visits_this_week, max_visits_per_week, week_start_date,
              is_frozen, frozen_until
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

    // Compute current week start (Monday) to detect stale week_start_date
    const now = new Date();
    const dow = now.getDay();
    const diffToMon = (dow === 0 ? -6 : 1 - dow);
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMon);
    const currentWeekStart = monday.toISOString().split('T')[0];
    // If week has rolled over, visits_this_week resets to 0
    const visitsThisWeek = customer.week_start_date === currentWeekStart
      ? (customer.visits_this_week || 0)
      : 0;

    // Check whether member is currently checked in (open attendance record)
    const openAttendance = await getOne(
      `SELECT id, check_in FROM attendance WHERE customer_id = $1 AND check_out IS NULL ORDER BY check_in DESC LIMIT 1`,
      [customerId]
    );

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
      visits_this_week: visitsThisWeek,
      max_visits_per_week: customer.max_visits_per_week || 0,
      is_checked_in: !!openAttendance,
      checked_in_at: openAttendance?.check_in || null,
    };

    res.json({ gym, member, attendance, payments, progress_photos: progressPhotos });
  } catch (err) {
    console.error('GET /portal/view error:', err);
    res.status(500).json({ error: 'Failed to load portal data' });
  }
});

// POST /check-in/:token — (PUBLIC) member self-check-in via portal token
router.post('/check-in/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const portalToken = await getOne(`SELECT * FROM portal_tokens WHERE token = $1`, [token]);
    if (!portalToken) return res.status(404).json({ error: 'Invalid portal link' });

    const { gym_id: gymId, customer_id: customerId } = portalToken;

    const customer = await getOne(
      `SELECT id, name, status, membership_type, membership_end, is_frozen, frozen_until,
              sessions_used, total_sessions, visits_this_week, max_visits_per_week, week_start_date
       FROM customers WHERE id = $1 AND gym_id = $2`,
      [customerId, gymId]
    );
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    // Block if frozen
    if (customer.is_frozen) {
      const untilStr = customer.frozen_until
        ? ` until ${new Date(customer.frozen_until).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        : '';
      return res.status(400).json({ error: `Your membership is frozen${untilStr}. Please contact the gym.` });
    }

    // Block if expired
    if (customer.status === 'expired') {
      return res.status(400).json({ error: 'Your membership has expired. Please renew to check in.' });
    }

    // Block if already checked in
    const openRecord = await getOne(
      `SELECT id FROM attendance WHERE customer_id = $1 AND check_out IS NULL ORDER BY check_in DESC LIMIT 1`,
      [customerId]
    );
    if (openRecord) return res.status(400).json({ error: 'You are already checked in.' });

    const isSessionType = ['daily', '3_days_week'].includes(customer.membership_type);

    // Block if no sessions remaining (session-based memberships)
    if (isSessionType) {
      const remaining = Math.max(0, (customer.total_sessions || 0) - (customer.sessions_used || 0));
      if (remaining <= 0) {
        return res.status(400).json({ error: 'No sessions remaining. Please purchase more sessions.' });
      }
    }

    // Block if weekly limit reached (3_days_week)
    if (customer.membership_type === '3_days_week' && customer.max_visits_per_week > 0) {
      const currentWeekStart = getCurrentWeekStart();
      const visitsThisWeek = customer.week_start_date === currentWeekStart
        ? (customer.visits_this_week || 0) : 0;
      if (visitsThisWeek >= customer.max_visits_per_week) {
        return res.status(400).json({
          error: `Weekly visit limit reached (${customer.max_visits_per_week} visits/week). Resets next Monday.`,
        });
      }
    }

    // Insert attendance record
    const id = uuidv4();
    await runQuery(
      `INSERT INTO attendance (id, gym_id, customer_id, check_in) VALUES ($1, $2, $3, NOW())`,
      [id, gymId, customerId]
    );

    // Update session counters
    if (isSessionType) {
      if (customer.membership_type === '3_days_week') {
        const currentWeekStart = getCurrentWeekStart();
        const visitsThisWeek = customer.week_start_date === currentWeekStart
          ? (customer.visits_this_week || 0) : 0;
        await runQuery(
          `UPDATE customers SET sessions_used = sessions_used + 1, visits_this_week = $1, week_start_date = $2 WHERE id = $3`,
          [visitsThisWeek + 1, currentWeekStart, customerId]
        );
      } else {
        await runQuery(`UPDATE customers SET sessions_used = sessions_used + 1 WHERE id = $1`, [customerId]);
      }
    }

    res.json({ success: true, message: 'Checked in successfully', attendance_id: id });
  } catch (err) {
    console.error('POST /portal/check-in error:', err);
    res.status(500).json({ error: 'Failed to check in' });
  }
});

// POST /check-out/:token — (PUBLIC) member self-check-out via portal token
router.post('/check-out/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const portalToken = await getOne(`SELECT * FROM portal_tokens WHERE token = $1`, [token]);
    if (!portalToken) return res.status(404).json({ error: 'Invalid portal link' });

    const { customer_id: customerId } = portalToken;

    const openRecord = await getOne(
      `SELECT id FROM attendance WHERE customer_id = $1 AND check_out IS NULL ORDER BY check_in DESC LIMIT 1`,
      [customerId]
    );
    if (!openRecord) return res.status(400).json({ error: 'You are not currently checked in.' });

    await runQuery(`UPDATE attendance SET check_out = NOW() WHERE id = $1`, [openRecord.id]);

    res.json({ success: true, message: 'Checked out successfully' });
  } catch (err) {
    console.error('POST /portal/check-out error:', err);
    res.status(500).json({ error: 'Failed to check out' });
  }
});

// GET /my/:customerId — (authenticated) get existing token for a customer
router.get('/my/:customerId', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { customerId } = req.params;

    const portalToken = await getOne(
      `SELECT token FROM portal_tokens WHERE customer_id = $1 AND gym_id = $2 LIMIT 1`,
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
