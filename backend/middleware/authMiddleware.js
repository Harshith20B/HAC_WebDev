// middleware/authMiddleware.js
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
  console.log('Auth middleware running...');
  
  // First check if user is authenticated via session
  if (req.session && req.session.userId) {
    console.log('User authenticated via session:', req.session.userId);
    req.user = { id: req.session.userId };
    return next();
  }
  
  // If not authenticated via session, check for JWT token
  let token = null;
  const authHeader = req.header('Authorization');
  console.log('Auth Header:', authHeader);
  
  if (authHeader) {
    // Handle both "Bearer TOKEN" format and raw token format
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else {
      // Try using the header value directly
      token = authHeader;
    }
  }
  
  // Also check if token is passed in request body, query params, or cookies
  if (!token) {
    token = req.body.token || req.query.token || (req.cookies && req.cookies.token);
  }
  
  if (!token) {
    console.log('No valid token provided');
    return res.status(401).json({ message: 'Access denied. No valid authentication found.' });
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Token verified successfully:', decoded);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ message: 'Invalid token.' });
  }
};

// Middleware to check if user is authenticated (for routes that should work with authentication but don't require it)
const isAuthenticated = (req, res, next) => {
  let token = null;
  // First check if user is authenticated via session
  if (req.session && req.session.userId) {
    req.user = { id: req.session.userId };
    req.isAuthenticated = true;
    return next();
  }
  
  // Check for token in various places
  const authHeader = req.header('Authorization');
  
  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else {
      token = authHeader;
    }
  }
  
  if (!token) {
    token = req.body.token || req.query.token || (req.cookies && req.cookies.token);
  }
  
  if (token) {
    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      req.isAuthenticated = true;
    } catch (error) {
      req.isAuthenticated = false;
    }
  } else {
    req.isAuthenticated = false;
  }
  
  // Continue with the request regardless of authentication status
  next();
};

module.exports = { generateToken, authenticateToken, isAuthenticated };