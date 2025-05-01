// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Generate JWT token for user
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'your_jwt_secret',
    { expiresIn: '7d' } // Token expires in 7 days
  );
};

// Middleware to verify JWT token and protect routes
const authenticateToken = (req, res, next) => {
  // Get the token from the Authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    
    // Set user information in the request
    req.user = { id: decoded.id };
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
};

// Optional authentication middleware - doesn't require authentication but adds user info if available
const isAuthenticated = (req, res, next) => {
  // Get the token from the Authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

  if (!token) {
    // No token, proceed without user authentication
    return next();
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    
    // Set user information in the request
    req.user = { id: decoded.id };
    next();
  } catch (error) {
    // Invalid token, proceed without user authentication
    console.error('Optional token verification error:', error);
    next();
  }
};

module.exports = { generateToken, authenticateToken, isAuthenticated };