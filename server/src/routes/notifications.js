import express from 'express';
import { authenticateToken } from './auth.js';
import { getAll } from '../models/database.js';

const router = express.Router();

// GET /api/notifications — recent activity feed for this gym
router.get('/', authenticateToken, async (req, res) => {
  const gymId = req.user.gym_id;
  if (!gymId) return res.status(403).json({ error: 'Gym access required' });
  try {
    const [recentPayments, recentCheckins, expiringSoon] = await Promise.all([
      getAll(`
        SELECT 'payment' as type, c.name as member_name, p.amount, p.payment_date as created_at
        FROM payments p JOIN customers c ON p.customer_id = c.id
        WHERE p.gym_id = ? ORDER BY p.payment_date DESC LIMIT 5
      `, [gymId]),
      getAll(`
        SELECT 'checkin' as type, c.name as member_name, a.check_in as created_at
        FROM attendance a JOIN customers c ON a.customer_id = c.id
        WHERE a.gym_id = ? ORDER BY a.check_in DESC LIMIT 5
      `, [gymId]),
      getAll(`
        SELECT 'expiring' as type, name as member_name, membership_end as created_at
        FROM customers
        WHERE gym_id = ? AND status = 'active'
          AND date(membership_end) BETWEEN date('now') AND date('now', '+3 days')
        ORDER BY membership_end ASC LIMIT 5
      `, [gymId]),
    ]);

    const all = [...recentPayments, ...recentCheckins, ...expiringSoon]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 15);

    res.json({ notifications: all, count: all.length });
  } catch (err) {
    console.error('Notifications error:', err);
    res.status(500).json({ error: 'Failed to load notifications' });
  }
});

export default router;
