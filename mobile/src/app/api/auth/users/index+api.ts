import { connectToDatabase } from '../../../../server/config/db';
import { User } from '../../../../server/models/User';
import { authenticate, requireOwner } from '../../../../server/middleware/auth';
import { jsonOk, jsonError } from '../../../../server/middleware/response';

/**
 * GET /api/auth/users
 * FR7: Retrieves list of all users and their status (Owner only).
 */
export async function GET(req: Request): Promise<Response> {
  const auth = authenticate(req);
  if (auth.errorResponse) return auth.errorResponse;

  const ownerCheck = requireOwner(auth.user!);
  if (ownerCheck) return ownerCheck;

  try {
    await connectToDatabase();

    const users = await User.find(
      {},
      { password_hash: 0 } // Exclude password hash from payload
    ).sort({ created_at: -1 });

    return jsonOk({ users });
  } catch (error) {
    return jsonError(
      'Failed to retrieve users.',
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
}
