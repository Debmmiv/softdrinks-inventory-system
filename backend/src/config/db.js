const mongoose = require('mongoose');

async function connectDb() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB error:', err.message);
  }
}

module.exports = connectDb;
