/**
 * Database Restore Script
 * -----------------------
 * ONLY use this in an emergency to recover lost data.
 *
 * Usage:  node restore.js backups/backup_2025-01-01_12-00-00.json
 *
 * ⚠️  This will INSERT missing rows back — it does NOT delete existing data.
 *     Safe to run on a live database.
 */

import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const file = process.argv[2];
if (!file) {
  console.error('Usage: node restore.js <backup-file.json>');
  process.exit(1);
}

if (!fs.existsSync(file)) {
  console.error(`File not found: ${file}`);
  process.exit(1);
}

const snapshot = JSON.parse(fs.readFileSync(file, 'utf8'));
console.log(`\n🔄  Restoring backup from: ${snapshot.created_at}\n`);

async function restore() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  for (const [table, rows] of Object.entries(snapshot.tables)) {
    if (!rows || rows.length === 0) continue;

    const cols = Object.keys(rows[0]);
    let inserted = 0;

    for (const row of rows) {
      const values = cols.map(c => row[c]);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
      try {
        await pool.query(sql, values);
        inserted++;
      } catch (err) {
        console.warn(`  ⚠️   ${table} row skipped: ${err.message}`);
      }
    }

    console.log(`  ✅  ${table}: ${inserted}/${rows.length} rows restored`);
  }

  await pool.end();
  console.log('\n✅  Restore complete!\n');
}

restore().catch(err => {
  console.error('❌  Restore failed:', err.message);
  process.exit(1);
});
