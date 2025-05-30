const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Landmark' }], // Array of bookmarked landmark IDs
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }], // Array of user's posts
  likedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }], // Array of posts liked by user
  profilePicture: { type: String, default: '' } // Optional profile picture URL
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('User', userSchema);