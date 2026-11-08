import { connectToDatabase } from '../../../server/config/db';
import { Product } from '../../../server/models/Product';
import { authenticate, requireOwner } from '../../../server/middleware/auth';
import { jsonOk, jsonError } from '../../../server/middleware/response';

/**
 * GET /api/products
 * FR8, FR27: Fetches soft drinks product catalog.
 * Authenticated for both staff and owners.
 */
export async function GET(req: Request): Promise<Response> {
  const auth = authenticate(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    await connectToDatabase();

    const url = new URL(req.url);
    const includeInactive = url.searchParams.get('include_inactive') === 'true';

    const filter = includeInactive && auth.user!.role === 'owner/manager' ? {} : { is_active: true };

    const products = await Product.find(filter).sort({ brand_name: 1, product_name: 1 });

    return jsonOk({ products });
  } catch (error) {
    return jsonError(
      'Failed to fetch products.',
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * POST /api/products
 * FR8, FR10: Creates a new soft drink product with mandatory attributes.
 * Owner only.
 */
export async function POST(req: Request): Promise<Response> {
  const auth = authenticate(req);
  if (auth.errorResponse) return auth.errorResponse;

  const ownerCheck = requireOwner(auth.user!);
  if (ownerCheck) return ownerCheck;

  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return jsonError('Invalid request body.', 400);
    }

    const {
      brand_name,
      product_name,
      bottle_size,
      units_per_case,
      reorder_threshold_bottles = 0,
      initial_stock_bottles = 0,
    } = body;

    if (!brand_name || !product_name || !bottle_size || units_per_case === undefined) {
      return jsonError(
        'Missing mandatory fields: brand_name, product_name, bottle_size, units_per_case.',
        400
      );
    }

    if (!Number.isInteger(units_per_case) || units_per_case < 1) {
      return jsonError('units_per_case must be an integer greater than or equal to 1.', 400);
    }

    if (!Number.isInteger(reorder_threshold_bottles) || reorder_threshold_bottles < 0) {
      return jsonError('reorder_threshold_bottles must be an integer >= 0.', 400);
    }

    await connectToDatabase();

    const newProduct = new Product({
      brand_name: brand_name.trim(),
      product_name: product_name.trim(),
      bottle_size: bottle_size.trim(),
      units_per_case,
      reorder_threshold_bottles,
      total_stock_bottles: initial_stock_bottles,
      is_active: true,
      updated_at: new Date(),
    });

    await newProduct.save();

    return jsonOk(
      {
        message: 'Product created successfully.',
        product: newProduct,
      },
      201
    );
  } catch (error) {
    return jsonError(
      'Failed to create product.',
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
}
