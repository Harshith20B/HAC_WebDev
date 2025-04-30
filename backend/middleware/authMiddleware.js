// middleware/authMiddleware.js - with debug logs
const jwt = require('jsonwebtoken');
require('dotenv').config();

// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: '24h' // Token expires in 24 hours
  });
};

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  console.log('Auth Headers:', req.headers);
  // Get token from header
  const authHeader = req.header('Authorization');
  console.log('Auth Header:', authHeader);
  
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN format
  console.log('Extracted Token:', token ? token.substring(0, 20) + '...' : 'No token');
  
  // If no token, also check session as fallback
  if (!token) {
    console.log('No token, checking session:', req.session?.user ? 'Session user exists' : 'No session user');
    if (req.session && req.session.user) {
      req.user = req.session.user;
      console.log('Using session user:', req.user);
      return next();
    }
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Decoded token:', decoded);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ message: 'Invalid token.' });
  }
};

module.exports = { generateToken, authenticateToken };