// Use modern ES Module syntax for all imports
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { sendOrderConfirmationEmail } from '../services/emailService.js';
// 1. Import the new helper function
import { generateOrderId } from '../utils/helpers.js';

// --- Place a new order ---
export const placeOrder = async (req, res) => {
    try {
        const { items, address } = req.body;

        // 2. Get all required user details from the authentication token
        if (!req.user || !req.user.id || !req.user.name || !req.user.email) {
            return res.status(401).json({ success: false, message: 'Authentication error: User details not found in token.' });
        }
        const { id: userId, name: userName, email: userEmail } = req.user;

        // --- Your existing validation (this is great!) ---
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Order items are required' });
        }
        if (!address || !address.fullName || !address.phoneNumber || !address.addressLine1 || !address.city || !address.pincode || !address.state) {
            return res.status(400).json({ success: false, message: 'Complete delivery address is required' });
        }

        console.log('🛒 Processing order for user:', userName);

        // --- Your existing Stock & Price Verification logic ---
        let total = 0;
        const stockErrors = [];
        const updatedOrderItems = [];
        for (const item of items) {
            const product = await Product.findById(item.productId); // Using findById which is more direct
            if (!product) {
                stockErrors.push(`Product "${item.name}" not found`);
                continue;
            }
            if (product.quantity < item.quantity) {
                stockErrors.push(`${product.name}: Only ${product.quantity} left`);
                continue;
            }
            total += product.price * item.quantity;
            updatedOrderItems.push({ ...item, price: product.price });
        }
        if (stockErrors.length > 0) {
            return res.status(400).json({ success: false, message: 'Stock unavailable: ' + stockErrors.join('; ') });
        }

        // 3. Create the order object with ALL required fields
        const orderId = generateOrderId(); // Generate the unique ID
        const newOrder = await Order.create({
            orderId,      // <-- Field Added
            userId,       // <-- Field Added
            userEmail,    // <-- Field Added
            userName,     // <-- Field Added
            items: updatedOrderItems,
            total,
            address,
            status: 'pending'
        });

        // --- Your existing Stock Update logic ---
        for (const item of updatedOrderItems) {
            await Product.updateOne({ _id: item.productId }, { $inc: { quantity: -item.quantity } });
        }
        console.log(`✅ Order created: ${orderId}`);

        // --- Your existing Email logic ---
        sendOrderConfirmationEmail(userId, newOrder)
            .catch(err => console.error('📧 Email error (non-blocking):', err));

        res.status(201).json({
            success: true,
            orderId: newOrder.orderId,
            message: 'Order placed successfully!'
        });

    } catch (error) {
        console.error('❌ Order placement error:', error);
        res.status(500).json({ success: false, message: 'Server error during order placement' });
    }
};

// --- Get orders for the authenticated user ---
// Renamed the function for consistency, but kept your logic.
export const getAllOrders = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, message: 'Authentication error' });
        }
        const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching orders' });
    }
};

