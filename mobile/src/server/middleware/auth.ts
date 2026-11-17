import jwt from 'jsonwebtoken';
import { connectToDatabase } from '../config/db';
import { User } from '../models/User';
import { jsonError } from './response';

export interface AuthUser {
  id: string;
  username: string;
  role: 'staff' | 'owner/manager';
}

/** Shape of the claims we put inside the JWT. `tv` is the user's token_version at signing time. */
interface TokenPayload extends AuthUser {
  tv?: number;
  iat?: number;
}

/** Default session length. Override with JWT_EXPIRES_IN (e.g. "12h", "7d"). */
const TOKEN_TTL = (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET environment variable is missing.');
  }
  return secret;
}

/**
 * Signs a JWT for a given user. The user's current token_version is embedded so that
 * bumping the version in MongoDB invalidates every previously issued token.
 */
export function signToken(user: AuthUser, tokenVersion = 0): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      tv: tokenVersion,
    },
    getJwtSecret(),
    { expiresIn: TOKEN_TTL }
  );
}

/**
 * Verifies the Bearer token AND re-checks the account in MongoDB on every request:
 *   - the account must still exist and be active,
 *   - the token_version and passwordUpdatedAt must match (password reset / deactivation revokes old tokens),
 *   - the role is taken from the database, never from the token, so a demotion is immediate.
 *
 * Tokens issued before token_version existed carry no `tv` claim and are treated as version 0,
 * so existing sessions keep working until the first revocation event.
 */
export async function authenticate(
  req: Request
): Promise<{ user?: AuthUser; errorResponse?: Response }> {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      errorResponse: jsonError('Authentication required. Missing Bearer token.', 401),
    };
  }

  let secret: string;
  try {
    secret = getJwtSecret();
  } catch {
    // Misconfiguration is a server fault, not a bad token — do not disguise it as a 401.
    return { errorResponse: jsonError('Server configuration error.', 500) };
  }

  const token = authHeader.split(' ')[1];
  let decoded: TokenPayload;
  try {
    decoded = jwt.verify(token, secret) as TokenPayload;
  } catch {
    return {
      errorResponse: jsonError('Invalid or expired authentication token.', 401),
    };
  }

  try {
    await connectToDatabase();
    const record = await User.findById(decoded.id)
      .select('username role is_active token_version passwordUpdatedAt')
      .lean();

    if (!record) {
      return { errorResponse: jsonError('Account no longer exists. Please log in again.', 401) };
    }
    if (!record.is_active) {
      return { errorResponse: jsonError('This account has been deactivated.', 401) };
    }
    if ((record.token_version ?? 0) !== (decoded.tv ?? 0)) {
      return {
        errorResponse: jsonError('Session is no longer valid. Please log in again.', 401),
      };
    }
    if (record.passwordUpdatedAt && decoded.iat) {
      const passwordChangedSec = Math.floor(new Date(record.passwordUpdatedAt).getTime() / 1000);
      if (decoded.iat < passwordChangedSec) {
        return {
          errorResponse: jsonError('Session expired due to password change. Please log in again.', 401),
        };
      }
    }

    return {
      user: {
        id: String(record._id),
        username: record.username,
        role: record.role,
      },
    };
  } catch {
    // Database unreachable: 503 so clients treat it as transient and retry, not as a logout.
    return { errorResponse: jsonError('Unable to verify session. Please try again.', 503) };
  }
}

/**
 * Role-Based Access Control: Asserts that the authenticated user is an Owner/Manager.
 */
export function requireOwner(user: AuthUser): Response | null {
  if (user.role !== 'owner/manager') {
    return jsonError('Forbidden: Managerial privileges required.', 403);
  }
  return null;
}