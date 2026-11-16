import { connectToDatabase } from '../../../server/config/db';
import { Transaction } from '../../../server/models/Transaction';
import '../../../server/models/Product';
import '../../../server/models/User';
import { authenticate, requireOwner } from '../../../server/middleware/auth';
import { jsonOk, jsonError } from '../../../server/middleware/response';

const FLAGGED = 'CONCURRENCY_DEFICIT' as const;

/** A flagged record counts as open until an owner resolves it (legacy records have no status). */
const OPEN_FILTER = { discrepancy_flag: FLAGGED, discrepancy_status: { $ne: 'RESOLVED' as const } };
const RESOLVED_FILTER = { discrepancy_flag: FLAGGED, discrepancy_status: 'RESOLVED' as const };

/**
 * GET /api/discrepancies?status=open|resolved|all
 * NFR13: Lists transactions flagged CONCURRENCY_DEFICIT so the owner can audit and resolve them.
 * Owner only. Always returns open_count so the dashboard can show a badge from one call.
 */
export async function GET(req: Request): Promise<Response> {
  const auth = await authenticate(req);
  if (auth.errorResponse) return auth.errorResponse;

  const ownerCheck = requireOwner(auth.user!);
  if (ownerCheck) return ownerCheck;

  try {
    const status = new URL(req.url).searchParams.get('status') ?? 'open';
    if (!['open', 'resolved', 'all'].includes(status)) {
      return jsonError("status must be 'open', 'resolved' or 'all'.", 400);
    }

    await connectToDatabase();

    const filter =
      status === 'open'
        ? OPEN_FILTER
        : status === 'resolved'
          ? RESOLVED_FILTER
          : { discrepancy_flag: FLAGGED };

    const [docs, openCount] = await Promise.all([
      Transaction.find(filter)
        .sort({ created_at: -1 })
        .limit(100)
        .populate('product_id', 'brand_name product_name bottle_size units_per_case total_stock_bottles')
        .populate('user_id', 'username full_name')
        .populate('resolved_by', 'username full_name')
        .lean(),
      Transaction.countDocuments(OPEN_FILTER),
    ]);

    const discrepancies = docs.map((d: any) => ({
      id: String(d._id),
      uuid: d.uuid,
      status: d.discrepancy_status === 'RESOLVED' ? 'RESOLVED' : 'OPEN',
      transaction_type: d.transaction_type,
      total_bottles_delta: d.total_bottles_delta,
      device_expected_stock: d.resulting_stock_bottles,
      stock_after_sync: d.stock_after_sync ?? null,
      device_id: d.device_id,
      note: d.discrepancy_note ?? null,
      created_at: d.created_at,
      synced_at: d.synced_at ?? null,
      product: d.product_id && d.product_id._id
        ? {
            id: String(d.product_id._id),
            name: `${d.product_id.brand_name} ${d.product_id.product_name}`.trim(),
            bottle_size: d.product_id.bottle_size,
            units_per_case: d.product_id.units_per_case,
            current_stock_bottles: d.product_id.total_stock_bottles,
          }
        : null,
      recorded_by: d.user_id && d.user_id._id
        ? { username: d.user_id.username, full_name: d.user_id.full_name }
        : null,
      resolved_at: d.resolved_at ?? null,
      resolved_by: d.resolved_by && d.resolved_by._id
        ? { username: d.resolved_by.username, full_name: d.resolved_by.full_name }
        : null,
      resolution_note: d.resolution_note ?? null,
    }));

    return jsonOk({ open_count: openCount, discrepancies });
  } catch (error) {
    return jsonError(
      'Failed to load stock discrepancies.',
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
}
