import bcrypt from 'bcryptjs';
import { connectToDatabase } from '../../../server/config/db';
import { User } from '../../../server/models/User';
import { signToken } from '../../../server/middleware/auth';
import { jsonOk, jsonError } from '../../../server/middleware/response';
import {
  getClientIp,
  loginRetryAfterMs,
  recordLoginFailure,
  clearLoginFailures,
} from '../../../server/middleware/rateLimit';

/**
 * Compared against when the username does not exist so that "unknown user" and "wrong
 * password" take the same time (no username enumeration by timing).
 */
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer-not-a-real-password', 10);

/**
 * POST /api/auth/login
 * FR2, NFR7: Authenticates username & password against MongoDB Atlas.
 * Returns signed JWT token with user ID and role.
 *
 * Hardening: failed attempts are throttled (429), unknown users cost the same as wrong
 * passwords, and account status is only revealed after the password is verified.
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => null);
    if (
      !body ||
      typeof body.username !== 'string' ||
      typeof body.password !== 'string' ||
      !body.username ||
      !body.password
    ) {
      return jsonError('Username and password are required.', 400);
    }

    const username = body.username.toLowerCase().trim();
    const password: string = body.password;
    const ip = getClientIp(req);

    const waitMs = loginRetryAfterMs(ip, username);
    if (waitMs > 0) {
      const waitSeconds = Math.ceil(waitMs / 1000);
      return jsonError(
        'Too many failed login attempts. Please wait a few minutes and try again.',
        429,
        null,
        { 'Retry-After': String(waitSeconds) }
      );
    }

    await connectToDatabase();

    const user = await User.findOne({ username });
    const isMatch = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);

    if (!user || !isMatch) {
      recordLoginFailure(ip, username);
      return jsonError('Invalid username or password.', 401);
    }

    if (!user.is_active) {
      return jsonError('This account has been deactivated. Please contact the owner.', 403);
    }

    clearLoginFailures(ip, username);

    const token = signToken(
      {
        id: user._id.toString(),
        username: user.username,
        role: user.role,
      },
      user.token_version ?? 0
    );

    return jsonOk({
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        is_active: user.is_active,
      },
    });
  } catch (error) {
    return jsonError(
      'An unexpected error occurred during login.',
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
}
