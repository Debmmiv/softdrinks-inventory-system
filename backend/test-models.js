require('dns').setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');
const Inventory = require('./models/Inventory');
const Transaction = require('./models/Transaction');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await Transaction.init(); // makes sure the unique index exists

  const p = await Product.create({ name: 'Test Cola 1L', units_per_case: 24 });
  await Inventory.create({ product_id: p._id, total_bottles: 0 });

  const t = { transaction_id: 'test-uuid-1', product_id: p._id,
              type: 'DELIVERY', cases: 2, bottles: 0, total_bottles: 48 };
  await Transaction.create(t);
  console.log('First save OK');

  try {
    await Transaction.create(t);
    console.log('PROBLEM: duplicate was saved');
  } catch (e) {
    console.log('Duplicate blocked:', e.code === 11000 ? 'OK' : e.message);
  }

  // clean up the test data
  await Transaction.deleteMany({ transaction_id: 'test-uuid-1' });
  await Inventory.deleteMany({ product_id: p._id });
  await Product.deleteOne({ _id: p._id });
  await mongoose.disconnect();
  console.log('Done');
})();