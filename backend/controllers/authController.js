// controllers/authController.js
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../middleware/authMiddleware');
require('dotenv').config();

// Transporter configuration for sending email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

global.tempUsers = {};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const signup = async (req, res) => {
  const { name, email, password } = req.body;
  // Check if user already exists

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiration = Date.now() + 15 * 60 * 1000;

    // Store raw password in temp storage - it will be hashed during user creation
    global.tempUsers[email] = { 
      name, 
      email, 
      password, // Store raw password
      otp, 
      otpExpiration 
    };

    // Send OTP email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Account Verification OTP',
      html: `
        <h3>Your OTP for account verification is:</h3>
        <h2>${otp}</h2>
        <p>This OTP will expire in 15 minutes.</p>
      `
    });

    res.status(200).json({ message: 'OTP sent. Please verify your email.' });

  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const tempUser = global.tempUsers[email];

    if (!tempUser) {
      return res.status(400).json({ message: 'User not found' });
    }

    if (tempUser.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (Date.now() > tempUser.otpExpiration) {
      delete global.tempUsers[email];
      return res.status(400).json({ message: 'OTP has expired' });
    }

    // Create new user - password will be hashed by the pre-save middleware
    const newUser = new User({
      name: tempUser.name,
      email: tempUser.email,
      password: tempUser.password, // Raw password - will be hashed by pre-save middleware
      isVerified: true
    });

    await newUser.save();
    
    // Clean up temp storage
    delete global.tempUsers[email];

    res.status(200).json({ message: 'Account successfully verified. You can now log in.' });

  } catch (error) {
    console.error('Error during OTP verification:', error);
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !user.isVerified) {
      return res.status(400).json({ message: user ? 'Verify email before logging in' : 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create user data for response
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      isVerified: user.isVerified
    };

    // Generate JWT token
    const token = generateToken(user._id);
    
    // Send response with token and user data
    res.status(200).json({
      message: 'Login successful',
      user: userData,
      token: token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

const logout = (req, res) => {
  // With JWT, we don't need server-side logout logic
  // The client should discard the token
  res.status(200).json({ message: 'Logout successful' });
};

// Get current logged-in user info
const getCurrentUser = async (req, res) => {
  try {
    // Get user ID from the authenticated request (set by middleware)
    const userId = req.user.id;
    
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

module.exports = { signup, verifyOTP, login, logout, getCurrentUser };