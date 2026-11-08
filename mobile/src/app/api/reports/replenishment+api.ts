import { connectToDatabase } from '../../../server/config/db';
import { Product } from '../../../server/models/Product';
import { authenticate, requireOwner } from '../../../server/middleware/auth';
import { jsonOk, jsonError } from '../../../server/middleware/response';

/**
 * GET /api/reports/replenishment
 * FR26: Returns all products whose total stock <= reorder threshold and exact deficit quantity.
 * Owner only.
 */
export async function GET(req: Request): Promise<Response> {
  const auth = authenticate(req);
  if (auth.errorResponse) return auth.errorResponse;

  const ownerCheck = requireOwner(auth.user!);
  if (ownerCheck) return ownerCheck;

  try {
    await connectToDatabase();

    // Query active products where total_stock_bottles <= reorder_threshold_bottles
    const products = await Product.find({
      is_active: true,
      $expr: { $lte: ['$total_stock_bottles', '$reorder_threshold_bottles'] },
    }).sort({ brand_name: 1, product_name: 1 });

    const replenishmentList = products.map((p) => {
      const deficit_bottles = Math.max(0, p.reorder_threshold_bottles - p.total_stock_bottles);
      const deficit_cases = Math.floor(deficit_bottles / p.units_per_case);
      const deficit_loose = deficit_bottles % p.units_per_case;

      return {
        product_id: p._id.toString(),
        brand_name: p.brand_name,
        product_name: p.product_name,
        bottle_size: p.bottle_size,
        units_per_case: p.units_per_case,
        current_stock_bottles: p.total_stock_bottles,
        reorder_threshold_bottles: p.reorder_threshold_bottles,
        deficit_bottles,
        deficit_display: `${deficit_cases} cases and ${deficit_loose} bottles`,
      };
    });

    return jsonOk({
      total_items_to_replenish: replenishmentList.length,
      replenishment: replenishmentList,
    });
  } catch (error) {
    return jsonError(
      'Failed to generate replenishment report.',
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
}
