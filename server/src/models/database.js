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
  ];

  for (const sql of tables) {
    await p.query(sql);
  }

  // Add session columns to existing customers table (safe no-op if they already exist)
  await p.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_sessions INTEGER DEFAULT 0');
  await p.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS sessions_used INTEGER DEFAULT 0');
  await p.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT FALSE');
  await p.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS frozen_until DATE');

  // Debt / partial payment tracking
  await p.query('ALTER TABLE payments ADD COLUMN IF NOT EXISTS total_due REAL');

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
