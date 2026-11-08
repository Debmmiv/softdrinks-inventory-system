import { connectToDatabase } from '../../../server/config/db';
import { Transaction } from '../../../server/models/Transaction';
import { Product } from '../../../server/models/Product';
import { authenticate, requireOwner } from '../../../server/middleware/auth';
import { jsonOk, jsonError } from '../../../server/middleware/response';

/**
 * GET /api/reports/summary
 * FR25: Generates inventory movements and cumulative received/released/adjusted totals.
 * Owner only.
 */
export async function GET(req: Request): Promise<Response> {
  const auth = authenticate(req);
  if (auth.errorResponse) return auth.errorResponse;

  const ownerCheck = requireOwner(auth.user!);
  if (ownerCheck) return ownerCheck;

  try {
    const url = new URL(req.url);
    const startDateParam = url.searchParams.get('start_date');
    const endDateParam = url.searchParams.get('end_date');
    const typeParam = url.searchParams.get('type');

    await connectToDatabase();

    const dateFilter: Record<string, unknown> = {};
    if (startDateParam) {
      const start = new Date(startDateParam);
      if (!isNaN(start.getTime())) dateFilter.$gte = start;
    }
    if (endDateParam) {
      const end = new Date(endDateParam);
      if (!isNaN(end.getTime())) dateFilter.$lte = end;
    }

    const matchQuery: Record<string, unknown> = {};
    if (Object.keys(dateFilter).length > 0) {
      matchQuery.created_at = dateFilter;
    }
    if (typeParam && ['DELIVERY', 'RELEASE', 'ADJUSTMENT'].includes(typeParam)) {
      matchQuery.transaction_type = typeParam;
    }

    // Aggregation pipeline to compute cumulative totals per product and transaction type
    const summary = await Transaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            product_id: '$product_id',
            transaction_type: '$transaction_type',
          },
          total_cases: { $sum: '$cases' },
          total_loose_bottles: { $sum: '$loose_bottles' },
          total_bottles_delta: { $sum: '$total_bottles_delta' },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id.product_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          product_id: '$_id.product_id',
          product_name: {
            $concat: [
              { $ifNull: ['$product.brand_name', ''] },
              ' ',
              { $ifNull: ['$product.product_name', ''] },
              ' (',
              { $ifNull: ['$product.bottle_size', ''] },
              ')',
            ],
          },
          transaction_type: '$_id.transaction_type',
          total_cases: 1,
          total_loose_bottles: 1,
          total_bottles_delta: 1,
          transaction_count: '$count',
        },
      },
      { $sort: { product_name: 1, transaction_type: 1 } },
    ]);

    return jsonOk({
      filter: {
        start_date: startDateParam,
        end_date: endDateParam,
        type: typeParam,
      },
      movements: summary,
    });
  } catch (error) {
    return jsonError(
      'Failed to generate summary report.',
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
}
