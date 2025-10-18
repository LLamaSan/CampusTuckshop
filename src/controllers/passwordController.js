const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const PasswordReset = require('../models/PasswordReset');
const { sendPasswordResetEmail } = require('../services/emailService');

// POST /api/forgot-password - Request a password reset
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        
        // Always return success to prevent email enumeration attacks
        if (!user) {
            return res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        await PasswordReset.deleteMany({ userId: user._id });

        const passwordReset = new PasswordReset({
            userId: user._id,
            resetToken: hashedToken,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
        });
        await passwordReset.save();

        await sendPasswordResetEmail(user, resetToken);

        res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
};

// POST /api/verify-reset-token - Verify the token from the password reset page
exports.verifyResetToken = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ success: false, message: 'Reset token is required' });
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const resetRecord = await PasswordReset.findOne({
            resetToken: hashedToken,
            used: false,
            expiresAt: { $gt: new Date() }
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

// POST /api/reset-password - Set the new password
exports.resetPassword = async (req, res) => {
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

        resetRecord.used = true;
        await resetRecord.save();

        console.log('Password reset successful for user:', resetRecord.userId);
        res.json({ success: true, message: 'Password reset successful.' });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};
