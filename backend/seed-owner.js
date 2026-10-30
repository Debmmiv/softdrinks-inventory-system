require('dns').setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');

(async () => {
  const [username, password] = process.argv.slice(2);
  if (!username || !password) {
    console.log('Usage: node seed-owner.js <username> <password>');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  if (await User.findOne({ username })) {
    console.log('That username already exists');
  } else {
    await User.create({
      username,
      password_hash: await bcrypt.hash(password, 10),
      role: 'owner',
    });
    console.log('Owner created:', username);
  }
  await mongoose.disconnect();
})();