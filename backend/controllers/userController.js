// controllers/userController.js
const User = require('../models/User');
const Landmark = require('../models/Landmark');

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

module.exports = { addBookmark };
