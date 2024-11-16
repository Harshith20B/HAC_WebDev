const mongoose = require('mongoose');

// Define the schema for Landmark2
const Landmark2Schema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number], // [longitude, latitude]
  },
  visits: { type: Number, default: 0 },
});

Landmark2Schema.index({ location: '2dsphere' }); // Ensure geospatial indexing for location

module.exports = mongoose.model('Landmark2', Landmark2Schema);
