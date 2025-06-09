// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Add a landmark to the user's bookmarks
router.post('/add-bookmark', userController.addBookmark);

// Protected routes (require authentication)
router.put('/profile', authenticateToken, userController.updateProfile);
router.get('/profile', authenticateToken, userController.getProfile);
router.post('/remove-bookmark', authenticateToken, userController.removeBookmark);
router.get('/bookmarks', authenticateToken, userController.getBookmarks);

module.exports = router;