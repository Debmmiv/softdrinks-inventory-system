import bcrypt from 'bcryptjs';
import { connectToDatabase } from '../../../server/config/db';
import { User } from '../../../server/models/User';
import { signToken } from '../../../server/middleware/auth';
import { jsonOk, jsonError } from '../../../server/middleware/response';

/**
 * POST /api/auth/login
 * FR2, NFR7: Authenticates username & password against MongoDB Atlas.
 * Returns signed JWT token with user ID and role.
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.username || !body.password) {
      return jsonError('Username and password are required.', 400);
    }

    const { username, password } = body;

    await connectToDatabase();

    const user = await User.findOne({ username: username.toLowerCase().trim() });
    if (!user) {
      return jsonError('Invalid username or password.', 401);
    }

    if (!user.is_active) {
      return jsonError('This account has been deactivated. Please contact the owner.', 403);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return jsonError('Invalid username or password.', 401);
    }

    const token = signToken({
      id: user._id.toString(),
      username: user.username,
      role: user.role,
    });

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
