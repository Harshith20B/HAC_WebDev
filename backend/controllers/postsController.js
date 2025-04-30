const Post = require('../models/post');
const User = require('../models/User');

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

// Modified createPost function to check req.user (set by authenticateToken) instead of req.session.user
const createPost = async (req, res) => {
  try {
    // Check either req.user (set by JWT auth) or req.session.user (set by session auth)
    if (!req.user && !req.session?.user) {
      return res.status(401).json({ message: 'Login required to create posts' });
    }

    const userId = req.user?.id || req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User ID not found in authentication' });
    }

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

// Get all posts with pagination (visible to all users)
const getAllPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = 'recent' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let sortOption = {};
    
    // Sorting logic
    switch (sort) {
      case 'popular':
        // Sort by likes count and then by date
        sortOption = { 'likes.length': -1, createdAt: -1 };
        break;
      case 'recent':
      default:
        // Sort by date (newest first)
        sortOption = { createdAt: -1 };
        break;
    }

    const posts = await Post.find()
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'name profilePicture')
      .populate('comments.user', 'name profilePicture')
      .lean();

    const total = await Post.countDocuments();

    // Add likes count to each post
    const postsWithCounts = posts.map(post => ({
      ...post,
      likesCount: post.likes.length,
      commentsCount: post.comments.length
    }));

    res.status(200).json({
      posts: postsWithCounts,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ message: 'Failed to fetch posts', error: error.message });
  }
};

// Get a single post by ID
const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'name profilePicture')
      .populate('comments.user', 'name profilePicture')
      .lean();

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Add likes count
    post.likesCount = post.likes.length;
    post.commentsCount = post.comments.length;

    res.status(200).json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ message: 'Failed to fetch post', error: error.message });
  }
};

// Get posts by user ID
const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const posts = await Post.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'name profilePicture')
      .lean();

    const total = await Post.countDocuments({ user: userId });

    // Add counts
    const postsWithCounts = posts.map(post => ({
      ...post,
      likesCount: post.likes.length,
      commentsCount: post.comments.length
    }));

    res.status(200).json({
      posts: postsWithCounts,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ message: 'Failed to fetch user posts', error: error.message });
  }
};

// Update a post (only by the post owner)
const updatePost = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user is the post owner
    if (post.user.toString() !== req.session.user.id) {
      return res.status(403).json({ message: 'Unauthorized: You can only update your own posts' });
    }

    const { title, content, location, landmark } = req.body;
    
    // Only update fields that are provided
    if (title !== undefined) post.title = title;
    if (content !== undefined) post.content = content;
    if (location !== undefined) post.location = location;
    if (landmark !== undefined) post.landmark = landmark;

    const updatedPost = await post.save();
    res.status(200).json(updatedPost);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ message: 'Failed to update post', error: error.message });
  }
};

// Delete a post (only by the post owner)
const deletePost = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user is the post owner
    if (post.user.toString() !== req.session.user.id) {
      return res.status(403).json({ message: 'Unauthorized: You can only delete your own posts' });
    }

    await Post.findByIdAndDelete(req.params.id);

    // Remove post from user's posts array
    await User.findByIdAndUpdate(
      req.session.user.id,
      { $pull: { posts: req.params.id } }
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
    if (!req.session.user) {
      return res.status(401).json({ message: 'Authentication required to like posts' });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user already liked the post
    if (post.likes.includes(req.session.user.id)) {
      return res.status(400).json({ message: 'Post already liked' });
    }

    // Add user to likes array
    post.likes.push(req.session.user.id);
    await post.save();

    // Add post to user's liked posts
    await User.findByIdAndUpdate(
      req.session.user.id,
      { $push: { likedPosts: req.params.id } }
    );

    res.status(200).json({ message: 'Post liked successfully', likesCount: post.likes.length });
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ message: 'Failed to like post', error: error.message });
  }
};

// Unlike a post
const unlikePost = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: 'Authentication required to unlike posts' });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user has liked the post
    if (!post.likes.includes(req.session.user.id)) {
      return res.status(400).json({ message: 'Post was not liked by the user' });
    }

    // Remove user from likes array
    post.likes = post.likes.filter(userId => userId.toString() !== req.session.user.id);
    await post.save();

    // Remove post from user's liked posts
    await User.findByIdAndUpdate(
      req.session.user.id,
      { $pull: { likedPosts: req.params.id } }
    );

    res.status(200).json({ message: 'Post unliked successfully', likesCount: post.likes.length });
  } catch (error) {
    console.error('Error unliking post:', error);
    res.status(500).json({ message: 'Failed to unlike post', error: error.message });
  }
};

// Add a comment to a post
const addComment = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: 'Authentication required to comment' });
    }

    const { text } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const newComment = {
      user: req.session.user.id,
      text: text.trim()
    };

    post.comments.push(newComment);
    await post.save();

    // Fetch user details for the new comment
    const populatedPost = await Post.findById(req.params.id)
      .populate('comments.user', 'name profilePicture');

    const addedComment = populatedPost.comments[populatedPost.comments.length - 1];

    res.status(201).json({
      message: 'Comment added successfully',
      comment: addedComment,
      commentsCount: post.comments.length
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Failed to add comment', error: error.message });
  }
};

// Delete a comment
const deleteComment = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { postId, commentId } = req.params;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = post.comments.id(commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user is comment owner or post owner
    if (comment.user.toString() !== req.session.user.id && 
        post.user.toString() !== req.session.user.id) {
      return res.status(403).json({ 
        message: 'Unauthorized: You can only delete your own comments or comments on your posts' 
      });
    }

    comment.remove();
    await post.save();

    res.status(200).json({ 
      message: 'Comment deleted successfully',
      commentsCount: post.comments.length
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ message: 'Failed to delete comment', error: error.message });
  }
};

// Search posts by location, landmark, or title
const searchPosts = async (req, res) => {
  try {
    const { query, page = 1, limit = 10, sort = 'relevant' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    if (!query || query.trim() === '') {
      return res.status(400).json({ message: 'Search query is required' });
    }

    // Create search conditions
    const searchConditions = {
      $or: [
        { location: { $regex: query, $options: 'i' } },
        { landmark: { $regex: query, $options: 'i' } },
        { title: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } }
      ]
    };

    let sortOption = {};
    
    // Sorting logic
    switch (sort) {
      case 'popular':
        // Sort by likes count and then by date
        sortOption = { 'likes.length': -1, createdAt: -1 };
        break;
      case 'recent':
        // Sort by date (newest first)
        sortOption = { createdAt: -1 };
        break;
      case 'relevant':
      default:
        // For text relevance, MongoDB text index score would be ideal
        // But we're using regex for flexibility, so we'll use a combination
        sortOption = { 'likes.length': -1, createdAt: -1 };
        break;
    }

    const posts = await Post.find(searchConditions)
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'name profilePicture')
      .lean();

    const total = await Post.countDocuments(searchConditions);

    // Add counts for each post
    const postsWithCounts = posts.map(post => ({
      ...post,
      likesCount: post.likes.length,
      commentsCount: post.comments.length
    }));

    res.status(200).json({
      posts: postsWithCounts,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      totalResults: total
    });
  } catch (error) {
    console.error('Error searching posts:', error);
    res.status(500).json({ message: 'Failed to search posts', error: error.message });
  }
};

// Get posts by location
const getPostsByLocation = async (req, res) => {
  try {
    const { location } = req.params;
    const { page = 1, limit = 10, sort = 'recent' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let sortOption = {};
    
    // Sorting logic - similar to searchPosts
    switch (sort) {
      case 'popular':
        sortOption = { 'likes.length': -1, createdAt: -1 };
        break;
      case 'recent':
      default:
        sortOption = { createdAt: -1 };
        break;
    }

    const posts = await Post.find({ location: { $regex: location, $options: 'i' } })
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'name profilePicture')
      .lean();

    const total = await Post.countDocuments({ location: { $regex: location, $options: 'i' } });

    // Add counts
    const postsWithCounts = posts.map(post => ({
      ...post,
      likesCount: post.likes.length,
      commentsCount: post.comments.length
    }));

    res.status(200).json({
      posts: postsWithCounts,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      totalResults: total
    });
  } catch (error) {
    console.error('Error fetching posts by location:', error);
    res.status(500).json({ message: 'Failed to fetch posts by location', error: error.message });
  }
};

// Get posts by landmark
const getPostsByLandmark = async (req, res) => {
  try {
    const { landmark } = req.params;
    const { page = 1, limit = 10, sort = 'recent' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let sortOption = {};
    
    // Sorting logic
    switch (sort) {
      case 'popular':
        sortOption = { 'likes.length': -1, createdAt: -1 };
        break;
      case 'recent':
      default:
        sortOption = { createdAt: -1 };
        break;
    }

    const posts = await Post.find({ landmark: { $regex: landmark, $options: 'i' } })
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'name profilePicture')
      .lean();

    const total = await Post.countDocuments({ landmark: { $regex: landmark, $options: 'i' } });

    // Add counts
    const postsWithCounts = posts.map(post => ({
      ...post,
      likesCount: post.likes.length,
      commentsCount: post.comments.length
    }));

    res.status(200).json({
      posts: postsWithCounts,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      totalResults: total
    });
  } catch (error) {
    console.error('Error fetching posts by landmark:', error);
    res.status(500).json({ message: 'Failed to fetch posts by landmark', error: error.message });
  }
};

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
  isAuthenticated
};