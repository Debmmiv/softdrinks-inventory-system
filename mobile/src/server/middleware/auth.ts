import jwt from 'jsonwebtoken';
import { jsonError } from './response';

export interface AuthUser {
  id: string;
  username: string;
  role: 'staff' | 'owner/manager';
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_softdrinks_gusa_2026';

/**
 * Signs a JWT token for a given user payload.
 */
export function signToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

/**
 * Extracts and verifies JWT from the Request Authorization header.
 * Returns either { user: AuthUser } or { errorResponse: Response }.
 */
export function authenticate(req: Request): { user?: AuthUser; errorResponse?: Response } {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      errorResponse: jsonError('Authentication required. Missing Bearer token.', 401),
    };
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    return { user: decoded };
  } catch {
    return {
      errorResponse: jsonError('Invalid or expired authentication token.', 401),
    };
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
