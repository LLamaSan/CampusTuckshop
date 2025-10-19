import Order from '../models/Order.js';
import Product from '../models/Product.js';
const { generateOrderId } = require('../utils/helpers'); // Assuming you created this file
const { sendOrderConfirmationEmail } = require('../services/emailService');

// POST /api/place-order - Place a new order
exports.placeOrder = async (req, res) => {
    try {
        const { items, total, address } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Order items are required' });
        }
        if (!total || total <= 0) {
            return res.status(400).json({ success: false, message: 'Valid total amount is required' });
        }
        if (!address || !address.fullName || !address.phoneNumber || !address.addressLine1 || !address.city || !address.pincode || !address.state) {
            return res.status(400).json({ success: false, message: 'Complete delivery address is required' });
        }

        console.log('🛒 Processing order for user:', req.user.name);

        // Stock validation and update logic
        const stockErrors = [];
        const productsToUpdate = [];
        for (const item of items) {
            const product = await Product.findOne({ name: item.name });
            if (!product) {
                stockErrors.push(`Product "${item.name}" not found`);
                continue;
            }
            if (product.quantity < item.quantity) {
                stockErrors.push(`${item.name}: Only ${product.quantity} available, requested ${item.quantity}`);
                continue;
            }
            productsToUpdate.push({ product, requestedQuantity: item.quantity });
        }

        if (stockErrors.length > 0) {
            return res.status(400).json({ success: false, message: 'Stock unavailable: ' + stockErrors.join('; ') });
        }

        for (const { product, requestedQuantity } of productsToUpdate) {
            product.quantity -= requestedQuantity;
            await product.save();
            console.log(`📉 Stock updated: ${product.name} -> ${product.quantity}`);
        }
        
        const orderId = generateOrderId();
        const order = new Order({
            orderId,
            userId: req.user.userId,
            userEmail: req.user.email,
            userName: req.user.name,
            items,
            total,
            address,
            status: 'pending'
        });

        await order.save();
        console.log(`✅ Order created: ${orderId}`);

        sendOrderConfirmationEmail(order)
            .catch(err => console.error('📧 Email error (non-blocking):', err));

        res.json({
            success: true,
            orderId,
            message: 'Order placed successfully!'
        });

    } catch (error) {
        console.error('❌ Order placement error:', error);
        res.status(500).json({ success: false, message: 'Server error during order placement' });
    }
};

// GET /api/orders - Get orders for the authenticated user
exports.getUserOrders = async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user.userId }).sort({ createdAt: -1 });
        res.json({ success: true, orders });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching orders' });
    }
};
