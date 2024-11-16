// routes/productRoutes.js
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Route to get all products
router.get('/products', productController.getProducts);

module.exports = router;
