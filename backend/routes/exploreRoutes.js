const express = require('express');
const router = express.Router();
const { getLandmarksWithImages } = require('../controllers/exploreController');
const { generateItinerary } = require('../controllers/itineraryController');
const { getWeatherPrediction, getWeatherForItinerary } = require('../controllers/weatherController');
// Existing route for landmark search
router.get('/search', getLandmarksWithImages);

// New route for itinerary generation
router.post('/generate-itinerary', generateItinerary);
// In your routes file
// router.post('/generate-itinerary', async (req, res) => {
//   await itineraryController.generateItinerary(req, res);
// });
router.post('/weather-prediction', getWeatherPrediction);
router.post('/weather-itinerary', getWeatherForItinerary);

module.exports = router;