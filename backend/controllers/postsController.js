// controllers/postsController.js
const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment');

// Get all posts with pagination, sorting, and user authentication status
const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortOption = req.query.sort || 'recent';
    
    // Set up sort options
    let sortQuery = {};
    if (sortOption === 'popular') {
      sortQuery = { likesCount: -1, createdAt: -1 };
    } else {
      sortQuery = { createdAt: -1 }; // Default sort by most recent
    }
    
    // Get userId from request if available
    const userId = req.user ? req.user.id : null;
    
    // Get total count of posts
    const totalPosts = await Post.countDocuments();
    const totalPages = Math.ceil(totalPosts / limit);
    
    // Query posts with pagination and sorting
    let posts = await Post.find()
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email profilePicture')
      .populate({
        path: 'comments',
        options: { sort: { createdAt: -1 } },
        populate: {
          path: 'user',
          select: 'name profilePicture'
        }
      });
    
    // If user is authenticated, mark which posts they have liked
    if (userId) {
      posts = posts.map(post => {
        const postObj = post.toObject();
        postObj.isLiked = post.likes.includes(userId);
        return postObj;
      });
    }
    
    res.status(200).json({
      posts,
      currentPage: page,
      totalPages,
      totalPosts
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ message: 'Failed to fetch posts', error: error.message });
  }
};

// Create a new post
const createPost = async (req, res) => {
  try {
    // Get user ID from the authenticated request
    // This is set by the authenticateToken middleware
    const userId = req.user.id;
    
    console.log('Creating post for user:', userId);

    const { title, content, mediaType, mediaUrl, location, landmark } = req.body;

    // Validate required fields
    if (!location) {
      return res.status(400).json({ message: 'Location is required' });
    }

    if (mediaType === 'text' && !content) {
      return res.status(400).json({ message: 'Content is required for text posts' });
    }

    if ((mediaType === 'image' || mediaType === 'video') && !mediaUrl) {
      return res.status(400).json({ message: 'Media URL is required for image/video posts' });
    }

    const newPost = new Post({
      user: userId,
      title,
      content,
      mediaType,
      mediaUrl,
      location,
      landmark: landmark || null
    });

    const savedPost = await newPost.save();
    console.log('Post saved:', savedPost._id);

    // Add post to user's posts array
    await User.findByIdAndUpdate(
      userId,
      { $push: { posts: savedPost._id } }
    );

    res.status(201).json(savedPost);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ message: 'Failed to create post', error: error.message });
  }
};

// Get a specific post by ID
const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'name email profilePicture')
      .populate({
        path: 'comments',
        populate: {
          path: 'user',
          select: 'name profilePicture'
        }
      });
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // If user is authenticated, check if they've liked the post
    if (req.user) {
      const postObj = post.toObject();
      postObj.isLiked = post.likes.includes(req.user.id);
      res.status(200).json(postObj);
    } else {
      res.status(200).json(post);
    }
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ message: 'Failed to fetch post', error: error.message });
  }
};

// Get all posts by a specific user
const getUserPosts = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    const posts = await Post.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate('user', 'name email profilePicture');
    
    res.status(200).json(posts);
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ message: 'Failed to fetch user posts', error: error.message });
  }
};

// Update a post
const updatePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;
    
    // Find the post
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Check if the user is the owner of the post
    if (post.user.toString() !== userId) {
      return res.status(403).json({ message: 'You can only update your own posts' });
    }
    
    // Update the post
    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { $set: req.body },
      { new: true }
    );
    
    res.status(200).json(updatedPost);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ message: 'Failed to update post', error: error.message });
  }
};

// Delete a post
const deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;
    
    // Find the post
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Check if the user is the owner of the post
    if (post.user.toString() !== userId) {
      return res.status(403).json({ message: 'You can only delete your own posts' });
    }
    
    // Delete all comments associated with the post
    await Comment.deleteMany({ post: postId });
    
    // Delete the post
    await Post.findByIdAndDelete(postId);
    
    // Remove post reference from user's posts array
    await User.findByIdAndUpdate(
      userId,
      { $pull: { posts: postId } }
    );
    
    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ message: 'Failed to delete post', error: error.message });
  }
};

// Like a post
const likePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;
    
    // Find the post
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Check if the user already liked the post
    if (post.likes.includes(userId)) {
      return res.status(400).json({ message: 'You have already liked this post' });
    }
    
    // Add user to post's likes array and increment likesCount
    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { 
        $push: { likes: userId },
        $inc: { likesCount: 1 }
      },
      { new: true }
    );
    
    res.status(200).json({ 
      message: 'Post liked successfully',
      likesCount: updatedPost.likesCount
    });
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ message: 'Failed to like post', error: error.message });
  }
};

// Unlike a post
const unlikePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;
    
    // Find the post
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Check if the user has liked the post
    if (!post.likes.includes(userId)) {
      return res.status(400).json({ message: 'You have not liked this post' });
    }
    
    // Remove user from post's likes array and decrement likesCount
    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { 
        $pull: { likes: userId },
        $inc: { likesCount: -1 }
      },
      { new: true }
    );
    
    res.status(200).json({ 
      message: 'Post unliked successfully',
      likesCount: updatedPost.likesCount
    });
  } catch (error) {
    console.error('Error unliking post:', error);
    res.status(500).json({ message: 'Failed to unlike post', error: error.message });
  }
};

// Add a comment to a post
const addComment = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;
    const { text } = req.body;
    
    if (!text || text.trim() === '') {
      return res.status(400).json({ message: 'Comment text is required' });
    }
    
    // Find the post
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Create a new comment
    const newComment = new Comment({
      user: userId,
      post: postId,
      text
    });
    
    const savedComment = await newComment.save();
    
    // Add comment to post's comments array and increment commentsCount
    await Post.findByIdAndUpdate(
      postId,
      { 
        $push: { comments: savedComment._id },
        $inc: { commentsCount: 1 }
      }
    );
    
    // Populate user data in the saved comment
    const populatedComment = await Comment.findById(savedComment._id)
      .populate('user', 'name profilePicture');
    
    res.status(201).json({ 
      message: 'Comment added successfully',
      comment: populatedComment
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Failed to add comment', error: error.message });
  }
};

// Delete a comment
const deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user.id;
    
    // Find the comment
    const comment = await Comment.findById(commentId);
    
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    // Check if the user is the owner of the comment
    if (comment.user.toString() !== userId) {
      // Check if the user is the owner of the post
      const post = await Post.findById(postId);
      
      if (!post || post.user.toString() !== userId) {
        return res.status(403).json({ message: 'You can only delete your own comments or comments on your posts' });
      }
    }
    
    // Delete the comment
    await Comment.findByIdAndDelete(commentId);
    
    // Remove comment reference from post's comments array and decrement commentsCount
    await Post.findByIdAndUpdate(
      postId,
      { 
        $pull: { comments: commentId },
        $inc: { commentsCount: -1 }
      }
    );
    
    res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ message: 'Failed to delete comment', error: error.message });
  }
};

// Search posts
const searchPosts = async (req, res) => {
  try {
    const query = req.query.query;
    const sortOption = req.query.sort || 'recent';
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    // Set up sort options
    let sortQuery = {};
    if (sortOption === 'popular') {
      sortQuery = { likesCount: -1, createdAt: -1 };
    } else {
      sortQuery = { createdAt: -1 }; // Default sort by most recent
    }
    
    // Create regex for case-insensitive search
    const searchRegex = new RegExp(query, 'i');
    
    // Search in title, content, location, and landmark
    const posts = await Post.find({
      $or: [
        { title: searchRegex },
        { content: searchRegex },
        { location: searchRegex },
        { landmark: searchRegex }
      ]
    })
      .sort(sortQuery)
      .populate('user', 'name email profilePicture')
      .populate({
        path: 'comments',
        populate: {
          path: 'user',
          select: 'name profilePicture'
        }
      });
    
    // Get userId from request if available
    const userId = req.user ? req.user.id : null;
    
    // If user is authenticated, mark which posts they have liked
    let processedPosts = posts;
    if (userId) {
      processedPosts = posts.map(post => {
        const postObj = post.toObject();
        postObj.isLiked = post.likes.includes(userId);
        return postObj;
      });
    }
    
    res.status(200).json({
      posts: processedPosts,
      totalPages: 1, // For simplicity, no pagination in search results
      query
    });
  } catch (error) {
    console.error('Error searching posts:', error);
    res.status(500).json({ message: 'Failed to search posts', error: error.message });
  }
};

// Get posts by location
const getPostsByLocation = async (req, res) => {
  try {
    const location = req.params.location;
    const locationRegex = new RegExp(location, 'i');
    
    const posts = await Post.find({ location: locationRegex })
      .sort({ createdAt: -1 })
      .populate('user', 'name email profilePicture');
    
    res.status(200).json(posts);
  } catch (error) {
    console.error('Error fetching posts by location:', error);
    res.status(500).json({ message: 'Failed to fetch posts by location', error: error.message });
  }
};

// Get posts by landmark
const getPostsByLandmark = async (req, res) => {
  try {
    const landmark = req.params.landmark;
    const landmarkRegex = new RegExp(landmark, 'i');
    
    const posts = await Post.find({ landmark: landmarkRegex })
      .sort({ createdAt: -1 })
      .populate('user', 'name email profilePicture');
    
    res.status(200).json(posts);
  } catch (error) {
    console.error('Error fetching posts by landmark:', error);
    res.status(500).json({ message: 'Failed to fetch posts by landmark', error: error.message });
  }
};

// Use the isAuthenticated middleware from authMiddleware.js
const { isAuthenticated } = require('../middleware/authMiddleware');

module.exports = {
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
  isAuthenticated // Export the middleware
};