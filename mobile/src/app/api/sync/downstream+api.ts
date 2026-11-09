import { connectToDatabase } from '../../../server/config/db';
import { Product } from '../../../server/models/Product';
import { authenticate } from '../../../server/middleware/auth';
import { jsonOk, jsonError } from '../../../server/middleware/response';

/**
 * GET /api/sync/downstream
 * FR23, FR31: Returns updated products and authoritative stock levels since a timestamp.
 */
export async function GET(req: Request): Promise<Response> {
  const auth = authenticate(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const url = new URL(req.url);
    const sinceParam = url.searchParams.get('since');

    await connectToDatabase();

    // Authoritative active catalog reconciliation (FR23, FR31)
    const products = await Product.find({ is_active: true }).sort({ brand_name: 1, product_name: 1 });

    return jsonOk({
      server_time: new Date().toISOString(),
      count: products.length,
      products,
    });
  } catch (error) {
    return jsonError(
      'Downstream synchronization failed.',
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
}
