import test from 'node:test';
import assert from 'node:assert/strict';
import { validateTransaction, describeDeficit, isDuplicateKeyError } from './txValidation';

const base = { cases: 2, loose_bottles: 3, total_bottles_delta: 51 }; // 2 x 24 + 3

test('accepts a consistent DELIVERY', () => {
  assert.equal(validateTransaction({ ...base, transaction_type: 'DELIVERY' }, 24), null);
});

test('accepts a consistent RELEASE with a negative delta', () => {
  assert.equal(
    validateTransaction({ ...base, transaction_type: 'RELEASE', total_bottles_delta: -51 }, 24),
    null
  );
});

test('rejects a delta that does not match cases x pack size + loose bottles', () => {
  const problem = validateTransaction({ ...base, transaction_type: 'DELIVERY', total_bottles_delta: 60 }, 24);
  assert.match(problem ?? '', /Quantity mismatch/);
});

test('uses the SERVER pack size, so a tampered device pack size is caught', () => {
  // Device thought 12 per case (2 x 12 + 3 = 27) but the product is really 24 per case.
  const problem = validateTransaction({ ...base, transaction_type: 'DELIVERY', total_bottles_delta: 27 }, 24);
  assert.match(problem ?? '', /Quantity mismatch/);
});

test('a DELIVERY cannot reduce stock', () => {
  const problem = validateTransaction({ ...base, transaction_type: 'DELIVERY', total_bottles_delta: -51 }, 24);
  assert.equal(problem, 'A DELIVERY cannot reduce stock.');
});

test('a RELEASE cannot increase stock', () => {
  const problem = validateTransaction({ ...base, transaction_type: 'RELEASE' }, 24);
  assert.equal(problem, 'A RELEASE cannot increase stock.');
});

test('breakage, damage and loss adjustments cannot increase stock', () => {
  for (const reason of ['breakage', 'damage', 'loss']) {
    const problem = validateTransaction({ ...base, transaction_type: 'ADJUSTMENT', reason }, 24);
    assert.match(problem ?? '', /cannot increase stock/, reason);
  }
});

test('a count_correction may increase or decrease stock', () => {
  assert.equal(validateTransaction({ ...base, transaction_type: 'ADJUSTMENT', reason: 'count_correction' }, 24), null);
  assert.equal(
    validateTransaction({ ...base, transaction_type: 'ADJUSTMENT', reason: 'count_correction', total_bottles_delta: -51 }, 24),
    null
  );
});

test('rejects unknown transaction types', () => {
  assert.match(validateTransaction({ ...base, transaction_type: 'REFUND' }, 24) ?? '', /Unknown transaction_type/);
});

test('rejects non-integer quantities', () => {
  const problem = validateTransaction(
    { transaction_type: 'DELIVERY', cases: 1.5, loose_bottles: 0, total_bottles_delta: 36 },
    24
  );
  assert.match(problem ?? '', /whole numbers/);
});

test('rejects an invalid created_at timestamp', () => {
  const problem = validateTransaction({ ...base, transaction_type: 'DELIVERY', created_at: 'not-a-date' }, 24);
  assert.match(problem ?? '', /created_at/);
});

test('describeDeficit explains what happened in bottles', () => {
  const text = describeDeficit({ type: 'RELEASE', deltaBottles: -30, stockAfter: -10, deviceExpectedStock: 20 });
  assert.match(text, /was 20 bottle\(s\) before/);
  assert.match(text, /now -10/);
});

test('isDuplicateKeyError recognises Mongo code 11000 only', () => {
  assert.equal(isDuplicateKeyError({ code: 11000 }), true);
  assert.equal(isDuplicateKeyError({ code: 1 }), false);
  assert.equal(isDuplicateKeyError(null), false);
  assert.equal(isDuplicateKeyError('boom'), false);
});
