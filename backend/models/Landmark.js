// models/Landmark.js

const mongoose = require('mongoose');

const Landmark = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  imageUrl: { type: String, required: true },
  visits: { type: Number, default: 0 }, // Tracks the number of times visited/booked
  latitude: { type: Number, required: true },  // Latitude of the landmark
  longitude: { type: Number, required: true }  // Longitude of the landmark
});

module.exports = mongoose.model('Landmark', Landmark);
