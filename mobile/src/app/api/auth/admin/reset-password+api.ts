import bcrypt from 'bcryptjs';
import { connectToDatabase } from '../../../../server/config/db';
import { User } from '../../../../server/models/User';
import { authenticate, requireOwner } from '../../../../server/middleware/auth';
import { jsonOk, jsonError } from '../../../../server/middleware/response';

/**
 * POST /api/auth/admin/reset-password
 * FR29: Owner reset forgotten staff password to a new temporary credential.
 */
export async function POST(req: Request): Promise<Response> {
  const auth = authenticate(req);
  if (auth.errorResponse) return auth.errorResponse;

  const ownerCheck = requireOwner(auth.user!);
  if (ownerCheck) return ownerCheck;

  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.user_id || !body.new_temporary_password) {
      return jsonError('user_id and new_temporary_password are required.', 400);
    }

    const { user_id, new_temporary_password } = body;

    if (new_temporary_password.length < 6) {
      return jsonError('Temporary password must be at least 6 characters.', 400);
    }

    await connectToDatabase();

    const user = await User.findById(user_id);
    if (!user) {
      return jsonError('User account not found.', 404);
    }

    user.password_hash = await bcrypt.hash(new_temporary_password, 10);
    await user.save();

    return jsonOk({
      message: `Password for ${user.username} has been reset successfully.`,
    });
  } catch (error) {
    return jsonError(
      'Failed to reset password.',
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
}
