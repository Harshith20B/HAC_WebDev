// routes/authRoutes.js
const express = require('express');
const { 
  signup, 
  verifyOTP, 
  login, 
  logout, 
  getCurrentUser 
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/signup', signup);  // Signup route
router.post('/verify-otp', verifyOTP); // OTP verification route
router.post('/login', login);  // Login route
router.post('/logout', logout);  // Logout route
router.get('/me', authenticateToken, getCurrentUser); // Get current user information

module.exports = router;