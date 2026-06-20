import express from 'express';
import { getAll, getOne, runQuery } from '../models/database.js';
import { authenticateAdmin } from './adminAuth.js';
import { randomUUID } from 'crypto';

const router = express.Router();
router.use(authenticateAdmin);

const CATEGORIES = ['infrastructure', 'sms', 'marketing', 'software', 'other'];

// ── helpers ──────────────────────────────────────────────────────────────────

async function getCurrentPrices() {
  const prices = {};
  for (const plan of ['starter', 'pro']) {
    const row = await getOne(
      `SELECT price FROM admin_plan_prices WHERE plan = ? ORDER BY effective_from DESC LIMIT 1`,
      [plan]
    );
    prices[plan] = row ? parseFloat(row.price) : (plan === 'starter' ? 1499 : 3499);
  }
  return prices;
}

async function buildPnL(monthStr) {
  // monthStr = 'YYYY-MM'
  const monthStart = `${monthStr}-01`;
  const monthEnd   = `${monthStr}-31`; // safe upper bound for any month

  // Active expenses for this month
  const expenses = await getAll(
    `SELECT * FROM admin_expenses
     WHERE started_at <= ? AND (ended_at IS NULL OR ended_at >= ?)
     ORDER BY category, name`,
    [monthEnd, monthStart]
  );

  // Break down by category
  const breakdown = {};
  for (const cat of CATEGORIES) breakdown[cat] = { monthly: 0, yearly: 0 };

  let monthlyTotal = 0;
  let yearlyTotal  = 0;

  for (const e of expenses) {
    const amt = parseFloat(e.amount) || 0;
    const cat = CATEGORIES.includes(e.category) ? e.category : 'other';
    if (e.frequency === 'yearly') {
      breakdown[cat].yearly += amt;
      yearlyTotal += amt;
    } else {
      breakdown[cat].monthly += amt;
      monthlyTotal += amt;
    }
  }

  const yearlyMonthly = yearlyTotal / 12;
  const totalExpenses = monthlyTotal + yearlyMonthly;

  // Category totals (monthly-equivalent)
  const categoryTotals = {};
  for (const [cat, v] of Object.entries(breakdown)) {
    categoryTotals[cat] = v.monthly + v.yearly / 12;
  }

  // Gym counts
  const counts = await getOne(
    `SELECT
       COUNT(*) FILTER (WHERE subscription_plan = 'starter' AND subscription_status IN ('active','trial')) AS starter,
       COUNT(*) FILTER (WHERE subscription_plan = 'pro'     AND subscription_status IN ('active','trial')) AS pro,
       COUNT(*) FILTER (WHERE subscription_plan = 'free')   AS free
     FROM gyms`
  );

  const prices  = await getCurrentPrices();
  const starter = parseInt(counts?.starter || 0);
  const pro     = parseInt(counts?.pro     || 0);
  const free    = parseInt(counts?.free    || 0);
  const mrr     = starter * prices.starter + pro * prices.pro;
  const netProfit = mrr - totalExpenses;

  return {
    month: monthStr,
    starter_count: starter,
    pro_count: pro,
    free_count: free,
    prices,
    mrr,
    monthly_expenses: monthlyTotal,
    yearly_expenses_monthly: yearlyMonthly,
    total_expenses: totalExpenses,
    net_profit: netProfit,
    expense_breakdown: categoryTotals,
    expenses, // full list for the current summary
  };
}

// ── GET /api/admin/financials/summary ────────────────────────────────────────
router.get('/summary', async (req, res) => {
  try {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const pnl = await buildPnL(month);
    res.json(pnl);
  } catch (err) {
    console.error('Financials summary error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/admin/financials/snapshot ──────────────────────────────────────
// Save (upsert) a P&L snapshot for the current month
router.post('/snapshot', async (req, res) => {
  try {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const pnl = await buildPnL(month);

    const existing = await getOne(`SELECT id FROM admin_pl_snapshots WHERE month = ?`, [month]);
    if (existing) {
      await runQuery(
        `UPDATE admin_pl_snapshots SET
           starter_count = ?, pro_count = ?, free_count = ?, mrr = ?,
           monthly_expenses = ?, yearly_expenses_monthly = ?,
           total_expenses = ?, net_profit = ?, expense_breakdown = ?,
           updated_at = NOW()
         WHERE month = ?`,
        [pnl.starter_count, pnl.pro_count, pnl.free_count, pnl.mrr,
         pnl.monthly_expenses, pnl.yearly_expenses_monthly,
         pnl.total_expenses, pnl.net_profit,
         JSON.stringify(pnl.expense_breakdown), month]
      );
    } else {
      await runQuery(
        `INSERT INTO admin_pl_snapshots
           (id, month, starter_count, pro_count, free_count, mrr,
            monthly_expenses, yearly_expenses_monthly, total_expenses,
            net_profit, expense_breakdown)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [randomUUID(), month, pnl.starter_count, pnl.pro_count, pnl.free_count,
         pnl.mrr, pnl.monthly_expenses, pnl.yearly_expenses_monthly,
         pnl.total_expenses, pnl.net_profit, JSON.stringify(pnl.expense_breakdown)]
      );
    }
    res.json({ success: true, month });
  } catch (err) {
    console.error('Snapshot error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/financials/history ────────────────────────────────────────
router.get('/history', async (req, res) => {
  try {
    const rows = await getAll(
      `SELECT * FROM admin_pl_snapshots ORDER BY month DESC LIMIT 24`,
      []
    );
    res.json(rows.reverse()); // oldest first for chart
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/financials/expenses ───────────────────────────────────────
router.get('/expenses', async (req, res) => {
  try {
    const rows = await getAll(
      `SELECT * FROM admin_expenses
       WHERE ended_at IS NULL
       ORDER BY category, name`,
      []
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/admin/financials/expenses ──────────────────────────────────────
router.post('/expenses', async (req, res) => {
  const { name, category = 'other', amount, frequency = 'monthly', notes, started_at } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  if (!amount || isNaN(amount)) return res.status(400).json({ error: 'Valid amount is required' });
  try {
    const id = randomUUID();
    await runQuery(
      `INSERT INTO admin_expenses (id, name, category, amount, frequency, notes, started_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, name.trim(), category, parseFloat(amount), frequency, notes || null,
       started_at || new Date().toISOString().split('T')[0]]
    );
    const row = await getOne(`SELECT * FROM admin_expenses WHERE id = ?`, [id]);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/admin/financials/expenses/:id ───────────────────────────────────
// End-date old record, insert new (preserves history)
router.put('/expenses/:id', async (req, res) => {
  const { name, category, amount, frequency, notes } = req.body;
  try {
    const today = new Date().toISOString().split('T')[0];
    // End the old record
    await runQuery(
      `UPDATE admin_expenses SET ended_at = ? WHERE id = ? AND ended_at IS NULL`,
      [today, req.params.id]
    );
    // Insert new record
    const newId = randomUUID();
    await runQuery(
      `INSERT INTO admin_expenses (id, name, category, amount, frequency, notes, started_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [newId, name.trim(), category, parseFloat(amount), frequency, notes || null, today]
    );
    const row = await getOne(`SELECT * FROM admin_expenses WHERE id = ?`, [newId]);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/admin/financials/expenses/:id ────────────────────────────────
router.delete('/expenses/:id', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    await runQuery(
      `UPDATE admin_expenses SET ended_at = ? WHERE id = ?`,
      [today, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/financials/plan-prices ────────────────────────────────────
router.get('/plan-prices', async (req, res) => {
  try {
    const prices = await getCurrentPrices();
    // Also get history
    const history = await getAll(
      `SELECT * FROM admin_plan_prices ORDER BY effective_from DESC LIMIT 20`,
      []
    );
    res.json({ prices, history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/admin/financials/plan-prices/:plan ──────────────────────────────
router.put('/plan-prices/:plan', async (req, res) => {
  const { plan } = req.params;
  const { price } = req.body;
  if (!['starter', 'pro'].includes(plan)) return res.status(400).json({ error: 'Invalid plan' });
  if (!price || isNaN(price)) return res.status(400).json({ error: 'Valid price required' });
  try {
    await runQuery(
      `INSERT INTO admin_plan_prices (id, plan, price, effective_from) VALUES (?, ?, ?, CURRENT_DATE)`,
      [randomUUID(), plan, parseFloat(price)]
    );
    res.json({ success: true, plan, price: parseFloat(price) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
