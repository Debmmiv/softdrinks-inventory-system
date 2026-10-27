const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transaction_id: { type: String, required: true, unique: true }, // blocks duplicates
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  type: { type: String, enum: ['DELIVERY', 'RELEASE', 'ADJUSTMENT'], required: true },
  cases: { type: Number, default: 0 },
  bottles: { type: Number, default: 0 },
  total_bottles: { type: Number, required: true }, // negative for releases or decreases
  party: String,
  user_id: String,
  device_id: String,
  created_at: Date,
  synced_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Transaction', transactionSchema);  