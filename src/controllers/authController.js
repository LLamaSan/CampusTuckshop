import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { sendWelcomeEmail } from '../services/emailService.js';

export const signup = async (req, res) => {
    // ... your existing signup code ...
    // This function does not need changes.
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        // ... (your user and password checking logic) ...
        const user = await User.findOne({ email });
        if (!user) { /* ... error handling ... */ }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) { /* ... error handling ... */ }

        const payload = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        };
        
        const secret = process.env.JWT_SECRET;

        // --- TEMPORARY DEBUG LOGGING ---
        console.log('--- TOKEN SIGNING (Login) ---');
        console.log(`JWT_SECRET found for SIGNING: "${secret}"`);
        console.log(`Secret length: ${secret ? secret.length : 'NOT SET'}`);
        console.log('-----------------------------');
        // --- END DEBUG ---

        const token = jwt.sign(payload, secret, { expiresIn: '24h' });
        
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

export const verifyToken = (req, res) => {
    // ... your existing verifyToken code ...
};

