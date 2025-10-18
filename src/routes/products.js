const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
// Note: You might want to add an admin-only middleware here for protectaed routes like add, update, delete

// GET all products
router.get('/', productController.getAllProducts);

// POST a new product (should be admin-only)
router.post('/', productController.addProduct);

// POST to bulk add new products (should be admin-only)
router.post('/bulk-add', productController.bulkAddProducts);

// PUT to update quantity (should be admin-only)
router.put('/update-quantity', productController.updateQuantity);

// PUT to update price (should be admin-only)
router.put('/update-price', productController.updatePrice);

// PUT to bulk update details (should be admin-only)
router.put('/bulk-update-details', productController.bulkUpdateDetails);

// PUT to rename a product (should be admin-only)
router.put('/rename', productController.renameProduct);

// PUT to bulk update categories (should be admin-only)
router.put('/bulk-category-update', productController.bulkCategoryUpdate);

// PUT to update categories by pattern (should be admin-only)
router.put('/category-by-pattern', productController.categoryByPattern);

// DELETE a product by name (should be admin-only)
router.delete('/:name', productController.deleteProductByName);

// DELETE all products in a category (should be admin-only)
router.delete('/category/:category', productController.deleteProductsByCategory);

module.exports = router;
