// routes/landmarkRoutes.js

const express = require('express');
const router = express.Router();
const landmarkController = require('../controllers/landmarkController');

// Route to get most visited landmarks
router.get('/', landmarkController.getMostVisitedLandmarks);

// Route to get landmark details by ID
router.get('/:id', landmarkController.getLandmarkDetails); // New route to fetch landmark details

module.exports = router;
