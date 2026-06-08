/**
 * Database Backup Script
 * ---------------------
 * Run manually:  node backup.js
 * Backs up all gym data: customers, payments, check-ins, subscriptions, staff
 *
 * Saves to: ./backups/backup_YYYY-MM-DD_HH-MM-SS.json
 * Keeps last 30 backups automatically.
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = path.join(__dirname, 'backups');
const KEEP_LAST = 30; // keep 30 most recent backups

const TABLES = [
  'gyms',
  'users',
  'customers',
  'payments',
  'attendance',
  'staff',
  'settings',
  'subscriptions',
  'subscription_requests',
  'membership_freezes',
  'qr_codes',
  'sms_logs',
  'activity_log',
];

async function backup() {
  if (!process.env.DATABASE_URL) {
    console.error('❌  DATABASE_URL is not set. Cannot backup.');
    process.exit(1);
  }

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log('🔒  Starting database backup...');

  const snapshot = {
    created_at: new Date().toISOString(),
    tables: {},
  };

  for (const table of TABLES) {
    try {
      const result = await pool.query(`SELECT * FROM ${table}`);
      snapshot.tables[table] = result.rows;
      console.log(`  ✅  ${table}: ${result.rows.length} rows`);
    } catch (err) {
      // Table might not exist yet — skip silently
      console.log(`  ⚠️   ${table}: skipped (${err.message})`);
      snapshot.tables[table] = [];
    }
  }

  // Save backup file
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = path.join(BACKUP_DIR, `backup_${timestamp}.json`);
  fs.writeFileSync(filename, JSON.stringify(snapshot, null, 2), 'utf8');
  console.log(`\n💾  Backup saved: ${filename}`);

  // Rotate — delete oldest if more than KEEP_LAST
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
    .sort();

  if (files.length > KEEP_LAST) {
    const toDelete = files.slice(0, files.length - KEEP_LAST);
    toDelete.forEach(f => {
      fs.unlinkSync(path.join(BACKUP_DIR, f));
      console.log(`🗑️   Deleted old backup: ${f}`);
    });
  }

  await pool.end();
  console.log(`\n✅  Backup complete! (${Object.values(snapshot.tables).reduce((s, r) => s + r.length, 0)} total rows)\n`);
}

backup().catch(err => {
  console.error('❌  Backup failed:', err.message);
  process.exit(1);
});
