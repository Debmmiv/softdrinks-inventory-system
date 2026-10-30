import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb() {
  if (!dbPromise) dbPromise = SQLite.openDatabaseAsync('inventory.db');
  return dbPromise;
}

export async function initDb() {
  const db = await getDb();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS products (
      product_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      brand TEXT,
      bottle_size TEXT,
      units_per_case INTEGER NOT NULL,
      reorder_level_cases INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS inventory (
      product_id TEXT PRIMARY KEY,
      total_bottles INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS transactions (
      transaction_id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      type TEXT NOT NULL,
      cases INTEGER DEFAULT 0,
      bottles INTEGER DEFAULT 0,
      total_bottles INTEGER NOT NULL,
      party TEXT,
      user_id TEXT,
      device_id TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sync_queue (
      queue_id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      last_attempt_at TEXT
    );
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      role TEXT NOT NULL
    );
  `);
}
