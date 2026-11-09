import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProduct extends Document {
  brand_name: string;
  product_name: string;
  bottle_size: string;
  units_per_case: number;
  reorder_threshold_bottles: number;
  total_stock_bottles: number;
  is_active: boolean;
  updated_at: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    brand_name: {
      type: String,
      required: true,
      trim: true,
    },
    product_name: {
      type: String,
      required: true,
      trim: true,
    },
    bottle_size: {
      type: String,
      required: true,
      trim: true,
    },
    units_per_case: {
      type: Number,
      required: true,
      min: 1,
      // Immutable per FR9: cannot be changed once transactions exist
    },
    reorder_threshold_bottles: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    total_stock_bottles: {
      type: Number,
      required: true,
      default: 0,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Compound unique index ensuring no duplicate products with same brand, name, and size
ProductSchema.index({ brand_name: 1, product_name: 1, bottle_size: 1 }, { unique: true });

export const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
