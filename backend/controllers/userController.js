// controllers/userController.js
const User = require('../models/User');
const Landmark = require('../models/Landmark');
const bcrypt = require('bcryptjs');

// Add a landmark to the user's bookmarks
const addBookmark = async (req, res) => {
  const { userId, landmarkId } = req.body;

  try {
    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the landmark by ID
    const landmark = await Landmark.findById(landmarkId);
    if (!landmark) {
      return res.status(404).json({ message: 'Landmark not found' });
    }

    // Add the landmark to the user's bookmarks if it's not already there
    if (!user.bookmarks.includes(landmarkId)) {
      user.bookmarks.push(landmarkId);
      await user.save();
      res.json({ message: 'Landmark added to bookmarks' });
    } else {
      res.status(400).json({ message: 'Landmark already bookmarked' });
    }
  } catch (error) {
    console.error("Error adding bookmark:", error);
    res.status(500).json({ message: 'Error adding landmark to bookmarks' });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id; // From authentication middleware
    const { name, profilePicture, currentPassword, newPassword } = req.body;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate required fields
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Name is required' });
    }

    // If password change is requested, validate current password
    if (currentPassword && newPassword) {
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Validate new password
      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long' });
      }

      // Update password - will be hashed by pre-save middleware
      user.password = newPassword;
    }

    // Update other fields
    user.name = name.trim();
    if (profilePicture !== undefined) {
      user.profilePicture = profilePicture;
    }

    // Save the updated user
    await user.save();

    // Return user data without password
    const updatedUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      profilePicture: user.profilePicture,
      isVerified: user.isVerified
    };

    res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ 
      message: 'Error updating profile', 
      error: error.message 
    });
  }
};

// Get user profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id; // From authentication middleware
    
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ 
      message: 'Error fetching profile', 
      error: error.message 
    });
  }
};

// Remove a bookmark
const removeBookmark = async (req, res) => {
  try {
    const userId = req.user.id;
    const { landmarkId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove the landmark from bookmarks
    user.bookmarks = user.bookmarks.filter(bookmark => bookmark.toString() !== landmarkId);
    await user.save();

    res.status(200).json({ message: 'Bookmark removed successfully' });
  } catch (error) {
    console.error('Error removing bookmark:', error);
    res.status(500).json({ 
      message: 'Error removing bookmark', 
      error: error.message 
    });
  }
};

// Get user's bookmarks
const getBookmarks = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId).populate('bookmarks');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ bookmarks: user.bookmarks });
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    res.status(500).json({ 
      message: 'Error fetching bookmarks', 
      error: error.message 
    });
  }
};

module.exports = { 
  addBookmark, 
  updateProfile, 
  getProfile, 
  removeBookmark, 
  getBookmarks 
};