const express = require('express');
const router = express.Router();
const passwordController = require('../controllers/passwordController');

// POST /api/password/forgot - User requests a password reset link
router.post('/forgot', passwordController.forgotPassword);

// POST /api/password/verify-token - Frontend verifies the token from the URL
router.post('/verify-token', passwordController.verifyResetToken);

// POST /api/password/reset - User submits their new password
router.post('/reset', passwordController.resetPassword);

module.exports = router;
