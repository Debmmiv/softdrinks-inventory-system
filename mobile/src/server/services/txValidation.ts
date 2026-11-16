/**
 * Pure validation for offline transactions arriving at POST /api/sync/batch.
 * Kept free of database and framework imports so it can be unit-tested in isolation.
 */

export type TxType = 'DELIVERY' | 'RELEASE' | 'ADJUSTMENT';

export interface TxQuantities {
  transaction_type: string;
  cases: number;
  loose_bottles: number;
  total_bottles_delta: number;
  reason?: string | null;
  created_at?: string;
}

const TX_TYPES: readonly string[] = ['DELIVERY', 'RELEASE', 'ADJUSTMENT'];

/**
 * Returns a human-readable rejection reason, or null when the record is consistent.
 *
 * The device is not trusted to do the arithmetic: the signed delta it sends must equal the
 * cases/loose-bottle quantities converted with the product's pack size, and its sign must
 * match the transaction type. Anything else is corrupted or tampered data.
 */
export function validateTransaction(tx: TxQuantities, unitsPerCase: number): string | null {
  if (!TX_TYPES.includes(tx.transaction_type)) {
    return `Unknown transaction_type: ${String(tx.transaction_type)}`;
  }

  const { cases, loose_bottles, total_bottles_delta: delta } = tx;
  if (![cases, loose_bottles, delta].every((n) => typeof n === 'number' && Number.isInteger(n))) {
    return 'cases, loose_bottles and total_bottles_delta must be whole numbers.';
  }

  const expectedMagnitude = Math.abs(cases) * unitsPerCase + Math.abs(loose_bottles);
  if (Math.abs(delta) !== expectedMagnitude) {
    return (
      `Quantity mismatch: ${Math.abs(cases)} case(s) x ${unitsPerCase} + ${Math.abs(loose_bottles)} ` +
      `loose = ${expectedMagnitude} bottles, but the record says ${Math.abs(delta)}.`
    );
  }

  if (tx.transaction_type === 'DELIVERY' && delta < 0) {
    return 'A DELIVERY cannot reduce stock.';
  }
  if (tx.transaction_type === 'RELEASE' && delta > 0) {
    return 'A RELEASE cannot increase stock.';
  }
  if (
    tx.transaction_type === 'ADJUSTMENT' &&
    delta > 0 &&
    (tx.reason === 'breakage' || tx.reason === 'damage' || tx.reason === 'loss')
  ) {
    return `A ${tx.reason} adjustment cannot increase stock.`;
  }

  if (tx.created_at !== undefined && tx.created_at !== null) {
    if (Number.isNaN(new Date(tx.created_at).getTime())) {
      return 'created_at is not a valid timestamp.';
    }
  }

  return null;
}

/** Builds the owner-facing explanation stored on a CONCURRENCY_DEFICIT record. */
export function describeDeficit(params: {
  type: string;
  deltaBottles: number;
  stockAfter: number;
  deviceExpectedStock: number;
}): string {
  const { type, deltaBottles, stockAfter, deviceExpectedStock } = params;
  const stockBefore = stockAfter - deltaBottles;
  return (
    `Central stock was ${stockBefore} bottle(s) before this ${type.toLowerCase()} of ` +
    `${Math.abs(deltaBottles)} and is now ${stockAfter}. ` +
    `The device expected ${deviceExpectedStock}, so another device likely released the same stock while offline. ` +
    `A physical count is needed.`
  );
}

/** True for a MongoDB duplicate-key error (code 11000), including errors wrapped by mongoose. */
export function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}
