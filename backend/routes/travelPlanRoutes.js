// routes/travelPlanRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken, isAuthenticated } = require('../middleware/authMiddleware');
const {
  getTravelPlans,
  addTravelPlan,
  updateTravelPlan,
  deleteTravelPlan,
  joinTravelPlan
} = require('../controllers/travelPlanController');

// Public route - anyone can view travel plans
router.get('/', getTravelPlans);

// Protected routes - require authentication
router.post('/', authenticateToken, addTravelPlan);
router.put('/:id', authenticateToken, updateTravelPlan);
router.delete('/:id', authenticateToken, deleteTravelPlan);
router.post('/:id/join', authenticateToken, joinTravelPlan);

module.exports = router;