const mongoose = require('mongoose');

// Define the schema for Landmark2
const Landmark2 = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  location: { type: String, required: true }, // Representing the city or location
  radius: { type: Number, required: true }, // Radius in kilometers
  imageUrl: { type: String },
  latitude: { type: Number, required: true }, // Latitude coordinate
  longitude: { type: Number, required: true }, // Longitude coordinate
});

// Create a model from the schema
module.exports = mongoose.model('Landmark2', Landmark2);
