// src/routes/auth.js
const express = require('express');
const authController = require('../controllers/authController');
const authenticateToken = require('../middleware/authenticateToken');
const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/verify-token', authenticateToken, authController.verifyToken); // Apply middleware here

module.exports = router;