import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toTotalBottles,
  toCasesAndBottles,
  formatStock,
  isValidQuantity,
  reconcileLocalStock,
} from './calculations';

test('toTotalBottles applies the FR15 formula', () => {
  assert.equal(toTotalBottles(50, 12, 24), 1212);
  assert.equal(toTotalBottles(0, 5, 24), 5);
});

test('toCasesAndBottles splits a raw count', () => {
  assert.deepEqual(toCasesAndBottles(50, 24), { cases: 2, remaining_bottles: 2 });
  assert.deepEqual(toCasesAndBottles(48, 24), { cases: 2, remaining_bottles: 0 });
  assert.deepEqual(toCasesAndBottles(7, 0), { cases: 0, remaining_bottles: 7 });
});

test('formatStock handles singular, plural and zero parts', () => {
  assert.equal(formatStock(1, 24), '1 bottle');
  assert.equal(formatStock(5, 24), '5 bottles');
  assert.equal(formatStock(24, 24), '1 case');
  assert.equal(formatStock(48, 24), '2 cases');
  assert.equal(formatStock(50, 24), '2 cases and 2 bottles');
  assert.equal(formatStock(25, 24), '1 case and 1 bottle');
});

test('isValidQuantity requires non-negative integers with a positive total', () => {
  assert.equal(isValidQuantity(1, 0), true);
  assert.equal(isValidQuantity(0, 3), true);
  assert.equal(isValidQuantity(0, 0), false);
  assert.equal(isValidQuantity(-1, 5), false);
  assert.equal(isValidQuantity(1.5, 0), false);
});

test('reconcileLocalStock keeps unsynced local work on top of the server total', () => {
  // Server says 100. This phone released 30 bottles that are not synced yet.
  assert.equal(reconcileLocalStock(100, -30), 70);
  // Unsynced delivery of 48 on top of server 10.
  assert.equal(reconcileLocalStock(10, 48), 58);
  // Nothing pending: the server value is shown as is.
  assert.equal(reconcileLocalStock(100, 0), 100);
});
