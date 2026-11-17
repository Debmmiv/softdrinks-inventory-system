import { connectToDatabase } from '../../../server/config/db';
import { Product } from '../../../server/models/Product';
import { Transaction } from '../../../server/models/Transaction';
import { User } from '../../../server/models/User';
import { authenticate, requireOwner } from '../../../server/middleware/auth';
import { jsonOk, jsonError } from '../../../server/middleware/response';

/**
 * GET /api/backup/export
 * Exports a JSON snapshot of MongoDB collections for disaster recovery.
 *
 * Query params:
 *   scope: 'inventory' (products + users only), 'recent' (last 30 days), 'all' (default, with safe limit)
 *   limit: maximum transactions to export (default 1000, max 10000 to prevent heap exhaustion)
 *
 * Owner only.
 */
export async function GET(req: Request): Promise<Response> {
  const auth = await authenticate(req);
  if (auth.errorResponse) return auth.errorResponse;

  const ownerCheck = requireOwner(auth.user!);
  if (ownerCheck) return ownerCheck;

  try {
    const url = new URL(req.url);
    const scope = url.searchParams.get('scope') || 'all';
    const limitParam = parseInt(url.searchParams.get('limit') || '1000', 10);
    const txLimit = Math.max(10, Math.min(10000, isNaN(limitParam) ? 1000 : limitParam));

    await connectToDatabase();

    // 1. Fetch products (always lightweight and vital for inventory)
    const products = await Product.find({})
      .sort({ brand_name: 1, product_name: 1 })
      .lean();

    // 2. Fetch users (excluding password hashes)
    const users = await User.find({})
      .select('-password_hash')
      .sort({ created_at: 1 })
      .lean();

    // 3. Fetch transactions based on scope to avoid V8 heap exhaustion
    let transactions: any[] = [];
    if (scope !== 'inventory') {
      const txQuery: Record<string, any> = {};
      if (scope === 'recent') {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        txQuery.created_at = { $gte: thirtyDaysAgo };
      }

      transactions = await Transaction.find(txQuery)
        .select(
          '_id uuid product_id user_id device_id transaction_type cases loose_bottles total_bottles_delta resulting_stock_bottles reason remarks reference_tag created_at'
        )
        .sort({ created_at: -1 })
        .limit(txLimit)
        .lean();
    }

    const now = new Date();

    const backup = {
      meta: {
        version: '1.0',
        scope,
        generated_at: now.toISOString(),
        generated_by: auth.user!.username,
        record_counts: {
          products: products.length,
          transactions: transactions.length,
          users: users.length,
        },
        total_records: products.length + transactions.length + users.length,
      },
      products,
      transactions,
      users,
    };

    return jsonOk(backup);
  } catch (error) {
    return jsonError(
      'Failed to generate backup.',
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
}
