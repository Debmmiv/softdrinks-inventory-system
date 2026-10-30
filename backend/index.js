require('dns').setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDb = require('./src/config/db');
const { notFound, errorHandler } = require('./src/middleware/errorMiddleware');

require('./src/models/Product');
require('./src/models/Inventory');
require('./src/models/Transaction');
require('./src/models/User');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/products', require('./src/routes/productRoutes'));
app.use('/api/sync', require('./src/routes/syncRoutes'));
app.use('/api/reports', require('./src/routes/reportRoutes'));

app.use(notFound);
app.use(errorHandler);

connectDb();
app.listen(process.env.PORT || 3000, '0.0.0.0', () =>
  console.log('API running'));
