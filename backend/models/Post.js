const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: false // Optional for image/video posts
  },
  title: {
    type: String,
    required: false // Optional heading
  },
  mediaType: {
    type: String,
    enum: ['image', 'video', 'text'],
    required: true
  },
  mediaUrl: {
    type: String,
    required: false // Required only for image/video posts
  },
  location: {
    type: String,
    required: true // Mandatory field
  },
  landmark: {
    type: String,
    required: false // Optional field
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes for efficient searching
postSchema.index({ location: 'text', landmark: 'text', title: 'text' });

module.exports = mongoose.model('Post', postSchema);