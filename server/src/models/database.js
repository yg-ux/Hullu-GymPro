import initSqlJs from 'sql.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../data/gym.db');
const dataDir = path.dirname(dbPath);

let db = null;
let SQL = null;

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export async function initDatabase() {
  try {
    SQL = await initSqlJs();
    
    // Load existing database or create new one
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }
    
    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');
    console.log('✅ Foreign keys enabled');

    // Create tables - Multi-tenant architecture
    db.run(`
      CREATE TABLE IF NOT EXISTS gyms (
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
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add missing columns if they don't exist (for existing databases)
    try { db.run("ALTER TABLE gyms ADD COLUMN color_theme TEXT DEFAULT 'default'"); } catch (e) {}
    try { db.run("ALTER TABLE gyms ADD COLUMN total_customers INTEGER DEFAULT 0"); } catch (e) {}
    try { db.run("ALTER TABLE gyms ADD COLUMN subscription_status TEXT DEFAULT 'active'"); } catch (e) {}
    try { db.run("ALTER TABLE gyms ADD COLUMN subscription_plan TEXT DEFAULT 'free'"); } catch (e) {}

    // Migrate existing gyms to free plan if subscription_plan is null
    try {
      db.run("UPDATE gyms SET subscription_plan = 'free', subscription_status = 'active' WHERE subscription_plan IS NULL");
      db.run("UPDATE gyms SET max_members = 10 WHERE max_members IS NULL");
    } catch (e) { /* Migration already done */ }

    // Create subscription_requests table if it doesn't exist (for existing databases)
    try {
      const checkTable = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='subscription_requests'");
      if (checkTable.length === 0 || checkTable[0].values.length === 0) {
        db.run(`
          CREATE TABLE subscription_requests (
            id TEXT PRIMARY KEY,
            gym_id TEXT NOT NULL,
            requested_plan TEXT NOT NULL,
            amount_paid REAL,
            payment_proof TEXT,
            payment_method TEXT,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'declined')),
            admin_notes TEXT,
            reviewed_by TEXT,
            reviewed_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
          )
        `);
      }
    } catch (e) { /* Table exists or migration done */ }

    // Create admins table if it doesn't exist
    try {
      const checkAdmins = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='admins'");
      if (checkAdmins.length === 0 || checkAdmins[0].values.length === 0) {
        db.run(`
          CREATE TABLE admins (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);
        const adminId = uuidv4();
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        db.run("INSERT INTO admins (id, email, password, name) VALUES (?, ?, ?, ?)", [adminId, 'admin@hullugyms.com', hashedPassword, 'System Admin']);
      }
    } catch (e) { /* Table exists or migration done */ }

    db.run(`
      CREATE TABLE IF NOT EXISTS gym_users (
        id TEXT PRIMARY KEY,
        gym_id TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS customers (
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
        max_visits_per_week INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        gym_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        amount REAL NOT NULL,
        payment_method TEXT DEFAULT 'cash',
        payment_date TEXT DEFAULT (date('now')),
        membership_type TEXT,
        start_date TEXT,
        end_date TEXT,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS attendance (
        id TEXT PRIMARY KEY,
        gym_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        check_in TEXT DEFAULT CURRENT_TIMESTAMP,
        check_out TEXT,
        FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        gym_id TEXT DEFAULT 'global',
        key TEXT NOT NULL,
        value TEXT,
        PRIMARY KEY (gym_id, key)
      )
    `);

    // Insert default global settings
    const existingGlobalSettings = db.exec("SELECT * FROM settings WHERE gym_id = 'global'");
    if (existingGlobalSettings.length === 0 || existingGlobalSettings[0].values.length === 0) {
      db.run("INSERT INTO settings (gym_id, key, value) VALUES ('global', 'delete_code', 'DELETE123')");
      db.run("INSERT INTO settings (gym_id, key, value) VALUES ('global', 'app_name', 'GymPro')");
      db.run("INSERT INTO settings (gym_id, key, value) VALUES ('global', 'monthly_price', '3000')");
      console.log('✅ Global settings created');
    }

    // Revenue tracking for SaaS analytics
    db.run(`
      CREATE TABLE IF NOT EXISTS revenue_tracking (
        id TEXT PRIMARY KEY,
        gym_id TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('payment', 'refund')),
        source TEXT NOT NULL CHECK(source IN ('registration', 'renewal', 'manual')),
        payment_method TEXT DEFAULT 'cash',
        customer_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
      )
    `);

    // SMS logs for future integration
    db.run(`
      CREATE TABLE IF NOT EXISTS sms_logs (
        id TEXT PRIMARY KEY,
        gym_id TEXT NOT NULL,
        customer_id TEXT,
        phone TEXT NOT NULL,
        message_type TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        sent_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
      )
    `);

    // Activity log for audit trail
    db.run(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id TEXT PRIMARY KEY,
        gym_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        details TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
      )
    `);

    // Subscription upgrade requests
    try {
      db.run(`
        CREATE TABLE IF NOT EXISTS subscription_requests (
          id TEXT PRIMARY KEY,
          gym_id TEXT NOT NULL,
          requested_plan TEXT NOT NULL,
          amount_paid REAL,
          payment_proof TEXT,
          payment_method TEXT,
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'declined')),
          admin_notes TEXT,
          reviewed_by TEXT,
          reviewed_at TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
        )
      `);
    } catch (e) { /* Table exists */ }

    // Admin users table (separate from gym users)
    try {
      db.run(`
        CREATE TABLE IF NOT EXISTS admins (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (e) { /* Table exists */ }

    // Add default admin if not exists
    try {
      const existingAdmin = db.exec("SELECT * FROM admins WHERE email = 'admin@hullugyms.com'");
      if (existingAdmin.length === 0 || existingAdmin[0].values.length === 0) {
        const adminId = uuidv4();
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        db.run("INSERT INTO admins (id, email, password, name) VALUES (?, ?, ?, ?)", [adminId, 'admin@hullugyms.com', hashedPassword, 'System Admin']);
      }
    } catch (e) { /* Admin exists */ }

    // QR codes for member access
    db.run(`
      CREATE TABLE IF NOT EXISTS qr_codes (
        id TEXT PRIMARY KEY,
        gym_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        qr_image TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      )
    `);

    // Reports for Pro+ monthly PDFs
    db.run(`
      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        gym_id TEXT NOT NULL,
        type TEXT NOT NULL,
        period_start TEXT NOT NULL,
        period_end TEXT NOT NULL,
        file_path TEXT,
        generated_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
      )
    `);

    saveDatabase();
    console.log('✅ Multi-tenant Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

export function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

// Helper functions to run queries
export function runQuery(sql, params = []) {
  db.run(sql, params);
  saveDatabase();
}

export function getOne(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

export function getAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function getDb() {
  return db;
}

// ========== Revenue Tracking Helpers ==========
export function addRevenueEntry(gymId, amount, type, source, paymentMethod = 'cash', customerId = null) {
  const id = uuidv4();
  db.run(
    `INSERT INTO revenue_tracking (id, gym_id, amount, type, source, payment_method, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, gymId, amount, type, source, paymentMethod, customerId]
  );
  saveDatabase();
  return id;
}

export function getGymRevenue(gymId, startDate = null, endDate = null) {
  let sql = `SELECT * FROM revenue_tracking WHERE gym_id = ?`;
  const params = [gymId];
  if (startDate) {
    sql += ` AND created_at >= ?`;
    params.push(startDate);
  }
  if (endDate) {
    sql += ` AND created_at <= ?`;
    params.push(endDate);
  }
  sql += ` ORDER BY created_at DESC`;
  return getAll(sql, params);
}

// ========== SMS Logs Helpers ==========
export function logSms(gymId, phone, messageType, message, status = 'pending', customerId = null) {
  const id = uuidv4();
  db.run(
    `INSERT INTO sms_logs (id, gym_id, customer_id, phone, message_type, message, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, gymId, customerId, phone, messageType, message, status]
  );
  saveDatabase();
  return id;
}

export function updateSmsStatus(smsId, status) {
  db.run(`UPDATE sms_logs SET status = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?`, [status, smsId]);
  saveDatabase();
}

export function getSmsLogs(gymId, customerId = null) {
  let sql = `SELECT * FROM sms_logs WHERE gym_id = ?`;
  const params = [gymId];
  if (customerId) {
    sql += ` AND customer_id = ?`;
    params.push(customerId);
  }
  sql += ` ORDER BY created_at DESC`;
  return getAll(sql, params);
}

// ========== Activity Log Helpers ==========
export function logActivity(gymId, userId, actionType, entityType = null, entityId = null, details = null) {
  const id = uuidv4();
  const detailsJson = details ? JSON.stringify(details) : null;
  db.run(
    `INSERT INTO activity_log (id, gym_id, user_id, action_type, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, gymId, userId, actionType, entityType, entityId, detailsJson]
  );
  saveDatabase();
  return id;
}

export function getGymActivity(gymId, limit = 100) {
  return getAll(`SELECT * FROM activity_log WHERE gym_id = ? ORDER BY created_at DESC LIMIT ?`, [gymId, limit]);
}

// ========== QR Codes Helpers ==========
export function createQrCode(gymId, customerId, code, qrImage = null) {
  const id = uuidv4();
  db.run(
    `INSERT INTO qr_codes (id, gym_id, customer_id, code, qr_image, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
    [id, gymId, customerId, code, qrImage]
  );
  saveDatabase();
  return id;
}

export function getCustomerQrCode(customerId) {
  return getOne(`SELECT * FROM qr_codes WHERE customer_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1`, [customerId]);
}

export function deactivateQrCode(qrId) {
  db.run(`UPDATE qr_codes SET is_active = 0 WHERE id = ?`, [qrId]);
  saveDatabase();
}

// ========== Reports Helpers ==========
export function createReport(gymId, type, periodStart, periodEnd, filePath = null) {
  const id = uuidv4();
  db.run(
    `INSERT INTO reports (id, gym_id, type, period_start, period_end, file_path, generated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [id, gymId, type, periodStart, periodEnd, filePath]
  );
  saveDatabase();
  return id;
}

export function getGymReports(gymId, type = null) {
  let sql = `SELECT * FROM reports WHERE gym_id = ?`;
  const params = [gymId];
  if (type) {
    sql += ` AND type = ?`;
    params.push(type);
  }
  sql += ` ORDER BY created_at DESC`;
  return getAll(sql, params);
}

export default { initDatabase, saveDatabase, runQuery, getOne, getAll, getDb,
  addRevenueEntry, getGymRevenue,
  logSms, updateSmsStatus, getSmsLogs,
  logActivity, getGymActivity,
  createQrCode, getCustomerQrCode, deactivateQrCode,
  createReport, getGymReports };
