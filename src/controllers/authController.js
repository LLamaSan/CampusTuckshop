// Use modern ES Module syntax for all imports
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { sendWelcomeEmail } from '../services/emailService.js';

// --- Sign Up a New User (Your logic, updated syntax) ---
export const signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        // ... (your validation logic can go here) ...
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "User with this email already exists." });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword });
        await user.save();
        
        // Send welcome email (non-blocking)
        sendWelcomeEmail(user)
            .catch(emailError => console.error('Welcome email failed (non-blocking):', emailError));
            
        res.status(201).json({ success: true, message: 'User created successfully' });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ success: false, message: 'Server error during signup' });
    }
};

// --- Login User and Create Token (Your logic with debug logging) ---
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        // ... (validation) ...
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }
        
        const payload = {
            id: user._id, // Correct key is 'id'
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

// --- Verify a Token's Validity (Your logic, updated syntax) ---
export const verifyToken = (req, res) => {
    // The authenticateToken middleware already attached user data to req.user
    res.json({
        success: true,
        user: req.user // The middleware provides the full user payload
    });
};

