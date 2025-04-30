// routes/postsRoutes.js
const express = require('express');
const router = express.Router();
const { 
  createPost, 
  getAllPosts, 
  getPostById, 
  getUserPosts,
  updatePost, 
  deletePost, 
  likePost, 
  unlikePost, 
  addComment, 
  deleteComment, 
  searchPosts,
  getPostsByLocation,
  getPostsByLandmark,
  isAuthenticated  // Use the middleware from postsController
} = require('../controllers/postsController');

// Import authenticateToken from authMiddleware instead
const { authenticateToken } = require('../middleware/authMiddleware');

// Public routes (no authentication required)
router.get('/posts', getAllPosts);
router.get('/posts/:id', getPostById);
router.get('/posts/user/:userId', getUserPosts);
router.get('/search', searchPosts);
router.get('/location/:location', getPostsByLocation);
router.get('/landmark/:landmark', getPostsByLandmark);

// Protected routes (authentication required)
router.post('/posts', authenticateToken, createPost);
router.put('/posts/:id', authenticateToken, updatePost);
router.delete('/posts/:id', authenticateToken, deletePost);
router.post('/posts/:id/like', authenticateToken, likePost);
router.post('/posts/:id/unlike', authenticateToken, unlikePost);
router.post('/posts/:id/comments', authenticateToken, addComment);
router.delete('/posts/:postId/comments/:commentId', authenticateToken, deleteComment);

module.exports = router;