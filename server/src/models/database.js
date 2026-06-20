import pg from 'pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const { Pool } = pg;

let pool = null;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL environment variable is not set');
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    pool.on('error', (err) => console.error('PG pool error:', err));
  }
  return pool;
}

// Convert SQLite ? placeholders to PostgreSQL $1, $2, ...
function convertPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

export async function runQuery(sql, params = []) {
  await getPool().query(convertPlaceholders(sql), params);
}

export async function getOne(sql, params = []) {
  const result = await getPool().query(convertPlaceholders(sql), params);
  return result.rows[0] || null;
}

export async function getAll(sql, params = []) {
  const result = await getPool().query(convertPlaceholders(sql), params);
  return result.rows;
}

// No-op — PostgreSQL auto-persists
export function saveDatabase() {}
export function getDb() { return getPool(); }

export async function initDatabase() {
  const p = getPool();

  const tables = [
    `CREATE TABLE IF NOT EXISTS gyms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      logo TEXT,
      color_theme TEXT DEFAULT 'default',
      subscription_status TEXT DEFAULT 'active',
      subscription_plan TEXT DEFAULT 'free',
      subscription_start TEXT,
      subscription_end TEXT,
      max_members INTEGER DEFAULT 10,
      total_customers INTEGER DEFAULT 0,
      sms_enabled INTEGER DEFAULT 1,
      sms_api_key TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS gym_users (
      id TEXT PRIMARY KEY,
      gym_id TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      email TEXT,
      role TEXT DEFAULT 'admin',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ,
      FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      gym_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      photo TEXT,
      membership_type TEXT DEFAULT '1_month',
      membership_start TEXT,
      membership_end TEXT,
      status TEXT DEFAULT 'active',
      emergency_contact TEXT,
      notes TEXT,
      visits_this_week INTEGER DEFAULT 0,
      week_start_date TEXT,
      max_visits_per_week INTEGER DEFAULT 0,
      welcome_sms_sent INTEGER DEFAULT 0,
      total_sessions INTEGER DEFAULT 0,
      sessions_used INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      gym_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'cash',
      payment_date TEXT DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD'),
      membership_type TEXT,
      start_date TEXT,
      end_date TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      gym_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      check_in TIMESTAMPTZ DEFAULT NOW(),
      check_out TIMESTAMPTZ,
      FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      gym_id TEXT DEFAULT 'global',
      key TEXT NOT NULL,
      value TEXT,
      PRIMARY KEY (gym_id, key)
    )`,
    `CREATE TABLE IF NOT EXISTS subscription_requests (
      id TEXT PRIMARY KEY,
      gym_id TEXT NOT NULL,
      requested_plan TEXT NOT NULL,
      amount_paid REAL,
      payment_proof TEXT,
      payment_method TEXT,
      transaction_id TEXT,
      duration_months INTEGER DEFAULT 1,
      status TEXT DEFAULT 'pending',
      admin_notes TEXT,
      reviewed_by TEXT,
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS revenue_tracking (
      id TEXT PRIMARY KEY,
      gym_id TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      source TEXT NOT NULL,
      payment_method TEXT DEFAULT 'cash',
      customer_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS sms_logs (
      id TEXT PRIMARY KEY,
      gym_id TEXT NOT NULL,
      customer_id TEXT,
      phone TEXT NOT NULL,
      message_type TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      gym_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      details TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS qr_codes (
      id TEXT PRIMARY KEY,
      gym_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      qr_image TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      gym_id TEXT NOT NULL,
      type TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      file_path TEXT,
      generated_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS membership_freezes (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  frozen_at DATE NOT NULL,
  unfreeze_at DATE NOT NULL,
  duration_days INTEGER NOT NULL,
  reason TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
)`,
    `CREATE INDEX IF NOT EXISTS idx_membership_freezes_customer ON membership_freezes(customer_id)`,
    // Indexes
    `CREATE INDEX IF NOT EXISTS idx_customers_gym_id ON customers(gym_id)`,
    `CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)`,
    `CREATE INDEX IF NOT EXISTS idx_customers_membership_end ON customers(membership_end)`,
    `CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status)`,
    `CREATE INDEX IF NOT EXISTS idx_payments_gym_id ON payments(gym_id)`,
    `CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id)`,
    `CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date)`,
    `CREATE INDEX IF NOT EXISTS idx_attendance_gym_id ON attendance(gym_id)`,
    `CREATE INDEX IF NOT EXISTS idx_attendance_customer_id ON attendance(customer_id)`,
    `CREATE INDEX IF NOT EXISTS idx_attendance_check_in ON attendance(check_in)`,
    `CREATE INDEX IF NOT EXISTS idx_qr_codes_customer_id ON qr_codes(customer_id)`,
    `CREATE INDEX IF NOT EXISTS idx_activity_log_gym_id ON activity_log(gym_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sms_logs_gym_id ON sms_logs(gym_id)`,

    // ── Branches (multi-location support) ─────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      gym_id TEXT NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      manager_name TEXT,
      is_main BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_branches_gym_id ON branches(gym_id)`,

    // ── Expense Tracking ───────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      gym_id TEXT NOT NULL,
      branch_id TEXT,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
      payment_method TEXT DEFAULT 'cash',
      receipt_photo TEXT,
      created_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_expenses_gym_id ON expenses(gym_id)`,
    `CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date)`,

    // ── Recurring Expense Templates ────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS recurring_expenses (
      id TEXT PRIMARY KEY,
      gym_id TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'cash',
      staff_id TEXT,
      day_of_month INTEGER DEFAULT 1,
      notes TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_recurring_expenses_gym_id ON recurring_expenses(gym_id)`,

    // Track which months have already had recurring expenses auto-generated
    `CREATE TABLE IF NOT EXISTS recurring_expense_generations (
      gym_id TEXT NOT NULL,
      month TEXT NOT NULL,
      generated_at TIMESTAMPTZ DEFAULT NOW(),
      expense_count INTEGER DEFAULT 0,
      PRIMARY KEY (gym_id, month)
    )`,

    // ── Equipment / Asset Tracking ────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS equipment (
      id TEXT PRIMARY KEY,
      gym_id TEXT NOT NULL,
      branch_id TEXT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      purchase_date DATE,
      purchase_price REAL,
      warranty_expiry DATE,
      last_service_date DATE,
      next_service_date DATE,
      status TEXT DEFAULT 'operational',
      condition TEXT DEFAULT 'good',
      notes TEXT,
      photo TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_equipment_gym_id ON equipment(gym_id)`,

    // ── Membership Packages / Pricing Menu ────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS membership_packages (
      id TEXT PRIMARY KEY,
      gym_id TEXT NOT NULL,
      name TEXT NOT NULL,
      membership_type TEXT NOT NULL,
      price REAL NOT NULL,
      description TEXT,
      features TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_packages_gym_id ON membership_packages(gym_id)`,

    // ── Photo Progress Tracking ───────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS progress_photos (
      id TEXT PRIMARY KEY,
      gym_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      photo_data TEXT NOT NULL,
      angle TEXT DEFAULT 'front',
      notes TEXT,
      weight REAL,
      body_fat REAL,
      taken_at DATE NOT NULL DEFAULT CURRENT_DATE,
      created_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_progress_photos_customer ON progress_photos(customer_id)`,

    // ── Member Self-Service Portal Tokens ─────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS portal_tokens (
      id TEXT PRIMARY KEY,
      gym_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_portal_tokens_token ON portal_tokens(token)`,
    `CREATE INDEX IF NOT EXISTS idx_portal_tokens_customer ON portal_tokens(customer_id)`,

    // ── Employee Directory (no login — record-keeping only) ───────────────────
    `CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      gym_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      position TEXT,
      salary REAL,
      start_date TEXT,
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_employees_gym_id ON employees(gym_id)`,

    // ── PWA Push Subscriptions ────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      gym_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(gym_id, user_id, endpoint),
      FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
    )`,

    // ── Admin Financials / P&L ─────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS admin_expenses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'other',
      amount NUMERIC NOT NULL DEFAULT 0,
      frequency TEXT NOT NULL DEFAULT 'monthly',
      notes TEXT,
      started_at DATE NOT NULL DEFAULT CURRENT_DATE,
      ended_at DATE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS admin_plan_prices (
      id TEXT PRIMARY KEY,
      plan TEXT NOT NULL,
      price NUMERIC NOT NULL,
      effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS admin_pl_snapshots (
      id TEXT PRIMARY KEY,
      month TEXT NOT NULL UNIQUE,
      starter_count INTEGER DEFAULT 0,
      pro_count INTEGER DEFAULT 0,
      free_count INTEGER DEFAULT 0,
      mrr NUMERIC DEFAULT 0,
      monthly_expenses NUMERIC DEFAULT 0,
      yearly_expenses_monthly NUMERIC DEFAULT 0,
      total_expenses NUMERIC DEFAULT 0,
      net_profit NUMERIC DEFAULT 0,
      expense_breakdown JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  ];

  for (const sql of tables) {
    await p.query(sql);
  }

  // Seed default plan prices for admin financials (use JS uuid to avoid pgcrypto dependency)
  await p.query(
    `INSERT INTO admin_plan_prices (id, plan, price, effective_from)
     SELECT $1, 'starter', 1499, CURRENT_DATE
     WHERE NOT EXISTS (SELECT 1 FROM admin_plan_prices WHERE plan = 'starter')`,
    [uuidv4()]
  );
  await p.query(
    `INSERT INTO admin_plan_prices (id, plan, price, effective_from)
     SELECT $1, 'pro', 3499, CURRENT_DATE
     WHERE NOT EXISTS (SELECT 1 FROM admin_plan_prices WHERE plan = 'pro')`,
    [uuidv4()]
  );

  // Add session columns to existing customers table (safe no-op if they already exist)
  await p.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_sessions INTEGER DEFAULT 0');
  await p.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS sessions_used INTEGER DEFAULT 0');
  await p.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT FALSE');
  await p.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS frozen_until DATE');

  // Debt / partial payment tracking
  await p.query('ALTER TABLE payments ADD COLUMN IF NOT EXISTS total_due REAL');
  await p.query('ALTER TABLE payments ADD COLUMN IF NOT EXISTS is_partial BOOLEAN DEFAULT FALSE');
  await p.query('ALTER TABLE payments ADD COLUMN IF NOT EXISTS balance_paid REAL');

  // Multi-branch columns
  await p.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS branch_id TEXT');
  await p.query('ALTER TABLE payments ADD COLUMN IF NOT EXISTS branch_id TEXT');
  await p.query('ALTER TABLE attendance ADD COLUMN IF NOT EXISTS branch_id TEXT');

  // Recurring expense tracking on expenses table
  await p.query('ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurring_expense_id TEXT');
  await p.query('ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_auto_generated BOOLEAN DEFAULT FALSE');
  await p.query('ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_note TEXT');

  // Short code for portal URL shortener (7-char alphanumeric, used in SMS links)
  await p.query('ALTER TABLE portal_tokens ADD COLUMN IF NOT EXISTS short_code TEXT');
  await p.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_portal_tokens_short_code ON portal_tokens(short_code) WHERE short_code IS NOT NULL');

  // Outstanding balance on customer
  await p.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS outstanding_balance REAL DEFAULT 0');

  // Birthday for birthday reminders
  await p.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS date_of_birth DATE');

  // Gender for member demographics
  await p.query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender TEXT");

  // Gym parent for multi-branch
  await p.query('ALTER TABLE gyms ADD COLUMN IF NOT EXISTS parent_gym_id TEXT');

  // Seed default global settings
  const globalSettings = await getOne("SELECT gym_id FROM settings WHERE gym_id = 'global' AND key = 'delete_code'");
  if (!globalSettings) {
    await runQuery("INSERT INTO settings (gym_id, key, value) VALUES ('global', 'delete_code', 'DELETE123')");
    await runQuery("INSERT INTO settings (gym_id, key, value) VALUES ('global', 'app_name', 'GymPro')");
    await runQuery("INSERT INTO settings (gym_id, key, value) VALUES ('global', 'monthly_price', '3000')");
    console.log('✅ Global settings created');
  }

  // Seed admin — upsert so password stays current on every deploy
  const adminExists = await getOne("SELECT id FROM admins WHERE email = 'akaluyg@gmail.com'");
  if (!adminExists) {
    // Remove any old default admin
    await runQuery("DELETE FROM admins WHERE email = 'admin@hullugyms.com'");
    const id = uuidv4();
    const hash = bcrypt.hashSync('911677153#Aa', 10);
    await runQuery(
      "INSERT INTO admins (id, email, password, name) VALUES ($1, $2, $3, $4)",
      [id, 'akaluyg@gmail.com', hash, 'Yegeta Akalu']
    );
    console.log('✅ Admin account created');
  }

  console.log('✅ PostgreSQL database ready');
}

// ========== Activity Log ==========
export async function logActivity(gymId, userId, actionType, entityType = null, entityId = null, details = null) {
  const id = uuidv4();
  const detailsJson = details ? JSON.stringify(details) : null;
  await runQuery(
    `INSERT INTO activity_log (id, gym_id, user_id, action_type, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, gymId, userId, actionType, entityType, entityId, detailsJson]
  );
}

export async function getGymActivity(gymId, limit = 100) {
  return getAll(`SELECT * FROM activity_log WHERE gym_id = ? ORDER BY created_at DESC LIMIT ?`, [gymId, limit]);
}

// ========== SMS Logs ==========
export async function logSms(gymId, phone, messageType, message, status = 'pending', customerId = null) {
  const id = uuidv4();
  await runQuery(
    `INSERT INTO sms_logs (id, gym_id, customer_id, phone, message_type, message, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, gymId, customerId, phone, messageType, message, status]
  );
}

// ========== QR Codes ==========
export async function createQrCode(gymId, customerId, code, qrImage = null) {
  const id = uuidv4();
  await runQuery(
    `INSERT INTO qr_codes (id, gym_id, customer_id, code, qr_image, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
    [id, gymId, customerId, code, qrImage]
  );
  return id;
}

export async function getCustomerQrCode(customerId) {
  return getOne(`SELECT * FROM qr_codes WHERE customer_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1`, [customerId]);
}

export async function deactivateQrCode(qrId) {
  await runQuery(`UPDATE qr_codes SET is_active = 0 WHERE id = ?`, [qrId]);
}

// ========== Revenue Tracking ==========
export async function addRevenueEntry(gymId, amount, type, source, paymentMethod = 'cash', customerId = null) {
  const id = uuidv4();
  await runQuery(
    `INSERT INTO revenue_tracking (id, gym_id, amount, type, source, payment_method, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, gymId, amount, type, source, paymentMethod, customerId]
  );
  return id;
}

export default {
  initDatabase, saveDatabase, runQuery, getOne, getAll, getDb,
  logActivity, getGymActivity,
  logSms,
  createQrCode, getCustomerQrCode, deactivateQrCode,
  addRevenueEntry,
};
