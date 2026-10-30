const express = require('express');
const { getStock, getMovements, getReplenishment } = require('../controllers/reportController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(requireAuth);

router.get('/stock', getStock);
router.get('/movements', getMovements);
router.get('/replenishment', getReplenishment);

module.exports = router;
