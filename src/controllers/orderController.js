// Use modern ES Module syntax for all imports
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { sendOrderConfirmationEmail } from '../services/emailService.js';
// We'll assume a simple helper for now, but you can create this file if needed
// import { generateOrderId } from '../utils/helpers.js';

// --- Place a new order (combining your logic with correct syntax) ---
export const placeOrder = async (req, res) => {
    try {
        // 1. Get data from the request and the authenticated user
        const { items, address } = req.body;
        const userId = req.user.id; // Get user ID from the token middleware

        // 2. Validate incoming data (from your code)
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Order items are required' });
        }
        if (!address || !address.fullName || !address.phoneNumber || !address.addressLine1 || !address.city || !address.pincode || !address.state) {
            return res.status(400).json({ success: false, message: 'Complete delivery address is required' });
        }

        console.log('🛒 Processing order for user ID:', userId);

        // 3. Securely calculate total and check stock (your excellent logic)
        let total = 0;
        const stockErrors = [];
        const updatedOrderItems = [];

        for (const item of items) {
            const product = await Product.findById(item.productId); // Use findById for consistency
            if (!product) {
                stockErrors.push(`Product "${item.name}" not found`);
                continue;
            }
            if (product.quantity < item.quantity) {
                stockErrors.push(`${product.name}: Only ${product.quantity} available, you requested ${item.quantity}`);
                continue;
            }
            // Use the database price for security
            total += product.price * item.quantity;
            updatedOrderItems.push({ ...item, price: product.price }); // Use the real price
        }

        if (stockErrors.length > 0) {
            return res.status(400).json({ success: false, message: 'Stock unavailable: ' + stockErrors.join('; ') });
        }
        
        // 4. Create the new order with verified data
        const newOrder = await Order.create({
            user: userId,
            items: updatedOrderItems,
            total,
            address,
            status: 'pending' // Default status
        });

        console.log(`✅ Order created: ${newOrder._id}`);

        // 5. Update stock quantities after the order is successfully created
        for (const item of updatedOrderItems) {
            await Product.updateOne(
                { _id: item.productId },
                { $inc: { quantity: -item.quantity } } // Atomically decrease quantity
            );
            console.log(`📉 Stock updated for product ID: ${item.productId}`);
        }

        // 6. Send the confirmation email (non-blocking)
        sendOrderConfirmationEmail(userId, newOrder);

        // 7. Send success response to the user
        res.status(201).json({
            success: true,
            orderId: newOrder._id,
            message: 'Order placed successfully!'
        });

    } catch (error) {
        console.error('❌ Order placement error:', error);
        res.status(500).json({ success: false, message: 'Server error during order placement' });
    }
};

// --- Get orders for the authenticated user ---
// Renamed for consistency with our previous controllers
export const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching orders' });
    }
};

