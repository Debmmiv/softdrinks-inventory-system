import mongoose from 'mongoose';
import { connectToDatabase } from '../../../server/config/db';
import { Transaction } from '../../../server/models/Transaction';
import { authenticate, requireOwner } from '../../../server/middleware/auth';
import { jsonOk, jsonError } from '../../../server/middleware/response';

/**
 * PATCH /api/discrepancies/:id
 * NFR13: Marks a CONCURRENCY_DEFICIT record as resolved after the owner's physical count.
 * Requires a resolution note so the audit trail records what was done. Owner only.
 * The ledger entry itself is never modified or deleted — only its review status.
 */
export async function PATCH(
  req: Request,
  context?: { params?: { id?: string } }
): Promise<Response> {
  const auth = await authenticate(req);
  if (auth.errorResponse) return auth.errorResponse;

  const ownerCheck = requireOwner(auth.user!);
  if (ownerCheck) return ownerCheck;

  try {
    const id = context?.params?.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return jsonError('A valid discrepancy id is required in the path.', 400);
    }

    const body = await req.json().catch(() => null);
    const note = typeof body?.resolution_note === 'string' ? body.resolution_note.trim() : '';
    if (note.length < 3) {
      return jsonError('A resolution note (at least 3 characters) is required.', 400);
    }
    if (note.length > 500) {
      return jsonError('Resolution note must be 500 characters or fewer.', 400);
    }

    await connectToDatabase();

    const updated = await Transaction.findOneAndUpdate(
      {
        _id: id,
        discrepancy_flag: 'CONCURRENCY_DEFICIT',
        discrepancy_status: { $ne: 'RESOLVED' },
      },
      {
        $set: {
          discrepancy_status: 'RESOLVED',
          resolved_by: auth.user!.id,
          resolved_at: new Date(),
          resolution_note: note,
        },
      },
      { returnDocument: 'after' }
    );

    if (!updated) {
      return jsonError('Discrepancy not found or already resolved.', 404);
    }

    const openCount = await Transaction.countDocuments({
      discrepancy_flag: 'CONCURRENCY_DEFICIT',
      discrepancy_status: { $ne: 'RESOLVED' },
    });

    return jsonOk({ message: 'Discrepancy marked as resolved.', open_count: openCount });
  } catch (error) {
    return jsonError(
      'Failed to resolve discrepancy.',
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
}
