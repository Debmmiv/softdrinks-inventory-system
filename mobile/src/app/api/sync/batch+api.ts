import mongoose from 'mongoose';
import { connectToDatabase } from '../../../server/config/db';
import { Transaction } from '../../../server/models/Transaction';
import { Product } from '../../../server/models/Product';
import { User } from '../../../server/models/User';
import { authenticate } from '../../../server/middleware/auth';
import { jsonOk, jsonError } from '../../../server/middleware/response';
import {
  validateTransaction,
  describeDeficit,
  isDuplicateKeyError,
} from '../../../server/services/txValidation';

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

/** Hard ceiling per request; the app itself sends at most 100 (NFR6). */
const MAX_BATCH_SIZE = 200;

const MOCK_NAME_MAP: Record<string, string> = {
  'mock-prod-001': 'Coca-Cola Glass Bottle',
  'mock-prod-002': 'Sprite',
  'mock-prod-003': 'Pepsi Cola',
  'mock-prod-004': 'Royal Tru-Orange',
  'mock-prod-005': 'Coke Mismo',
};

/** Resolves legacy mock product ids to real Atlas ids; returns null if the id is unusable. */
async function resolveProductId(rawId: string): Promise<string | null> {
  let id = rawId;
  if (id.startsWith('mock-prod-')) {
    const name = MOCK_NAME_MAP[id];
    if (name) {
      const found = await Product.findOne({ product_name: name }).select('_id');
      if (found) id = found._id.toString();
    }
  }
  return mongoose.Types.ObjectId.isValid(id) ? id : null;
}

/**
 * Applies one transaction ATOMICALLY: the stock increment and the ledger insert either both
 * commit or both roll back (requires a replica set, which every Atlas cluster is).
 *
 * The unique index on `uuid` is the idempotency guard. If two requests carry the same uuid,
 * the loser's insert throws a duplicate-key error, its transaction aborts (undoing its stock
 * increment), and we report the record as already synced. Stock is therefore changed once.
 */
async function applyTransaction(params: {
  tx: IncomingTx;
  productId: string;
  userId: string;
  syncedBy: string;
}): Promise<{ duplicate: boolean; flagged: boolean }> {
  const { tx, productId, userId, syncedBy } = params;
  const delta = tx.total_bottles_delta;
  const session = await mongoose.startSession();

  try {
    let flagged = false;

    await session.withTransaction(async () => {
      // withTransaction may re-run this callback on transient errors, so reset per attempt.
      flagged = false;

      const updated = await Product.findByIdAndUpdate(
        productId,
        { $inc: { total_stock_bottles: delta }, $set: { updated_at: new Date() } },
        { returnDocument: 'after', session }
      );
      if (!updated) throw new Error(`Product not found: ${productId}`);

      const stockAfter = updated.total_stock_bottles;

      // NFR13: only a movement that takes stock out and leaves it below zero is a deficit.
      // A later delivery that is still under zero is not itself a new discrepancy.
      flagged = delta < 0 && stockAfter < 0;

      await Transaction.create(
        [
          {
            uuid: tx.uuid,
            product_id: productId,
            user_id: userId,
            device_id: tx.device_id || 'unknown_device',
            transaction_type: tx.transaction_type,
            cases: Math.abs(tx.cases || 0),
            loose_bottles: Math.abs(tx.loose_bottles || 0),
            total_bottles_delta: delta,
            resulting_stock_bottles: tx.resulting_stock_bottles,
            reason: tx.reason ?? null,
            remarks: tx.remarks ?? null,
            reference_tag: tx.reference_tag ?? null,
            created_at: new Date(tx.created_at || Date.now()),
            stock_after_sync: stockAfter,
            synced_by: syncedBy,
            synced_at: new Date(),
            discrepancy_flag: flagged ? 'CONCURRENCY_DEFICIT' : null,
            discrepancy_status: flagged ? 'OPEN' : null,
            discrepancy_note: flagged
              ? describeDeficit({
                  type: tx.transaction_type,
                  deltaBottles: delta,
                  stockAfter,
                  deviceExpectedStock: tx.resulting_stock_bottles,
                })
              : null,
          },
        ],
        { session }
      );
    });

    return { duplicate: false, flagged };
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return { duplicate: true, flagged: false };
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

/**
 * POST /api/sync/batch
 * FR20, FR21, NFR3, NFR13:
 * Receives an array of offline transactions, validates each one against the product's pack
 * size, applies it atomically and idempotently, and flags concurrency deficits for owner review.
 */
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticate(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.transactions)) {
      return jsonError("Invalid payload. 'transactions' array is required.", 400);
    }
    if (body.transactions.length > MAX_BATCH_SIZE) {
      return jsonError(`Batch too large. Maximum is ${MAX_BATCH_SIZE} transactions.`, 413);
    }

    const transactions: IncomingTx[] = body.transactions;
    await connectToDatabase();

    // Attribution: honour the recorded user_id only when it is a real account (a shared phone's
    // queue may hold another staff member's work); otherwise fall back to the uploading session.
    const claimedIds = [
      ...new Set(
        transactions
          .map((t) => t?.user_id)
          .filter((id): id is string => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id))
      ),
    ];
    const knownUsers = new Set(
      claimedIds.length > 0
        ? (await User.find({ _id: { $in: claimedIds } }).select('_id').lean()).map((u) => String(u._id))
        : []
    );

    const synced: string[] = [];
    const failed: { uuid: string; reason: string }[] = [];
    let flaggedCount = 0;

    // Process sequentially in FIFO order (FR18)
    for (const tx of transactions) {
      try {
        if (!tx?.uuid || !tx.product_id || tx.total_bottles_delta === undefined) {
          failed.push({ uuid: tx?.uuid || 'unknown', reason: 'Missing required transaction fields.' });
          continue;
        }

        // Fast path for the common retry case; the unique index remains the real guarantee.
        if (await Transaction.exists({ uuid: tx.uuid })) {
          synced.push(tx.uuid);
          continue;
        }

        const productId = await resolveProductId(tx.product_id);
        if (!productId) {
          failed.push({ uuid: tx.uuid, reason: `Invalid product_id: ${tx.product_id}` });
          continue;
        }

        const product = await Product.findById(productId).select('units_per_case');
        if (!product) {
          failed.push({ uuid: tx.uuid, reason: `Product not found: ${tx.product_id}` });
          continue;
        }

        const problem = validateTransaction(tx, product.units_per_case);
        if (problem) {
          failed.push({ uuid: tx.uuid, reason: problem });
          continue;
        }

        const result = await applyTransaction({
          tx,
          productId,
          userId: knownUsers.has(tx.user_id) ? tx.user_id : auth.user!.id,
          syncedBy: auth.user!.id,
        });

        synced.push(tx.uuid);
        if (result.flagged) flaggedCount++;
      } catch (itemError) {
        failed.push({
          uuid: tx?.uuid || 'unknown',
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
      flagged_count: flaggedCount,
    });
  } catch (error) {
    return jsonError(
      'Batch synchronization failed.',
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
}
