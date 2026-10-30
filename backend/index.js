require('./models/Product');
require('./models/Inventory');
require('./models/Transaction');
require('./models/User');
require('dns').setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err.message));

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth'));

app.listen(process.env.PORT || 3000, '0.0.0.0', () =>
  console.log('API running'));