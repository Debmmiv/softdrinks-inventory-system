import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITransaction extends Document {
  uuid: string;
  product_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  device_id: string;
  transaction_type: 'DELIVERY' | 'RELEASE' | 'ADJUSTMENT';
  cases: number;
  loose_bottles: number;
  total_bottles_delta: number;
  resulting_stock_bottles: number;
  reason: 'breakage' | 'damage' | 'loss' | 'count_correction' | null;
  remarks?: string | null;
  reference_tag?: string | null;
  discrepancy_flag?: 'CONCURRENCY_DEFICIT' | null;
  /** Review state of a flagged transaction. A missing value on a flagged record means OPEN. */
  discrepancy_status?: 'OPEN' | 'RESOLVED' | null;
  /** Server-generated explanation of why the record was flagged. */
  discrepancy_note?: string | null;
  resolved_by?: mongoose.Types.ObjectId | null;
  resolved_at?: Date | null;
  resolution_note?: string | null;
  /** Central stock (bottles) immediately after this transaction was applied. */
  stock_after_sync?: number | null;
  /** Account whose session uploaded the record (may differ from user_id on a shared phone). */
  synced_by?: mongoose.Types.ObjectId | null;
  /** Server clock at the moment the record was accepted (created_at is device-supplied). */
  synced_at?: Date | null;
  created_at: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    uuid: {
      type: String,
      required: true,
      unique: true, // Idempotency constraint (NFR3)
      index: true,
    },
    product_id: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    device_id: {
      type: String,
      required: true,
    },
    transaction_type: {
      type: String,
      enum: ['DELIVERY', 'RELEASE', 'ADJUSTMENT'],
      required: true,
    },
    cases: {
      type: Number,
      required: true,
      min: 0,
    },
    loose_bottles: {
      type: Number,
      required: true,
      min: 0,
    },
    total_bottles_delta: {
      type: Number,
      required: true,
    },
    resulting_stock_bottles: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      enum: ['breakage', 'damage', 'loss', 'count_correction', null],
      default: null,
    },
    remarks: {
      type: String,
      default: null,
    },
    reference_tag: {
      type: String,
      default: null,
    },
    discrepancy_flag: {
      type: String,
      enum: ['CONCURRENCY_DEFICIT', null],
      default: null,
    },
    discrepancy_status: {
      type: String,
      enum: ['OPEN', 'RESOLVED', null],
      default: null,
    },
    discrepancy_note: { type: String, default: null },
    resolved_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    resolved_at: { type: Date, default: null },
    resolution_note: { type: String, default: null },
    stock_after_sync: { type: Number, default: null },
    synced_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    synced_at: { type: Date, default: null },
    created_at: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Owner review queue lookups (open / resolved discrepancies, newest first)
TransactionSchema.index({ discrepancy_flag: 1, discrepancy_status: 1, created_at: -1 });

export const Transaction: Model<ITransaction> =
  mongoose.models.Transaction ||
  mongoose.model<ITransaction>('Transaction', TransactionSchema);
