// Use modern ES Module syntax for all imports
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { sendWelcomeEmail } from '../services/emailService.js';

// --- Sign Up a New User (Your existing logic with updated syntax) ---
export const signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User with this email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword });
        await user.save();

        // Send welcome email (non-blocking)
        sendWelcomeEmail(user.id) // Assuming sendWelcomeEmail can fetch user by ID
            .catch(emailError => console.error('Welcome email failed (non-blocking):', emailError));

        res.status(201).json({ success: true, message: 'User created successfully' });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ success: false, message: 'Server error during signup' });
    }
};

// --- Login User and Create Token (Your logic with the crucial payload fix) ---
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // --- THE CRUCIAL FIX IS HERE ---
        // The payload MUST match what the order controller expects.
        const payload = {
            id: user._id, // Use 'id', not 'userId'
            name: user.name,
            email: user.email,
            role: user.role // Include role for admin checks
        };

        const secret = process.env.JWT_SECRET;
        if (!secret) {
             console.error('JWT_SECRET is not set!');
             return res.status(500).json({ success: false, message: 'Server configuration error' });
        }

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

// --- Verify a Token's Validity (Your logic with updated syntax) ---
export const verifyToken = (req, res) => {
    // If the middleware passed, the token is valid and req.user is attached.
    res.json({ success: true, user: req.user });
};