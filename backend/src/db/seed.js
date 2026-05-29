'use strict';

/**
 * Seed script — runs 001_create_tables.sql and 002_seed_data.sql
 * via Supabase's rpc or raw SQL.
 *
 * Usage: node src/db/seed.js
 *
 * NOTE: Requires SUPABASE_SERVICE_ROLE_KEY with sufficient privileges.
 * Run directly in the Supabase SQL editor if RPC access is restricted.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { supabaseAdmin } = require('./supabase');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function runSQL(sql) {
  const { error } = await supabaseAdmin.rpc('exec_sql', { sql });
  if (error) {
    // Fallback: some Supabase setups don't expose exec_sql
    console.error('[seed] RPC exec_sql error:', error.message);
    console.log('[seed] Please run the SQL files manually in the Supabase SQL editor.');
    throw error;
  }
}

async function main() {
  const files = ['001_create_tables.sql', '002_seed_data.sql'];

  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`[seed] Running ${file}...`);
    try {
      await runSQL(sql);
      console.log(`[seed] ${file} OK`);
    } catch (err) {
      console.error(`[seed] Failed on ${file}:`, err.message);
      process.exit(1);
    }
  }

  console.log('[seed] Done.');
}

main();
