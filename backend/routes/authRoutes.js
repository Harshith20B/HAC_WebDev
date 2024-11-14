const express = require('express');
const { signup, verifyOTP, login, logout } = require('../controllers/authController');

const router = express.Router();

router.post('/signup', signup);  // Signup route
router.post('/verify-otp', verifyOTP); // OTP verification route
router.post('/login', login);  // Login route
router.post('/logout', logout);  // Logout route

module.exports = router;
