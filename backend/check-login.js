require('dns').setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');

(async () => {
  const [username, password] = process.argv.slice(2);
  await mongoose.connect(process.env.MONGODB_URI);
  const all = await User.find({}, 'username role');
  console.log('Users in database:', all.map(u => `${u.username} (${u.role})`));
  const u = await User.findOne({ username });
  if (!u) console.log('No user named', username);
  else console.log('Password matches:', await bcrypt.compare(password, u.password_hash));
  await mongoose.disconnect();
})();