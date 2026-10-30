const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function login(req, res) {
  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });

  const user = await User.findOne({ username });
  const ok = user && await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid username or password' });

  const token = jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({ token, user: { id: user._id, username: user.username, role: user.role } });
}

function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { login, me };
