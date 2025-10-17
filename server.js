const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const brevo = require('@getbrevo/brevo');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());



const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
app.use(cors({ origin: FRONTEND_URL }));

app.get('/', (req, res) => {
  res.send('Hello from Railway!');
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

//app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => { // <-- Add '0.0.0.0' here
    console.log(`Server running on host 0.0.0.0 and port ${PORT}`);
    // Keep your other console.log if you want
});

console.log('--- Database Connection Check ---');
console.log('MONGODB_URI from environment:', process.env.MONGODB_URI); // Log the variable
console.log('Attempting to connect...');

// Your existing connection line:
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tuckshop', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// User Schema
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});


//for forgotten password
const passwordResetSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    resetToken: {
        type: String,
        required: true,
        unique: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    used: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema);


const User = mongoose.model('User', userSchema);

// Product Schema - MOVED TO TOP
const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    price: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    imageUrl: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['Snacks', 'Stationery', 'Drinks'],
        default: 'Snacks'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Product = mongoose.model('Product', productSchema);

// Order Schema
const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userEmail: {
        type: String,
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    items: [{
        name: String,
        price: Number,
        quantity: Number
    }],
    total: {
        type: Number,
        required: true
    },
    address: {
    fullName: String,
    phoneNumber: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    pincode: String,
    state: String
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'delivered', 'cancelled'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
});

const Order = mongoose.model('Order', orderSchema);

console.log('Checking Brevo configuration...');
console.log('BREVO_API_KEY exists:', !!process.env.BREVO_API_KEY);
console.log('BREVO_FROM_EMAIL:', process.env.BREVO_FROM_EMAIL);

if (!process.env.BREVO_API_KEY) {
    console.error('⚠️  BREVO_API_KEY is not set in environment variables');
}

if (!process.env.BREVO_FROM_EMAIL) {
    console.error('⚠️  BREVO_FROM_EMAIL is not set in environment variables');
}


let apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// Generate Order ID
function generateOrderId() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 5);
    return `TSH${timestamp.slice(-6)}${random.toUpperCase()}`;
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Routes

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// STEP 6: Update Test Email Endpoint
// ============================================

app.post('/api/test-email', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email is required' 
            });
        }

        console.log('Sending test email to:', email);
        console.log('From email:', process.env.BREVO_FROM_EMAIL);
        
        const response = await sendBrevoEmail(
            email,
            'Test Email from Campus Tuckshop',
            '<p>This is a test email to verify Brevo configuration.</p>',
            'This is a test email to verify Brevo configuration.'
        );

        res.json({ 
            success: true, 
            message: 'Test email sent successfully',
            messageId: response.messageId
        });

    } catch (error) {
        console.error('Brevo test error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send test email',
            error: error.message
        });
    }
});

// User signup
app.post('/api/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password must be at least 6 characters long' 
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'User already exists with this email' 
            });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create new user
        const user = new User({
            name,
            email,
            password: hashedPassword
        });

        await user.save();

        // Send welcome email with better error handling
        try {
            await sendWelcomeEmail(user);
            console.log('Welcome email sent successfully');
        } catch (emailError) {
            console.error('Welcome email failed:', emailError);
            // Continue with signup even if email fails
        }

        res.status(201).json({ 
            success: true, 
            message: 'User created successfully' 
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during signup' 
        });
    }
});

// User login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password are required' 
            });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid email or password' 
            });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid email or password' 
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user._id, 
                email: user.email, 
                name: user.name 
            }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );

        res.json({ 
            success: true, 
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during login' 
        });
    }
});


// Add this to server.js
app.put('/api/products/update-quantity', async (req, res) => {
    try {
        const { name, quantity } = req.body;

        if (!name || quantity == null) {
            return res.status(400).json({ success: false, message: 'Name and quantity are required' });
        }

        const product = await Product.findOneAndUpdate(
            { name },
            { quantity },
            { new: true }
        );

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        res.json({ success: true, message: 'Quantity updated', product });

    } catch (error) {
        console.error('Update quantity error:', error);
        res.status(500).json({ success: false, message: 'Server error during quantity update' });
    }
});

// Update product price by name
app.put('/api/products/update-price', async (req, res) => {
    try {
        const { name, price } = req.body;

        if (!name || price == null) {
            return res.status(400).json({ success: false, message: 'Name and price are required' });
        }

        const product = await Product.findOneAndUpdate(
            { name },
            { price },
            { new: true }
        );

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        res.json({ success: true, message: 'Price updated', product });

    } catch (error) {
        console.error('Update price error:', error);
        res.status(500).json({ success: false, message: 'Server error during price update' });
    }
});

// Bulk update product quantity and price with optional category match
app.put('/api/products/bulk-update-details', async (req, res) => {
    try {
        const { updates } = req.body;

        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({ success: false, message: 'Updates array is required' });
        }

        const results = [];
        const errors = [];

        for (const { name, category, quantity, price } of updates) {
            if (!name) {
                errors.push('Missing name in update');
                continue;
            }

            const query = { name };
            if (category) query.category = category;

            const updateFields = {};
            if (quantity != null) updateFields.quantity = quantity;
            if (price != null) updateFields.price = price;

            if (Object.keys(updateFields).length === 0) {
                errors.push(`No valid fields to update for product: ${name}`);
                continue;
            }

            const updated = await Product.findOneAndUpdate(query, updateFields, { new: true });

            if (!updated) {
                errors.push(`Product not found: ${name} ${category ? `(Category: ${category})` : ''}`);
            } else {
                results.push({ name, updated });
                console.log(`🔄 Updated ${name}:`, updateFields);
            }
        }

        res.json({
            success: errors.length === 0,
            updatedCount: results.length,
            errors,
            results
        });

    } catch (error) {
        console.error('Bulk update error:', error);
        res.status(500).json({ success: false, message: 'Server error during bulk update' });
    }
});

// Bulk add products
app.post('/api/products/bulk-add', async (req, res) => {
    try {
        const { products } = req.body;

        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ success: false, message: 'Products array is required' });
        }

        const created = [];
        const errors = [];

        for (const productData of products) {
            const { name, price, quantity, imageUrl, category } = productData;

            if (!name || price == null || quantity == null || !imageUrl) {
                errors.push({ product: name || '(unknown)', message: 'Missing required fields' });
                continue;
            }

            try {
                const newProduct = new Product({
                    name,
                    price,
                    quantity,
                    imageUrl,
                    category: category || 'Snacks'
                });

                await newProduct.save();
                created.push(newProduct);
                console.log(`✅ Bulk added: ${name}`);
            } catch (err) {
                errors.push({ product: name, message: err.message });
            }
        }

        res.status(201).json({
            success: errors.length === 0,
            createdCount: created.length,
            errors,
            created
        });

    } catch (error) {
        console.error('Bulk add error:', error);
        res.status(500).json({ success: false, message: 'Server error during bulk add' });
    }
});

// Rename a product by name
app.put('/api/products/rename', async (req, res) => {
    try {
        const { oldName, newName } = req.body;

        if (!oldName || !newName) {
            return res.status(400).json({ success: false, message: 'oldName and newName are required' });
        }

        const existing = await Product.findOne({ name: newName });
        if (existing) {
            return res.status(400).json({ success: false, message: 'A product with the new name already exists' });
        }

        const updated = await Product.findOneAndUpdate(
            { name: oldName },
            { name: newName },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Product with old name not found' });
        }

        res.json({ success: true, message: `Renamed ${oldName} to ${newName}`, product: updated });

    } catch (error) {
        console.error('Rename error:', error);
        res.status(500).json({ success: false, message: 'Server error during rename' });
    }
});

// Add this endpoint to your server.js file, after the existing product routes

// Bulk update product categories
app.put('/api/products/bulk-category-update', async (req, res) => {
    try {
        const { updates } = req.body;
        
        // Validate input
        if (!updates || !Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Updates array is required with at least one item'
            });
        }

        const validCategories = ['Snacks', 'Stationery', 'Drinks'];
        const results = [];
        const errors = [];

        // Process each update
        for (const update of updates) {
            try {
                const { name, category } = update;
                
                if (!name || !category) {
                    errors.push(`Missing name or category for update: ${JSON.stringify(update)}`);
                    continue;
                }

                if (!validCategories.includes(category)) {
                    errors.push(`Invalid category "${category}" for product "${name}". Must be one of: ${validCategories.join(', ')}`);
                    continue;
                }

                const product = await Product.findOneAndUpdate(
                    { name },
                    { category },
                    { new: true }
                );

                if (!product) {
                    errors.push(`Product not found: ${name}`);
                    continue;
                }

                results.push({
                    name: product.name,
                    oldCategory: 'Snacks', // assuming they were all in Snacks
                    newCategory: product.category,
                    success: true
                });

                console.log(`📂 Category updated: ${name} → ${category}`);

            } catch (updateError) {
                errors.push(`Error updating ${update.name}: ${updateError.message}`);
            }
        }

        // Return results
        res.json({
            success: errors.length === 0,
            message: `Updated ${results.length} products${errors.length > 0 ? `, ${errors.length} errors` : ''}`,
            results,
            errors: errors.length > 0 ? errors : undefined,
            summary: {
                totalRequested: updates.length,
                successful: results.length,
                failed: errors.length
            }
        });

    } catch (error) {
        console.error('Bulk category update error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during bulk category update'
        });
    }
});

// Update categories by pattern matching
app.put('/api/products/category-by-pattern', async (req, res) => {
    try {
        const { pattern, newCategory, matchType = 'contains' } = req.body;
        
        if (!pattern || !newCategory) {
            return res.status(400).json({
                success: false,
                message: 'Pattern and newCategory are required'
            });
        }

        const validCategories = ['Snacks', 'Stationery', 'Drinks'];
        if (!validCategories.includes(newCategory)) {
            return res.status(400).json({
                success: false,
                message: `Invalid category. Must be one of: ${validCategories.join(', ')}`
            });
        }

        let query;
        switch (matchType) {
            case 'contains':
                query = { name: { $regex: pattern, $options: 'i' } };
                break;
            case 'startsWith':
                query = { name: { $regex: `^${pattern}`, $options: 'i' } };
                break;
            case 'endsWith':
                query = { name: { $regex: `${pattern}$`, $options: 'i' } };
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid matchType. Use: contains, startsWith, or endsWith'
                });
        }

        const result = await Product.updateMany(
            query,
            { category: newCategory }
        );

        console.log(`📂 Bulk category update: ${result.modifiedCount} products updated to ${newCategory}`);

        res.json({
            success: true,
            message: `Updated ${result.modifiedCount} products to ${newCategory} category`,
            modifiedCount: result.modifiedCount,
            matchedCount: result.matchedCount
        });

    } catch (error) {
        console.error('Pattern-based category update error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during pattern-based category update'
        });
    }
});

// Verify token
app.post('/api/verify-token', authenticateToken, (req, res) => {
    res.json({ 
        success: true, 
        user: {
            id: req.user.userId,
            name: req.user.name,
            email: req.user.email
        }
    });
});

// Get all products
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ category: 1, name: 1 });
        res.json({ success: true, products });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ success: false, message: 'Error fetching products' });
    }
});

// Add new product
app.post('/api/products', async (req, res) => {
    try {
        const { name, price, quantity, imageUrl, category } = req.body;
        
        if (!name || !price || quantity == null || !imageUrl) {
            return res.status(400).json({ 
                success: false, 
                message: 'All product fields are required (name, price, quantity, imageUrl)' 
            });
        }

        const product = new Product({ 
            name, 
            price, 
            quantity, 
            imageUrl, 
            category: category || 'Snacks' 
        });
        
        await product.save();
        console.log(`✅ Product added: ${name} - Quantity: ${quantity}`);
        
        res.status(201).json({ 
            success: true, 
            message: 'Product added successfully',
            product 
        });
    } catch (error) {
        console.error('Error adding product:', error);
        if (error.code === 11000) {
            res.status(400).json({ success: false, message: 'Product name already exists' });
        } else {
            res.status(500).json({ success: false, message: 'Error adding product' });
        }
    }
});

// Delete a product by name
app.delete('/api/products/:name', async (req, res) => {
    try {
        const name = decodeURIComponent(req.params.name);
        const deleted = await Product.findOneAndDelete({ name });
        
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        
        console.log(`🗑️ Product deleted: ${name}`);
        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ success: false, message: 'Error deleting product' });
    }
});

// Delete all products in a category
app.delete('/api/products/category/:category', async (req, res) => {
    try {
        const category = req.params.category;
        
        // Validate category
        const validCategories = ['Snacks', 'Stationery', 'Drinks'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid category' 
            });
        }
        
        const result = await Product.deleteMany({ category });
        
        console.log(`🗑️ Deleted ${result.deletedCount} products from category: ${category}`);
        
        res.json({ 
            success: true, 
            message: `Deleted ${result.deletedCount} products from ${category} category`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error deleting category' 
        });
    }
});


app.post('/api/place-order', authenticateToken, async (req, res) => {
    try {
        const { items, total, address } = req.body;

        // Validate order items
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Order items are required'
            });
        }

        if (!total || total <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid total amount is required'
            });
        }

        // Validate address
        if (!address || !address.fullName || !address.phoneNumber || !address.addressLine1 || !address.city || !address.pincode || !address.state) {
            return res.status(400).json({
                success: false,
                message: 'Complete delivery address is required'
            });
        }

        console.log('🛒 Processing order for user:', req.user.name);
        console.log('📦 Items:', items);

        // Step 1: Validate stock
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

            productsToUpdate.push({
                product,
                requestedQuantity: item.quantity
            });
        }

        if (stockErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Stock unavailable: ' + stockErrors.join('; ')
            });
        }

        // Step 2: Deduct stock
        for (const { product, requestedQuantity } of productsToUpdate) {
            const newQuantity = product.quantity - requestedQuantity;
            await Product.findByIdAndUpdate(product._id, { quantity: newQuantity });
            console.log(`📉 Stock updated: ${product.name} (${product.quantity} → ${newQuantity})`);
        }

        // Step 3: Create order with address
        const orderId = generateOrderId();
        const order = new Order({
            orderId,
            userId: req.user.userId,
            userEmail: req.user.email,
            userName: req.user.name,
            items,
            total,
            address, // <-- new field added
            status: 'pending'
        });

        await order.save();
        console.log(`✅ Order created: ${orderId}`);

        // Step 4: Send confirmation email (non-blocking)
        sendOrderConfirmationEmail(order)
            .then(() => console.log('📧 Order confirmation email sent'))
            .catch(err => console.error('📧 Email error (non-blocking):', err));

        // Step 5: Return response
        res.json({
            success: true,
            orderId,
            message: 'Order placed successfully! Stock has been updated.'
        });

    } catch (error) {
        console.error('❌ Order placement error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during order placement'
        });
    }
});


// Get user orders
app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user.userId })
            .sort({ createdAt: -1 });

        res.json({ 
            success: true, 
            orders 
        });

    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error while fetching orders' 
        });
    }
});

// Send welcome email using brevo
async function sendWelcomeEmail(user) {
    try {
        console.log('Attempting to send welcome email to:', user.email);
        
        if (!process.env.BREVO_API_KEY) {
            throw new Error('Brevo API key not configured');
        }

        if (!process.env.BREVO_FROM_EMAIL) {
            throw new Error('Brevo from email not configured');
        }

        const textContent = `
Dear ${user.name},

Welcome to Campus Tuckshop!

Thank you for joining our community. You can now browse our wide selection of snacks, stationery, and drinks, and place orders for quick pickup.

What's available:
• Fresh snacks and treats
• Essential stationery items
• Refreshing beverages
• Quick and easy ordering

Start shopping now and enjoy the convenience of our campus tuckshop!

Best regards,
Campus Tuckshop Team
        `;

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(45deg, #667eea, #764ba2); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .welcome-box { background: white; padding: 25px; border-radius: 10px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .features { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
        .feature-item { padding: 10px 0; border-bottom: 1px solid #eee; }
        .feature-item:last-child { border-bottom: none; }
        .footer { text-align: center; margin-top: 30px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🍪 Campus Tuckshop</h1>
            <h2>Welcome Aboard!</h2>
        </div>
        <div class="content">
            <div class="welcome-box">
                <h3>Hi ${user.name}! 👋</h3>
                <p>Welcome to Campus Tuckshop! We're excited to have you join our community.</p>
                <p>You can now browse our wide selection of snacks, stationery, and drinks, and place orders for quick pickup.</p>
            </div>
            
            <div class="features">
                <h4>What's Available:</h4>
                <div class="feature-item">🍿 Fresh snacks and treats</div>
                <div class="feature-item">📚 Essential stationery items</div>
                <div class="feature-item">🥤 Refreshing beverages</div>
                <div class="feature-item">⚡ Quick and easy ordering</div>
            </div>
            
            <div class="footer">
                <p>Start shopping now and enjoy the convenience of our campus tuckshop!</p>
                <p><strong>Campus Tuckshop Team</strong></p>
            </div>
        </div>
    </div>
</body>
</html>
        `;

        // Use either SDK or Fetch method:
        // Option A: Using SDK
        const response = await sendBrevoEmail(
            user.email,
            'Welcome to Campus Tuckshop! 🍪',
            htmlContent,
            textContent
        );

        // Option B: Using Fetch (uncomment to use)
        // const response = await sendBrevoEmailWithFetch(
        //     user.email,
        //     'Welcome to Campus Tuckshop! 🍪',
        //     htmlContent,
        //     textContent
        // );

        console.log('Welcome email sent successfully');
        return response;

    } catch (error) {
        console.error('Error sending welcome email:', error);
        
        if (error.response) {
            console.error('Brevo error response:', error.response);
        }
        
        throw error;
    }
}

// STEP 3A: Brevo Email Function (Using SDK)
async function sendBrevoEmail(to, subject, htmlContent, textContent) {
    try {
        const sendSmtpEmail = new brevo.SendSmtpEmail();
        
        sendSmtpEmail.sender = {
            email: process.env.BREVO_FROM_EMAIL,
            name: process.env.BREVO_FROM_NAME || 'Campus Tuckshop'
        };
        
        sendSmtpEmail.to = [{ email: to }];
        sendSmtpEmail.subject = subject;
        sendSmtpEmail.htmlContent = htmlContent;
        sendSmtpEmail.textContent = textContent;

        const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('Brevo email sent successfully:', response.messageId);
        return response;

    } catch (error) {
        console.error('Brevo email error:', error);
        throw error;
    }
}
// STEP 3B: Brevo Email Function (Using Fetch - More Secure)
async function sendBrevoEmailWithFetch(to, subject, htmlContent, textContent) {
    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': process.env.BREVO_API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: {
                    email: process.env.BREVO_FROM_EMAIL,
                    name: process.env.BREVO_FROM_NAME || 'Campus Tuckshop'
                },
                to: [{ email: to }],
                subject: subject,
                htmlContent: htmlContent,
                textContent: textContent
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Brevo API error: ${JSON.stringify(error)}`);
        }

        const data = await response.json();
        console.log('Brevo email sent successfully:', data.messageId);
        return data;

    } catch (error) {
        console.error('Brevo email error:', error);
        throw error;
    }
}

// STEP 5: Update Order Confirmation Email Function
// ============================================

async function sendOrderConfirmationEmail(order) {
    try {
        console.log('Attempting to send order confirmation email to:', order.userEmail);
        
        if (!process.env.BREVO_API_KEY) {
            throw new Error('Brevo API key not configured');
        }

        if (!process.env.BREVO_FROM_EMAIL) {
            throw new Error('Brevo from email not configured');
        }

        const itemsList = order.items.map(item => 
            `${item.name} x ${item.quantity} - ₹${item.price * item.quantity}`
        ).join('\n');

        const deliveryAddress = `
${order.address.fullName}
${order.address.phoneNumber}
${order.address.addressLine1}
${order.address.addressLine2 ? order.address.addressLine2 + '\n' : ''}${order.address.city}, ${order.address.state} - ${order.address.pincode}`;

        const textContent = `
Dear ${order.userName},

Thank you for your order at Campus Tuckshop!

Order Details:
Order ID: ${order.orderId}
Date: ${new Date(order.createdAt).toLocaleDateString()}

Items Ordered:
${itemsList}

Total Amount: ₹${order.total}

Delivery Address:
${deliveryAddress}

Your order has been received and is being processed. You will receive another email when your order is ready for pickup/delivery.

Thank you for choosing Campus Tuckshop!

Best regards,
Campus Tuckshop Team
        `;

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(45deg, #667eea, #764ba2); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .order-details { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .address-section { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .address-box { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #764ba2; }
        .item { padding: 10px 0; border-bottom: 1px solid #eee; }
        .total { font-size: 1.2em; font-weight: bold; color: #764ba2; margin-top: 20px; padding-top: 20px; border-top: 2px solid #764ba2; }
        .status-badge { background: #28a745; color: white; padding: 5px 15px; border-radius: 15px; font-size: 0.9em; }
        .footer { text-align: center; margin-top: 30px; color: #666; }
        .address-label { font-weight: bold; color: #764ba2; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🍪 Campus Tuckshop</h1>
            <h2>Order Confirmation</h2>
        </div>
        <div class="content">
            <p>Dear ${order.userName},</p>
            <p>Thank you for your order at Campus Tuckshop!</p>
            
            <div class="order-details">
                <h3>📋 Order Details:</h3>
                <p><strong>Order ID:</strong> ${order.orderId}</p>
                <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
                <p><strong>Status:</strong> <span class="status-badge">Processing</span></p>
                
                <h4>Items Ordered:</h4>
                ${order.items.map(item => `
                    <div class="item">
                        <strong>${item.name}</strong> x ${item.quantity} - ₹${item.price * item.quantity}
                    </div>
                `).join('')}
                
                <div class="total">
                    Total Amount: ₹${order.total}
                </div>
            </div>
            
            <div class="address-section">
                <div class="address-label">📍 Delivery Address:</div>
                <div class="address-box">
                    <strong>${order.address.fullName}</strong><br>
                    📱 ${order.address.phoneNumber}<br>
                    ${order.address.addressLine1}<br>
                    ${order.address.addressLine2 ? order.address.addressLine2 + '<br>' : ''}
                    ${order.address.city}, ${order.address.state} - ${order.address.pincode}
                </div>
            </div>
            
            <p>Your order has been received and is being processed. You will receive another email when your order is ready for pickup/delivery.</p>
            
            <div class="footer">
                <p>Thank you for choosing Campus Tuckshop!</p>
                <p><strong>Campus Tuckshop Team</strong></p>
            </div>
        </div>
    </div>
</body>
</html>
        `;

        // Use either SDK or Fetch method:
        const response = await sendBrevoEmail(
            order.userEmail,
            `Order Confirmation - ${order.orderId}`,
            htmlContent,
            textContent
        );

        console.log('Order confirmation email sent successfully');
        return response;

    } catch (error) {
        console.error('Error sending order confirmation email:', error);
        
        if (error.response) {
            console.error('Brevo error response:', error.response);
        }
        
        throw error;
    }
}


// 2-10-2025 reset password integration
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Find user
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        
        // For security, always return success even if user doesn't exist
        // This prevents email enumeration attacks
        if (!user) {
            return res.json({
                success: true,
                message: 'If an account exists with this email, a password reset link has been sent.'
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        // Delete any existing reset tokens for this user
        await PasswordReset.deleteMany({ userId: user._id });

        // Create new reset token (expires in 1 hour)
        const passwordReset = new PasswordReset({
            userId: user._id,
            resetToken: hashedToken,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
        });

        await passwordReset.save();

        // Send password reset email
        await sendPasswordResetEmail(user, resetToken);

        res.json({
            success: true,
            message: 'If an account exists with this email, a password reset link has been sent.'
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again later.'
        });
    }
});

// Forgot password - request reset link
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: 'User not found' });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour

        await PasswordReset.create({
            userId: user._id,
            resetToken,
            expiresAt
        });

        // Build reset link
        const resetLink = `${req.protocol}://${req.get('host')}/reset-password.html?token=${resetToken}`;

        // 🔥 DEBUG MODE: Log the reset link in server console
        console.log(`🔑 Password reset link for ${email}: ${resetLink}`);

        // Send email (can keep or comment out if you only want logs)
        await sendBrevoEmail(
            user.email,
            'Password Reset - Campus Tuckshop',
            `<p>Click below to reset your password:</p><p><a href="${resetLink}">${resetLink}</a></p>`,
            `Reset your password using this link: ${resetLink}`
        );

        res.json({ success: true, message: 'Password reset link sent' });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});


// ============================================
// VERIFY RESET TOKEN ENDPOINT
// ============================================
app.post('/api/verify-reset-token', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Reset token is required'
            });
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const resetRecord = await PasswordReset.findOne({
            resetToken: hashedToken,
            used: false,
            expiresAt: { $gt: new Date() }
        }).populate('userId');

        if (!resetRecord) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        res.json({
            success: true,
            message: 'Token is valid',
            email: resetRecord.userId.email
        });

    } catch (error) {
        console.error('Verify token error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.'
        });
    }
});

// ============================================
// RESET PASSWORD ENDPOINT
// ============================================
app.post('/api/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Token and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const resetRecord = await PasswordReset.findOne({
            resetToken: hashedToken,
            used: false,
            expiresAt: { $gt: new Date() }
        });

        if (!resetRecord) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user password
        await User.findByIdAndUpdate(resetRecord.userId, {
            password: hashedPassword
        });

        // Mark token as used
        resetRecord.used = true;
        await resetRecord.save();

        console.log('Password reset successful for user:', resetRecord.userId);

        res.json({
            success: true,
            message: 'Password reset successful. You can now login with your new password.'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.'
        });
    }
});

// ============================================
// PASSWORD RESET EMAIL FUNCTION (BREVO)
// ============================================
async function sendPasswordResetEmail(user, resetToken) {
    try {
        console.log('Sending password reset email to:', user.email);

        if (!process.env.BREVO_API_KEY || !process.env.BREVO_FROM_EMAIL) {
            throw new Error('Email configuration missing');
        }

// Railway provides this variable. We add "https://" to it.
const appUrl = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` || 'http://localhost:3001';
const resetLink = `${appUrl}/reset-password.html?token=${resetToken}`;

        const textContent = `
Dear ${user.name},

We received a request to reset your password for your Campus Tuckshop account.

To reset your password, click the link below:
${resetLink}

This link will expire in 1 hour.

If you didn't request a password reset, please ignore this email or contact support if you have concerns.

Best regards,
Campus Tuckshop Team
        `;

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(45deg, #667eea, #764ba2); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .reset-box { background: white; padding: 25px; border-radius: 10px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .reset-button { display: inline-block; background: linear-gradient(45deg, #667eea, #764ba2); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Reset Request</h1>
        </div>
        <div class="content">
            <div class="reset-box">
                <h3>Hi ${user.name},</h3>
                <p>We received a request to reset your password for your Campus Tuckshop account.</p>
                <p>Click the button below to reset your password:</p>
                <div style="text-align: center;">
                    <a href="${resetLink}" class="reset-button">Reset Password</a>
                </div>
                <p style="margin-top: 20px;">Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #667eea;">${resetLink}</p>
            </div>
            
            <div class="warning">
                <strong>Important:</strong> This link will expire in 1 hour for security reasons.
            </div>
            
            <p>If you didn't request a password reset, please ignore this email or contact our support team if you have concerns about your account security.</p>
            
            <div class="footer">
                <p><strong>Campus Tuckshop Team</strong></p>
                <p>This is an automated email. Please do not reply.</p>
            </div>
        </div>
    </div>
</body>
</html>
        `;

        // Use Brevo to send email (using fetch method for security)
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': process.env.BREVO_API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: {
                    email: process.env.BREVO_FROM_EMAIL,
                    name: process.env.BREVO_FROM_NAME || 'Campus Tuckshop'
                },
                to: [{ email: user.email }],
                subject: 'Reset Your Password - Campus Tuckshop',
                htmlContent: htmlContent,
                textContent: textContent
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Brevo API error: ${JSON.stringify(error)}`);
        }

        const data = await response.json();
        console.log('Password reset email sent successfully:', data.messageId);
        return data;

    } catch (error) {
        console.error('Error sending password reset email:', error);
        throw error;
    }
}

// ============================================
// CLEANUP EXPIRED TOKENS (run periodically)
// ============================================
// Run this every hour to clean up expired tokens
setInterval(async () => {
    try {
        const result = await PasswordReset.deleteMany({
            expiresAt: { $lt: new Date() }
        });
        if (result.deletedCount > 0) {
            console.log(`Cleaned up ${result.deletedCount} expired reset tokens`);
        }
    } catch (error) {
        console.error('Error cleaning up expired tokens:', error);
    }
}, 60 * 60 * 1000); // Every hour

// Database connection event handlers
mongoose.connection.on('connected', () => {
    console.log('Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('Disconnected from MongoDB');
});

// Start server


// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await mongoose.connection.close();
    process.exit(0);
});