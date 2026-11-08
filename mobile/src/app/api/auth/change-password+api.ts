import bcrypt from 'bcryptjs';
import { connectToDatabase } from '../../../server/config/db';
import { User } from '../../../server/models/User';
import { authenticate } from '../../../server/middleware/auth';
import { jsonOk, jsonError } from '../../../server/middleware/response';

/**
 * POST /api/auth/change-password
 * FR28: Allows staff or owner to self-serve change their password.
 */
export async function POST(req: Request): Promise<Response> {
  const auth = authenticate(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.current_password || !body.new_password) {
      return jsonError('Current password and new password are required.', 400);
    }

    const { current_password, new_password } = body;

    if (new_password.length < 6) {
      return jsonError('New password must be at least 6 characters.', 400);
    }

    await connectToDatabase();

    const user = await User.findById(auth.user!.id);
    if (!user) {
      return jsonError('User account not found.', 404);
    }

    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isMatch) {
      return jsonError('Current password is incorrect.', 400);
    }

    user.password_hash = await bcrypt.hash(new_password, 10);
    await user.save();

    return jsonOk({ message: 'Password updated successfully.' });
  } catch (error) {
    return jsonError(
      'Failed to update password.',
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
}
