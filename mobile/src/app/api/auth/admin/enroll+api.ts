import bcrypt from 'bcryptjs';
import { connectToDatabase } from '../../../../server/config/db';
import { User } from '../../../../server/models/User';
import { authenticate, requireOwner } from '../../../../server/middleware/auth';
import { jsonOk, jsonError } from '../../../../server/middleware/response';

/**
 * POST /api/auth/admin/enroll
 * FR6: Owner-only enrollment of newly hired staff or manager accounts.
 */
export async function POST(req: Request): Promise<Response> {
  const auth = authenticate(req);
  if (auth.errorResponse) return auth.errorResponse;

  const ownerCheck = requireOwner(auth.user!);
  if (ownerCheck) return ownerCheck;

  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.username || !body.full_name || !body.initial_password) {
      return jsonError('Username, full name, and initial password are required.', 400);
    }

    const { username, full_name, initial_password, role = 'staff' } = body;

    if (initial_password.length < 6) {
      return jsonError('Initial password must be at least 6 characters.', 400);
    }

    if (!['staff', 'owner/manager'].includes(role)) {
      return jsonError("Role must be 'staff' or 'owner/manager'.", 400);
    }

    await connectToDatabase();

    const existing = await User.findOne({ username: username.toLowerCase().trim() });
    if (existing) {
      return jsonError(`Username "${username}" is already taken.`, 409);
    }

    const password_hash = await bcrypt.hash(initial_password, 10);

    const newUser = new User({
      username: username.toLowerCase().trim(),
      full_name: full_name.trim(),
      password_hash,
      role,
      is_active: true,
      created_at: new Date(),
    });

    await newUser.save();

    return jsonOk(
      {
        message: 'Staff account successfully created.',
        user: {
          id: newUser._id.toString(),
          username: newUser.username,
          full_name: newUser.full_name,
          role: newUser.role,
          is_active: newUser.is_active,
          created_at: newUser.created_at,
        },
      },
      201
    );
  } catch (error) {
    return jsonError(
      'Failed to enroll staff account.',
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
}
