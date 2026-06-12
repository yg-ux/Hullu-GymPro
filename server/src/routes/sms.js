import express from 'express';
import { authenticateToken } from './auth.js';
import { getAll } from '../models/database.js';
import { smsService } from '../services/smsService.js';

const router = express.Router();

// ── GET /api/sms/logs ────────────────────────────────────────────────────────
// Recent SMS log for this gym (last 100 entries)
router.get('/logs', authenticateToken, async (req, res) => {
  const gymId = req.user.gym_id;
  if (!gymId) return res.status(403).json({ error: 'Gym access required' });
  try {
    const logs = await getAll(`
      SELECT
        sl.id, sl.message_type, sl.phone, sl.message, sl.status,
        sl.sent_at, sl.created_at,
        c.name AS customer_name
      FROM sms_logs sl
      LEFT JOIN customers c ON sl.customer_id = c.id
      WHERE sl.gym_id = ?
      ORDER BY sl.created_at DESC
      LIMIT 100
    `, [gymId]);
    res.json(logs);
  } catch (error) {
    console.error('SMS logs error:', error);
    res.status(500).json({ error: 'Failed to get SMS logs' });
  }
});

// ── GET /api/sms/preview ─────────────────────────────────────────────────────
// Returns the rendered text of every SMS type using the gym's real name
router.get('/preview', authenticateToken, async (req, res) => {
  const gymId = req.user.gym_id;
  if (!gymId) return res.status(403).json({ error: 'Gym access required' });
  try {
    const { getOne } = await import('../models/database.js');
    const gym = await getOne('SELECT name, phone FROM gyms WHERE id = ?', [gymId]);
    if (!gym) return res.status(404).json({ error: 'Gym not found' });

    const gymObj = { name: gym.name, phone: gym.phone };

    // Fake customer that mimics a real membership
    const in3Days = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
    const in30Days = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    const fakeCustomer = {
      name: 'Abebe Bikila',
      phone: gym.phone || '0912345678',
      membership_type: '1_month',
      membership_end: in3Days,
      amount: 500,
    };
    const fakePayment = {
      amount: 500,
      end_date: in30Days,
    };

    // Capture message text without sending by temporarily monkey-patching
    const previews = {};

    const capture = (methodFn, key, ...args) => {
      return new Promise(async (resolve) => {
        const originalSend = smsService.sendSms.bind(smsService);
        smsService.sendSms = async (_phone, msg) => {
          previews[key] = msg;
          smsService.sendSms = originalSend;
          resolve();
          return { success: true, preview: true };
        };
        await methodFn.call(smsService, ...args);
      });
    };

    await capture(smsService.sendWelcomeSms,        'welcome',     fakeCustomer,             gymObj);
    await capture(smsService.sendPaymentConfirmation,'payment',     fakeCustomer, fakePayment, gymObj);
    await capture(smsService.sendMembershipExpiryReminder, 'expiry_3d', fakeCustomer, gymObj, 3);
    await capture(smsService.sendMembershipExpiryReminder, 'expiry_1d', fakeCustomer, gymObj, 1);
    await capture(smsService.sendMembershipExpiryReminder, 'expiry_0d', fakeCustomer, gymObj, 0);

    res.json(previews);
  } catch (error) {
    console.error('SMS preview error:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

// ── POST /api/sms/send-test ──────────────────────────────────────────────────
// Send a real test SMS to verify delivery
router.post('/send-test', authenticateToken, async (req, res) => {
  const gymId = req.user.gym_id;
  if (!gymId) return res.status(403).json({ error: 'Gym access required' });

  const { phone, type = 'welcome' } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number required' });

  try {
    const { getOne } = await import('../models/database.js');
    const gym = await getOne('SELECT name, phone FROM gyms WHERE id = ?', [gymId]);
    if (!gym) return res.status(404).json({ error: 'Gym not found' });

    const gymObj = { name: gym.name, phone: gym.phone };
    const fakeCustomer = {
      name: 'Test Member',
      phone,
      membership_type: '1_month',
      membership_end: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      amount: 500,
    };
    const fakePayment = { amount: 500, end_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] };

    let result;
    if (type === 'welcome')       result = await smsService.sendWelcomeSms(fakeCustomer, gymObj);
    else if (type === 'payment')  result = await smsService.sendPaymentConfirmation(fakeCustomer, fakePayment, gymObj);
    else if (type === 'expiry_3d') result = await smsService.sendMembershipExpiryReminder(fakeCustomer, gymObj, 3);
    else if (type === 'expiry_1d') result = await smsService.sendMembershipExpiryReminder(fakeCustomer, gymObj, 1);
    else if (type === 'expiry_0d') result = await smsService.sendMembershipExpiryReminder(fakeCustomer, gymObj, 0);
    else return res.status(400).json({ error: 'Unknown SMS type' });

    res.json({ success: result?.success, message: result?.message });
  } catch (error) {
    console.error('SMS test send error:', error);
    res.status(500).json({ error: 'Failed to send test SMS' });
  }
});

export default router;
