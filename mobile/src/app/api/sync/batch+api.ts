import mongoose from 'mongoose';
import { connectToDatabase } from '../../../server/config/db';
import { Transaction } from '../../../server/models/Transaction';
import { Product } from '../../../server/models/Product';
import { authenticate } from '../../../server/middleware/auth';
import { jsonOk, jsonError } from '../../../server/middleware/response';

interface IncomingTx {
  uuid: string;
  product_id: string;
  user_id: string;
  device_id: string;
  transaction_type: 'DELIVERY' | 'RELEASE' | 'ADJUSTMENT';
  cases: number;
  loose_bottles: number;
  total_bottles_delta: number;
  resulting_stock_bottles: number;
  reason?: 'breakage' | 'damage' | 'loss' | 'count_correction' | null;
  remarks?: string | null;
  reference_tag?: string | null;
  created_at: string;
}

/**
 * POST /api/sync/batch
 * FR20, FR21, NFR3, NFR13:
 * Receives array of offline transactions, checks UUID idempotency against MongoDB Atlas,
 * atomically updates centralized product stock, and flags concurrency deficits.
 */
export async function POST(req: Request): Promise<Response> {
  const auth = authenticate(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.transactions)) {
      return jsonError("Invalid payload. 'transactions' array is required.", 400);
    }

    const transactions: IncomingTx[] = body.transactions;
    await connectToDatabase();

    const synced: string[] = [];
    const failed: { uuid: string; reason: string }[] = [];

    // Process transactions sequentially in FIFO order (FR18)
    for (const tx of transactions) {
      try {
        if (!tx.uuid || !tx.product_id || tx.total_bottles_delta === undefined) {
          failed.push({ uuid: tx.uuid || 'unknown', reason: 'Missing required transaction fields.' });
          continue;
        }

        // 1. Idempotency Check (FR20, NFR3)
        // If this UUID was already saved in Atlas, acknowledge it without double-counting stock!
        const existingTx = await Transaction.findOne({ uuid: tx.uuid });
        if (existingTx) {
          synced.push(tx.uuid);
          continue;
        }

        // 2. Validate product exists (resolve legacy mock IDs if present)
        let targetProductId = tx.product_id;
        if (targetProductId.startsWith('mock-prod-')) {
          const mockNameMap: Record<string, string> = {
            'mock-prod-001': 'Coca-Cola Glass Bottle',
            'mock-prod-002': 'Sprite',
            'mock-prod-003': 'Pepsi Cola',
            'mock-prod-004': 'Royal Tru-Orange',
            'mock-prod-005': 'Coke Mismo',
          };
          const targetName = mockNameMap[targetProductId];
          if (targetName) {
            const found = await Product.findOne({ product_name: targetName });
            if (found) targetProductId = found._id.toString();
          }
        }

        if (!mongoose.Types.ObjectId.isValid(targetProductId)) {
          failed.push({ uuid: tx.uuid, reason: `Invalid product_id: ${tx.product_id}` });
          continue;
        }

        const product = await Product.findById(targetProductId);
        if (!product) {
          failed.push({ uuid: tx.uuid, reason: `Product not found: ${tx.product_id}` });
          continue;
        }

        // 3. Insert transaction document
        const newTx = new Transaction({
          uuid: tx.uuid,
          product_id: targetProductId,
          user_id: mongoose.Types.ObjectId.isValid(tx.user_id) ? tx.user_id : auth.user!.id,
          device_id: tx.device_id || 'unknown_device',
          transaction_type: tx.transaction_type,
          cases: Math.abs(tx.cases || 0),
          loose_bottles: Math.abs(tx.loose_bottles || 0),
          total_bottles_delta: tx.total_bottles_delta,
          resulting_stock_bottles: tx.resulting_stock_bottles,
          reason: tx.reason ?? null,
          remarks: tx.remarks ?? null,
          reference_tag: tx.reference_tag ?? null,
          created_at: new Date(tx.created_at || Date.now()),
        });

        // 4. Atomically update central product stock (FR21)
        const updatedProduct = await Product.findByIdAndUpdate(
          targetProductId,
          {
            $inc: { total_stock_bottles: tx.total_bottles_delta },
            $set: { updated_at: new Date() },
          },
          { returnDocument: 'after' }
        );

        // 5. NFR13: Concurrency Deficit Flagging
        // If multi-device concurrent offline releases cause central stock to fall below zero:
        if (updatedProduct && updatedProduct.total_stock_bottles < 0) {
          newTx.discrepancy_flag = 'CONCURRENCY_DEFICIT';
        }

        await newTx.save();
        synced.push(tx.uuid);
      } catch (itemError) {
        failed.push({
          uuid: tx.uuid,
          reason: itemError instanceof Error ? itemError.message : String(itemError),
        });
      }
    }

    return jsonOk({
      synced,
      failed,
      processed_count: transactions.length,
      synced_count: synced.length,
      failed_count: failed.length,
    });
  } catch (error) {
    return jsonError(
      'Batch synchronization failed.',
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
}
