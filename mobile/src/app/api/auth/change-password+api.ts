import bcrypt from 'bcryptjs';
import { connectToDatabase } from '../../../server/config/db';
import { User } from '../../../server/models/User';
import { authenticate, signToken } from '../../../server/middleware/auth';
import { jsonOk, jsonError } from '../../../server/middleware/response';
import { validatePassword } from '../../../server/services/passwordPolicy';

/**
 * POST /api/auth/change-password
 * FR28: Allows staff or owner to self-serve change their password.
 */
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticate(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.current_password || !body.new_password) {
      return jsonError('Current password and new password are required.', 400);
    }

    const { current_password, new_password } = body;

    await connectToDatabase();

    const user = await User.findById(auth.user!.id);
    if (!user) {
      return jsonError('User account not found.', 404);
    }

    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isMatch) {
      return jsonError('Current password is incorrect.', 400);
    }

    // Security: Prevent reusing the current password
    const isSamePassword = await bcrypt.compare(new_password, user.password_hash);
    if (isSamePassword) {
      return jsonError('New password cannot be the same as your current password.', 400);
    }

    // Security: Enforce strict password policy
    const policy = validatePassword(new_password, user.username);
    if (!policy.valid) {
      return jsonError(
        `Password does not meet security requirements: ${policy.errors.join(', ')}`,
        400,
        policy.errors
      );
    }

    // Bumping token_version signs the account out everywhere else; this device gets a fresh token.
    const updated = await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          password_hash: await bcrypt.hash(new_password, 10),
          passwordUpdatedAt: new Date(),
        },
        $inc: { token_version: 1 },
      },
      { returnDocument: 'after' }
    );
    if (!updated) {
      return jsonError('User account not found.', 404);
    }

    const token = signToken(
      { id: updated._id.toString(), username: updated.username, role: updated.role },
      updated.token_version ?? 0
    );

    return jsonOk({ message: 'Password updated successfully.', token });
  } catch (error) {
    return jsonError(
      'Failed to update password.',
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
}
