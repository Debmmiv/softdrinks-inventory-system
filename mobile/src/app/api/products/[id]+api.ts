import { connectToDatabase } from '../../../server/config/db';
import { Product } from '../../../server/models/Product';
import { Transaction } from '../../../server/models/Transaction';
import { authenticate, requireOwner } from '../../../server/middleware/auth';
import { jsonOk, jsonError } from '../../../server/middleware/response';

/**
 * PATCH /api/products/:id
 * FR9: Updates product specifications or deactivates product.
 * Enforces pack size immutability if transactions exist.
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
    const productId = context?.params?.id;
    if (!productId) {
      return jsonError('Missing product id in request path.', 400);
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return jsonError('Invalid request body.', 400);
    }

    await connectToDatabase();

    const product = await Product.findById(productId);
    if (!product) {
      return jsonError('Product not found.', 404);
    }

    // FR9 Pack Size Immutability Check
    if (
      body.units_per_case !== undefined &&
      body.units_per_case !== product.units_per_case
    ) {
      const hasTransactions = await Transaction.exists({ product_id: productId });
      if (hasTransactions) {
        return jsonError(
          'Pack size (units_per_case) is immutable once transactions have been recorded for this product to prevent historical audit corruption.',
          400
        );
      }
      if (!Number.isInteger(body.units_per_case) || body.units_per_case < 1) {
        return jsonError('units_per_case must be an integer >= 1.', 400);
      }
      product.units_per_case = body.units_per_case;
    }

    if (body.brand_name) product.brand_name = body.brand_name.trim();
    if (body.product_name) product.product_name = body.product_name.trim();
    if (body.bottle_size) product.bottle_size = body.bottle_size.trim();
    if (body.reorder_threshold_bottles !== undefined) {
      product.reorder_threshold_bottles = Math.max(0, parseInt(body.reorder_threshold_bottles) || 0);
    }
    if (typeof body.is_active === 'boolean') {
      product.is_active = body.is_active;
    }

    product.updated_at = new Date();
    await product.save();

    return jsonOk({
      message: 'Product updated successfully.',
      product,
    });
  } catch (error) {
    return jsonError(
      'Failed to update product.',
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
}
