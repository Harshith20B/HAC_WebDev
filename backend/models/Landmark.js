// models/Landmark.js

const mongoose = require('mongoose');

const LandmarkSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  imageUrl: { type: String, required: true },
  visits: { type: Number, default: 0 }, // Tracks the number of times visited/booked
});

module.exports = mongoose.model('Landmark', LandmarkSchema);
