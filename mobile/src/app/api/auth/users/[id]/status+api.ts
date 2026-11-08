import { connectToDatabase } from '../../../../../server/config/db';
import { User } from '../../../../../server/models/User';
import { authenticate, requireOwner } from '../../../../../server/middleware/auth';
import { jsonOk, jsonError } from '../../../../../server/middleware/response';

/**
 * PATCH /api/auth/users/:id/status
 * FR7: Toggles active status of an account.
 */
export async function PATCH(
  req: Request,
  context?: { params?: { id?: string } }
): Promise<Response> {
  const auth = authenticate(req);
  if (auth.errorResponse) return auth.errorResponse;

  const ownerCheck = requireOwner(auth.user!);
  if (ownerCheck) return ownerCheck;

  try {
    const userId = context?.params?.id;
    if (!userId) {
      return jsonError('Missing user id in request path.', 400);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.is_active !== 'boolean') {
      return jsonError('is_active (boolean) is required in the body.', 400);
    }

    await connectToDatabase();

    // Prevent owner from deactivating their own account
    if (userId === auth.user!.id && body.is_active === false) {
      return jsonError('You cannot deactivate your own owner account.', 400);
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { is_active: body.is_active },
      { returnDocument: 'after', select: '-password_hash' }
    );

    if (!updatedUser) {
      return jsonError('User account not found.', 404);
    }

    return jsonOk({
      message: `User status updated to ${body.is_active ? 'Active' : 'Inactive'}.`,
      user: updatedUser,
    });
  } catch (error) {
    return jsonError(
      'Failed to update user status.',
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
}
