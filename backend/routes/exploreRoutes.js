const express = require('express');
const router = express.Router();
const { getLandmarksWithImages } = require('../controllers/exploreController');
const { generateItinerary } = require('../controllers/itineraryController');

// Existing route for landmark search
router.get('/search', getLandmarksWithImages);

// New route for itinerary generation
router.post('/generate-itinerary', generateItinerary);

module.exports = router;