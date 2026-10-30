const express = require('express');
const { listProducts, createProduct, updateProduct } = require('../controllers/productController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(requireAuth);

router.get('/', listProducts);
router.post('/', requireRole('owner'), createProduct);
router.put('/:id', requireRole('owner'), updateProduct);

module.exports = router;
