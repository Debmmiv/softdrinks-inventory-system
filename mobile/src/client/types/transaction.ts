// The three things warehouse staff can do
export type TransactionType = 'DELIVERY' | 'RELEASE' | 'ADJUSTMENT';

// Required reason when recording a stock adjustment (FR14)
export type AdjustmentReason =
  | 'breakage'          // e.g. bottles smashed during handling
  | 'damage'            // e.g. crushed cases
  | 'loss'              // e.g. theft or unaccounted loss
  | 'count_correction'; // e.g. physical count differs from system

// A single warehouse transaction — mirrors the MongoDB 'transactions' collection
export interface Transaction {
  uuid: string;                    // Client-generated UUIDv4 — NEVER changes (FR17)
  product_id: string;              // References Product.id
  user_id: string;                 // Who recorded this transaction
  device_id: string;               // Which physical phone (permanent per device, NFR12)
  transaction_type: TransactionType;
  cases: number;                   // Input: how many full cases (integer >= 0)
  loose_bottles: number;           // Input: extra individual bottles (integer >= 0)
  total_bottles_delta: number;     // Computed: positive for DELIVERY, negative for RELEASE
  resulting_stock_bottles: number; // Snapshot of stock AFTER this transaction (FR24)
  reason: AdjustmentReason | null; // Required only for ADJUSTMENT (FR14)
  remarks: string | null;          // Optional free-text notes
  reference_tag: string | null;    // Optional: Customer name, Receipt #, or Supplier DR # (FR30)
  created_at: string;              // ISO 8601 UTC timestamp
}

// What we need from the UI before writing a transaction
export interface NewTransactionInput {
  product_id: string;
  transaction_type: TransactionType;
  cases: number;
  loose_bottles: number;
  reason?: AdjustmentReason;
  remarks?: string;
  reference_tag?: string;
}
