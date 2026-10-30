const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  role: { type: String, enum: ['staff', 'owner'], default: 'staff' },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);