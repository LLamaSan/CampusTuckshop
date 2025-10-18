const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authenticateToken = require('../middleware/authenticateToken');

// All order routes require a user to be logged in, so we apply the middleware to all.
router.use(authenticateToken);

// POST /api/orders/place-order - Place a new order
// Note: In server.js, the route will be mounted as /api/orders, so this becomes POST /api/orders
router.post('/', orderController.placeOrder);

// GET /api/orders - Get all orders for the logged-in user
// This becomes GET /api/orders
router.get('/', orderController.getUserOrders);

module.exports = router;
