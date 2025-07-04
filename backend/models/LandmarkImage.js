const mongoose = require('mongoose');

const landmarkImageSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  imageUrl: { type: String, required: true }
});

const LandmarkImage = mongoose.model('LandmarkImage', landmarkImageSchema);

module.exports = LandmarkImage;
