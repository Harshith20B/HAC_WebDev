// controllers/postsController.js
const Post = require('../models/Post');
const User = require('../models/User');

// Get all posts with pagination, sorting, and user authentication status
// Fix for getAllPosts in postsController.js
const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortOption = req.query.sort || 'recent';
    
    // Set up sort options
    let sortQuery = {};
    if (sortOption === 'popular') {
      sortQuery = { likes: -1, createdAt: -1 }; // Sort by number of likes
    } else {
      sortQuery = { createdAt: -1 }; // Default sort by most recent
    }
    
    // Get userId from request if available
    const userId = req.user ? req.user.id : null;
    
    // Get total count of posts
    const totalPosts = await Post.countDocuments();
    const totalPages = Math.ceil(totalPosts / limit);
    
    console.log(`Fetching posts: page=${page}, limit=${limit}, totalPosts=${totalPosts}`);
    
    // Query posts with pagination and sorting
    let posts = await Post.find()
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email profilePicture');
    
    console.log(`Found ${posts.length} posts`);
    
    // If user is authenticated, mark which posts they have liked
    // Also add likesCount for all posts
    posts = posts.map(post => {
      const postObj = post.toObject();
      if (userId) {
        postObj.isLiked = post.likes.includes(userId);
      }
      postObj.likesCount = post.likes.length; // Add this line to fix the like count
      return postObj;
    });
    
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
      landmark: landmark || null,
      likes: [],
      comments: []
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

// Fix for getPostById in postsController.js
const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'name email profilePicture');
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    const postObj = post.toObject();
    
    // Add likesCount for the post
    postObj.likesCount = post.likes.length;
    
    // If user is authenticated, check if they've liked the post
    if (req.user) {
      postObj.isLiked = post.likes.includes(req.user.id);
    }
    
    res.status(200).json(postObj);
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
    
    // Add user to post's likes array
    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { $push: { likes: userId } },
      { new: true }
    );
    
    res.status(200).json({ 
      message: 'Post liked successfully',
      likesCount: updatedPost.likes.length
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
    
    // Remove user from post's likes array
    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { $pull: { likes: userId } },
      { new: true }
    );
    
    res.status(200).json({ 
      message: 'Post unliked successfully',
      likesCount: updatedPost.likes.length
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
    const newComment = {
      user: userId,
      text,
      createdAt: new Date()
    };
    
    // Add comment to post's comments array
    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { $push: { comments: newComment } },
      { new: true }
    ).populate('user', 'name email profilePicture')
      .populate({
        path: 'comments.user',
        select: 'name profilePicture'
      });
    
    res.status(201).json({ 
      message: 'Comment added successfully',
      post: updatedPost
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
    
    // Find the post
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Find the comment
    const comment = post.comments.id(commentId);
    
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    // Check if the user is the owner of the comment or the post
    if (comment.user.toString() !== userId && post.user.toString() !== userId) {
      return res.status(403).json({ 
        message: 'You can only delete your own comments or comments on your posts' 
      });
    }
    
    // Remove the comment
    post.comments.pull(commentId);
    await post.save();
    
    res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ message: 'Failed to delete comment', error: error.message });
  }
};

// Search posts
// Fix for searchPosts in postsController.js
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
      sortQuery = { likes: -1, createdAt: -1 }; // Sort by number of likes
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
      .populate('user', 'name email profilePicture');
    
    // Get userId from request if available
    const userId = req.user ? req.user.id : null;
    
    // If user is authenticated, mark which posts they have liked
    // Also add likesCount for all posts
    const processedPosts = posts.map(post => {
      const postObj = post.toObject();
      if (userId) {
        postObj.isLiked = post.likes.includes(userId);
      }
      postObj.likesCount = post.likes.length; // Add this line to fix the like count
      return postObj;
    });
    
    res.status(200).json({
      posts: processedPosts,
      totalPosts: processedPosts.length,
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
  getPostsByLandmark
};