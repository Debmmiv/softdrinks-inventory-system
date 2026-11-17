import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  loginRetryAfterMs,
  recordLoginFailure,
  clearLoginFailures,
  resetRateLimiter,
  getClientIp,
  LOGIN_WINDOW_MS,
  MAX_FAILURES_PER_ACCOUNT,
  MAX_FAILURES_PER_IP,
} from './rateLimit';

beforeEach(() => resetRateLimiter());

test('a fresh caller is allowed', () => {
  assert.equal(loginRetryAfterMs('1.1.1.1', 'maria'), 0);
});

test('blocks an account after too many failures, with a wait time', () => {
  const t0 = 1_000_000;
  for (let i = 0; i < MAX_FAILURES_PER_ACCOUNT; i++) recordLoginFailure('1.1.1.1', 'maria', t0);
  const wait = loginRetryAfterMs('1.1.1.1', 'maria', t0 + 1000);
  assert.ok(wait > 0 && wait <= LOGIN_WINDOW_MS);
});

test('usernames are case-insensitive for throttling', () => {
  const t0 = 1_000_000;
  for (let i = 0; i < MAX_FAILURES_PER_ACCOUNT; i++) recordLoginFailure('1.1.1.1', 'MARIA', t0);
  assert.ok(loginRetryAfterMs('1.1.1.1', ' maria ', t0) > 0);
});

test('one account being blocked does not block another account from the same IP', () => {
  const t0 = 1_000_000;
  for (let i = 0; i < MAX_FAILURES_PER_ACCOUNT; i++) recordLoginFailure('1.1.1.1', 'maria', t0);
  assert.equal(loginRetryAfterMs('1.1.1.1', 'jose', t0), 0);
});

test('a different IP can still log in to the targeted account', () => {
  const t0 = 1_000_000;
  for (let i = 0; i < MAX_FAILURES_PER_ACCOUNT; i++) recordLoginFailure('1.1.1.1', 'maria', t0);
  assert.equal(loginRetryAfterMs('2.2.2.2', 'maria', t0), 0);
});

test('a successful login clears the account counter', () => {
  const t0 = 1_000_000;
  for (let i = 0; i < MAX_FAILURES_PER_ACCOUNT - 1; i++) recordLoginFailure('1.1.1.1', 'maria', t0);
  clearLoginFailures('1.1.1.1', 'maria');
  recordLoginFailure('1.1.1.1', 'maria', t0);
  assert.equal(loginRetryAfterMs('1.1.1.1', 'maria', t0), 0);
});

test('the block expires after the window', () => {
  const t0 = 1_000_000;
  for (let i = 0; i < MAX_FAILURES_PER_ACCOUNT; i++) recordLoginFailure('1.1.1.1', 'maria', t0);
  assert.equal(loginRetryAfterMs('1.1.1.1', 'maria', t0 + LOGIN_WINDOW_MS + 1), 0);
});

test('one IP guessing many usernames is eventually blocked entirely', () => {
  const t0 = 1_000_000;
  for (let i = 0; i < MAX_FAILURES_PER_IP; i++) recordLoginFailure('9.9.9.9', `user${i}`, t0);
  assert.ok(loginRetryAfterMs('9.9.9.9', 'brand-new-user', t0) > 0);
});

test('getClientIp prefers the first x-forwarded-for entry', () => {
  const req = new Request('http://x/api', { headers: { 'x-forwarded-for': '3.3.3.3, 10.0.0.1' } });
  assert.equal(getClientIp(req), '3.3.3.3');
  assert.equal(getClientIp(new Request('http://x/api')), 'unknown');
});
