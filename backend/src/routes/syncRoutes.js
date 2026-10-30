const express = require('express');
const { syncTransactions } = require('../controllers/syncController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', requireAuth, syncTransactions);

module.exports = router;
