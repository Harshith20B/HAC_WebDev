// routes/landmarkRoutes.js

const express = require('express');
const router = express.Router();
const landmarkController = require('../controllers/landmarkController');

// Route to get most visited landmarks
router.get('/', landmarkController.getMostVisitedLandmarks);

// Route to increment visits for a landmark
//router.post('/:id/visit', landmarkController.incrementVisits);

module.exports = router;
