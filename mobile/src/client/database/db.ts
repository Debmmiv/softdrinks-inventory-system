import * as SQLite from 'expo-sqlite';

// Singleton — we open the database once and reuse it everywhere.
// Never call openDatabaseAsync() more than once in the app lifecycle.
let database: SQLite.SQLiteDatabase | null = null;

/**
 * Returns the open SQLite database handle.
 * Creates and initialises all tables on first call.
 * All other calls immediately return the cached handle.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (database) return database;

  database = await SQLite.openDatabaseAsync('softdrinks.db');

  // NFR2: WAL mode means writes are never corrupted even if the phone
  // loses power mid-write. Android SQLite supports this natively.
  await database.execAsync('PRAGMA journal_mode = WAL;');

  // Enforce referential integrity (product_id, transaction_uuid FKs)
  await database.execAsync('PRAGMA foreign_keys = ON;');

  await createTables(database);
  return database;
}

/** Creates all four tables if they don't already exist. Safe to call on every launch. */
async function createTables(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    -- Offline user credential cache (FR3)
    -- Populated on first successful online login, used for offline authentication.
    CREATE TABLE IF NOT EXISTS users_cache (
      id          TEXT PRIMARY KEY,
      username    TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name   TEXT NOT NULL,
      role        TEXT NOT NULL CHECK (role IN ('staff', 'owner/manager')),
      is_active   INTEGER NOT NULL DEFAULT 1
    );

    -- Local product catalog with live stock totals (FR15, FR16)
    -- local_stock_bottles is updated atomically with every transaction.
    CREATE TABLE IF NOT EXISTS products (
      id                        TEXT PRIMARY KEY,
      brand_name                TEXT NOT NULL,
      product_name              TEXT NOT NULL,
      bottle_size               TEXT NOT NULL,
      units_per_case            INTEGER NOT NULL CHECK (units_per_case >= 1),
      reorder_threshold_bottles INTEGER NOT NULL DEFAULT 0 CHECK (reorder_threshold_bottles >= 0),
      local_stock_bottles       INTEGER NOT NULL DEFAULT 0,
      is_active                 INTEGER NOT NULL DEFAULT 1,
      updated_at                TEXT NOT NULL
    );

    -- Immutable transaction ledger — append only, never UPDATE or DELETE (FR17, FR24)
    CREATE TABLE IF NOT EXISTS transactions (
      uuid                   TEXT PRIMARY KEY,
      product_id             TEXT NOT NULL,
      user_id                TEXT NOT NULL,
      device_id              TEXT NOT NULL,
      transaction_type       TEXT NOT NULL CHECK (transaction_type IN ('DELIVERY','RELEASE','ADJUSTMENT')),
      cases                  INTEGER NOT NULL CHECK (cases >= 0),
      loose_bottles          INTEGER NOT NULL CHECK (loose_bottles >= 0),
      total_bottles_delta    INTEGER NOT NULL,
      resulting_stock_bottles INTEGER NOT NULL,
      reason                 TEXT CHECK (reason IN ('breakage','damage','loss','count_correction') OR reason IS NULL),
      remarks                TEXT,
      reference_tag          TEXT,
      created_at             TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    -- Sync outbox — tracks what has / hasn't been sent to MongoDB (FR17, FR19, FR22)
    CREATE TABLE IF NOT EXISTS sync_queue (
      queue_id         INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_uuid TEXT UNIQUE NOT NULL,
      status           TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SYNCING','SYNCED','FAILED')),
      retry_count      INTEGER NOT NULL DEFAULT 0,
      error_message    TEXT,
      queued_at        TEXT NOT NULL,
      synced_at        TEXT,
      FOREIGN KEY (transaction_uuid) REFERENCES transactions(uuid)
    );
  `);
}
