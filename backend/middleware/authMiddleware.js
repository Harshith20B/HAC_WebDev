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

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: 'No Authorization header provided' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(403).json({ message: 'Invalid Authorization header format' });
  }

  const token = parts[1];
  console.log('Verifying token:', token);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
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