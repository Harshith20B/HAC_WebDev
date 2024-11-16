const mongoose = require('mongoose');

// Define the schema for Landmark2
const Landmark2Schema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  location: { type: String, required: true }, // Representing the city or location
  radius: { type: Number, required: true }, // Radius in kilometers
  imageUrl: { type: String },
});

// Create a model from the schema
module.exports = mongoose.model('Landmark2', Landmark2Schema);
