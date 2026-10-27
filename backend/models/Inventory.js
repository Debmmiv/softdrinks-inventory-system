const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
  total_bottles: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Inventory', inventorySchema);