// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Add a landmark to the user's bookmarks
router.post('/add-bookmark', userController.addBookmark);

module.exports = router;
