// src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Adjust path as needed
const { sendWelcomeEmail } = require('../services/emailService'); // Adjust path
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

exports.signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        // ... (your validation logic) ...
        const existingUser = await User.findOne({ email });
        // ... (check if user exists) ...
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword });
        await user.save();
        try {
            await sendWelcomeEmail(user);
        } catch (emailError) {
            console.error('Welcome email failed (non-blocking):', emailError);
        }
        res.status(201).json({ success: true, message: 'User created successfully' });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ success: false, message: 'Server error during signup' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        // ... (validation) ...
        const user = await User.findOne({ email });
        // ... (check user & password validity using bcrypt.compare) ...
        const token = jwt.sign({ userId: user._id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
        res.json({
            success: true,
            token,
            user: { id: user._id, name: user.name, email: user.email }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
};

exports.verifyToken = (req, res) => {
    // authenticateToken middleware already attached user data to req.user
    res.json({
        success: true,
        user: {
            id: req.user.userId,
            name: req.user.name,
            email: req.user.email
        }
    });
};