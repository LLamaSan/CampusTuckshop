// Use modern ES Module syntax for all imports
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import PasswordReset from '../models/PasswordReset.js';
import { sendPasswordResetEmail } from '../services/emailService.js';

// POST /api/password/forgot - Request a password reset
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        
        // Always return a generic success message to prevent email enumeration attacks
        if (!user) {
            console.log(`Password reset attempt for non-existent email: ${email}`);
            return res.json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' });
        }

        // Create a secure, random token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        // Invalidate any old tokens for this user
        await PasswordReset.deleteMany({ userId: user._id });

        const passwordReset = new PasswordReset({
            userId: user._id,
            resetToken: hashedToken,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000) // Expires in 1 hour
        });
        await passwordReset.save();

        // Send the unhashed token to the user's email
        await sendPasswordResetEmail(user, resetToken);

        res.json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
};

// POST /api/password/verify-token - Verify the token from the password reset page
export const verifyResetToken = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ success: false, message: 'Reset token is required' });
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const resetRecord = await PasswordReset.findOne({
            resetToken: hashedToken,
            used: false,
            expiresAt: { $gt: new Date() } // Check that it hasn't expired
        }).populate('userId');

        if (!resetRecord || !resetRecord.userId) {
            return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
        }

        res.json({ success: true, message: 'Token is valid', email: resetRecord.userId.email });

    } catch (error) {
        console.error('Verify token error:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// POST /api/password/reset - Set the new password
export const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ success: false, message: 'Token and new password are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const resetRecord = await PasswordReset.findOne({
            resetToken: hashedToken,
            used: false,
            expiresAt: { $gt: new Date() }
        });

        if (!resetRecord) {
            return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await User.findByIdAndUpdate(resetRecord.userId, { password: hashedPassword });

        // Mark the token as used so it cannot be used again
        resetRecord.used = true;
        await resetRecord.save();

        console.log('Password reset successful for user:', resetRecord.userId);
        res.json({ success: true, message: 'Password reset successful.' });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};
