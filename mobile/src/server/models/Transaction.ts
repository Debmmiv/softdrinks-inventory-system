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

export const Transaction: Model<ITransaction> =
  mongoose.models.Transaction ||
  mongoose.model<ITransaction>('Transaction', TransactionSchema);
