const express = require('express');
const {
  getTravelPlans,
  addTravelPlan,
  joinTravelPlan,
} = require('../controllers/travelPlanController');

const router = express.Router();

// Fetch all travel plans
router.get('/', getTravelPlans);

// Add a new travel plan
router.post('/', addTravelPlan);

// Join a travel plan
router.post('/:id/join', joinTravelPlan);

module.exports = router;
