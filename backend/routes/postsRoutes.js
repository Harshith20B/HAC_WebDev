const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload'); // Import upload middleware
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
  getPostsByLandmark
} = require('../controllers/postsController');

// Import middleware from authMiddleware
const { authenticateToken, isAuthenticated } = require('../middleware/authMiddleware');

// Public routes (no authentication required, but user authentication status is checked)
router.get('/posts', isAuthenticated, getAllPosts);
router.get('/posts/:id', isAuthenticated, getPostById);
router.get('/user/:userId', getUserPosts);
router.get('/search', isAuthenticated, searchPosts);
router.get('/location/:location', getPostsByLocation);
router.get('/landmark/:landmark', getPostsByLandmark);

// Protected routes (authentication required)
// Note: upload.single('mediaFile') handles single file upload with field name 'mediaFile'
router.post('/posts', authenticateToken, upload.single('mediaFile'), createPost);
router.put('/posts/:id', authenticateToken, updatePost);
router.delete('/posts/:id', authenticateToken, deletePost);
router.post('/posts/:id/like', authenticateToken, likePost);
router.post('/posts/:id/unlike', authenticateToken, unlikePost);
router.post('/posts/:id/comments', authenticateToken, addComment);
router.delete('/posts/:postId/comments/:commentId', authenticateToken, deleteComment);

module.exports = router;