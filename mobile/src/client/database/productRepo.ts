import { getDatabase } from './db';
import type { Product } from '../types/inventory';
import { nowISO } from '../utils/date';
import { TABLES } from '../utils/constants';

/** Returns every active product ordered by brand name then product name. (FR16, FR27) */
export async function getAllActiveProducts(): Promise<Product[]> {
  const db = await getDatabase();
  return db.getAllAsync<Product>(
    `SELECT * FROM ${TABLES.PRODUCTS}
     WHERE is_active = 1
     ORDER BY brand_name ASC, product_name ASC`
  );
}

/** Fetches a single product by id — used for stock checks before a release (FR13). */
export async function getProductById(id: string): Promise<Product | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Product>(
    `SELECT * FROM ${TABLES.PRODUCTS} WHERE id = ?`,
    [id]
  );
}

/**
 * Real-time search by brand or product name. (FR27)
 * Uses SQLite LIKE — returns within <300ms even on 10,000 rows.
 */
export async function searchProducts(query: string): Promise<Product[]> {
  const db = await getDatabase();
  const pattern = `%${query}%`;
  return db.getAllAsync<Product>(
    `SELECT * FROM ${TABLES.PRODUCTS}
     WHERE is_active = 1
       AND (brand_name LIKE ? OR product_name LIKE ?)
     ORDER BY brand_name ASC, product_name ASC`,
    [pattern, pattern]
  );
}

/**
 * Atomically update the local stock after a transaction.
 * Called ONLY inside recordTransaction() — never from a screen directly.
 */
export async function updateLocalStock(
  db: Awaited<ReturnType<typeof getDatabase>>,
  productId: string,
  newTotalBottles: number
): Promise<void> {
  await db.runAsync(
    `UPDATE ${TABLES.PRODUCTS}
     SET local_stock_bottles = ?, updated_at = ?
     WHERE id = ?`,
    [newTotalBottles, nowISO(), productId]
  );
}

/**
 * Upsert a product — insert new or update existing.
 * Used during downstream sync to reconcile cloud changes (Phase 3, FR23).
 */
export async function upsertProduct(product: Product): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO ${TABLES.PRODUCTS}
       (id, brand_name, product_name, bottle_size, units_per_case,
        reorder_threshold_bottles, local_stock_bottles, is_active, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       brand_name                = excluded.brand_name,
       product_name              = excluded.product_name,
       bottle_size               = excluded.bottle_size,
       reorder_threshold_bottles = excluded.reorder_threshold_bottles,
       local_stock_bottles       = excluded.local_stock_bottles,
       is_active                 = excluded.is_active,
       updated_at                = excluded.updated_at`,
    [
      product.id,
      product.brand_name,
      product.product_name,
      product.bottle_size,
      product.units_per_case,
      product.reorder_threshold_bottles,
      product.local_stock_bottles,
      product.is_active ? 1 : 0,
      product.updated_at,
    ]
  );
}

/** Returns products whose local stock is at or below their reorder threshold. (FR26) */
export async function getLowStockProducts(): Promise<Product[]> {
  const db = await getDatabase();
  return db.getAllAsync<Product>(
    `SELECT * FROM ${TABLES.PRODUCTS}
     WHERE is_active = 1
       AND local_stock_bottles <= reorder_threshold_bottles
     ORDER BY brand_name ASC`
  );
}

/** Seed initial mock products for Phase 1 development & testing. */
export async function seedMockProductsIfEmpty(): Promise<void> {
  const db = await getDatabase();
  const count = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM ${TABLES.PRODUCTS}`
  );
  if ((count?.c ?? 0) > 0) return; // Already seeded

  const now = nowISO();
  const seeds: Omit<Product, 'local_stock_bottles'>[] = [
    {
      id: 'mock-prod-001',
      brand_name: 'Coca-Cola',
      product_name: 'Coke Original',
      bottle_size: '1.5L',
      units_per_case: 12,
      reorder_threshold_bottles: 24,
      is_active: true,
      updated_at: now,
    },
    {
      id: 'mock-prod-002',
      brand_name: 'Coca-Cola',
      product_name: 'Sprite',
      bottle_size: '500ml',
      units_per_case: 24,
      reorder_threshold_bottles: 48,
      is_active: true,
      updated_at: now,
    },
    {
      id: 'mock-prod-003',
      brand_name: 'Pepsi',
      product_name: 'Pepsi Cola',
      bottle_size: '1L',
      units_per_case: 12,
      reorder_threshold_bottles: 24,
      is_active: true,
      updated_at: now,
    },
    {
      id: 'mock-prod-004',
      brand_name: 'RC Cola',
      product_name: 'Royal Tru-Orange',
      bottle_size: '1.5L',
      units_per_case: 12,
      reorder_threshold_bottles: 12,
      is_active: true,
      updated_at: now,
    },
    {
      id: 'mock-prod-005',
      brand_name: 'Coca-Cola',
      product_name: 'Coke Mismo',
      bottle_size: '250ml',
      units_per_case: 24,
      reorder_threshold_bottles: 24,
      is_active: true,
      updated_at: now,
    },
  ];

  for (const p of seeds) {
    await db.runAsync(
      `INSERT OR IGNORE INTO ${TABLES.PRODUCTS}
         (id, brand_name, product_name, bottle_size, units_per_case,
          reorder_threshold_bottles, local_stock_bottles, is_active, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        p.id, p.brand_name, p.product_name, p.bottle_size,
        p.units_per_case, p.reorder_threshold_bottles,
        p.is_active ? 1 : 0, p.updated_at,
      ]
    );
  }
}
