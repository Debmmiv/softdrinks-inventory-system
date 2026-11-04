// A single soft drink product — mirrors the MongoDB 'products' collection
export interface Product {
  id: string;                      // MongoDB _id as string
  brand_name: string;              // e.g. "Coca-Cola"
  product_name: string;            // e.g. "Coke Original"
  bottle_size: string;             // e.g. "1.5L", "500ml"
  units_per_case: number;          // e.g. 24 — NEVER changes after first transaction (FR9)
  reorder_threshold_bottles: number; // Alert owner when stock falls at or below this
  local_stock_bottles: number;     // Current on-hand total (stored as raw bottles, not cases)
  is_active: boolean;              // Inactive products are hidden from transaction forms
  updated_at: string;              // ISO 8601 UTC — used for downstream sync comparison
}

// What we show on screen: "5 cases and 3 bottles" — computed from raw bottle count
export interface StockDisplay {
  cases: number;
  remaining_bottles: number;
}
