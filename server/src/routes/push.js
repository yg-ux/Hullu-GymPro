import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getOne, getAll } from '../models/database.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// GET /vapid-public-key — return VAPID public key for client subscription
router.get('/vapid-public-key', authenticateToken, (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return res.status(503).json({ error: 'Push notifications not configured' });
  res.json({ publicKey: key });
});

// POST /subscribe — save a push subscription
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const userId = req.user.id;
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'endpoint, keys.p256dh and keys.auth are required' });
    }

    // Upsert — delete old record for this user+endpoint, then insert fresh
    await runQuery('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?', [userId, endpoint]);
    await runQuery(
      `INSERT INTO push_subscriptions (id, gym_id, user_id, endpoint, p256dh, auth)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), gymId, userId, endpoint, keys.p256dh, keys.auth]
    );

    res.status(201).json({ message: 'Subscribed to push notifications' });
  } catch (err) {
    console.error('POST /push/subscribe error:', err);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

// DELETE /unsubscribe — remove a push subscription
router.delete('/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'endpoint is required' });
    await runQuery('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?', [userId, endpoint]);
    res.json({ message: 'Unsubscribed' });
  } catch (err) {
    console.error('DELETE /push/unsubscribe error:', err);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// POST /send-test — send a test notification to the current user
router.post('/send-test', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const userId = req.user.id;

    const webpush = await import('web-push').catch(() => null);
    if (!webpush) return res.status(503).json({ error: 'web-push not installed. Run: npm install web-push' });

    const vPublic  = process.env.VAPID_PUBLIC_KEY;
    const vPrivate = process.env.VAPID_PRIVATE_KEY;
    const vEmail   = process.env.VAPID_EMAIL || 'mailto:admin@example.com';
    if (!vPublic || !vPrivate) return res.status(503).json({ error: 'VAPID keys not configured' });

    webpush.default.setVapidDetails(vEmail, vPublic, vPrivate);

    const subs = await getAll('SELECT * FROM push_subscriptions WHERE user_id = ? AND gym_id = ?', [userId, gymId]);
    if (!subs.length) return res.status(404).json({ error: 'No push subscriptions found for this user' });

    const payload = JSON.stringify({
      title: 'Hullu Gym 🏋️',
      body: 'Push notifications are working!',
      icon: '/logo.svg',
    });

    const results = await Promise.allSettled(
      subs.map(s => webpush.default.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload))
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    res.json({ message: `Test notification sent to ${sent}/${subs.length} subscription(s)` });
  } catch (err) {
    console.error('POST /push/send-test error:', err);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

export default router;
