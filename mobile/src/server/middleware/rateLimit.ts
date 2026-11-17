/**
 * Minimal in-memory login throttle (brute-force protection).
 *
 * - Failed attempts are counted per (ip + username) and per ip.
 * - After MAX_FAILURES inside WINDOW_MS the caller is told to wait.
 * - A successful login clears that (ip + username) counter.
 *
 * Limitation: state lives in this server process. That is enough for a single Node server;
 * if you ever run several instances, move the counters to MongoDB or Redis.
 */

export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const MAX_FAILURES_PER_ACCOUNT = 8;
export const MAX_FAILURES_PER_IP = 40;
const MAX_TRACKED_KEYS = 5000;

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function prune(now: number): void {
  if (buckets.size < MAX_TRACKED_KEYS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  // Still too big (attack with many distinct keys): drop the oldest entries.
  while (buckets.size >= MAX_TRACKED_KEYS) {
    const first = buckets.keys().next().value;
    if (first === undefined) break;
    buckets.delete(first);
  }
}

function accountKey(ip: string, username: string): string {
  return `acct:${ip}|${username.toLowerCase().trim()}`;
}

function ipKey(ip: string): string {
  return `ip:${ip}`;
}

function remainingMs(key: string, limit: number, now: number): number {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) return 0;
  return bucket.count >= limit ? bucket.resetAt - now : 0;
}

/** Best-effort client address (works behind a single reverse proxy). */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim() || 'unknown';
  return req.headers.get('x-real-ip') || 'unknown';
}

/** Milliseconds the caller must wait before trying again; 0 means the attempt is allowed. */
export function loginRetryAfterMs(ip: string, username: string, now = Date.now()): number {
  return Math.max(
    remainingMs(accountKey(ip, username), MAX_FAILURES_PER_ACCOUNT, now),
    remainingMs(ipKey(ip), MAX_FAILURES_PER_IP, now)
  );
}

export function recordLoginFailure(ip: string, username: string, now = Date.now()): void {
  prune(now);
  for (const key of [accountKey(ip, username), ipKey(ip)]) {
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    } else {
      bucket.count += 1;
    }
  }
}

export function clearLoginFailures(ip: string, username: string): void {
  buckets.delete(accountKey(ip, username));
}

/** Test helper. */
export function resetRateLimiter(): void {
  buckets.clear();
}
