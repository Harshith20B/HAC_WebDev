const mongoose = require('mongoose');

const travelPlanSchema = new mongoose.Schema({
  user: { type: String, required: true }, // Name of the user who created the plan
  title: { type: String, required: true },
  description: { type: String, required: true },
  landmarks: [{ type: String }], // List of landmarks
  maxPeople: { type: Number, required: true }, // Maximum number of people allowed
  currentPeople: { type: Number, default: 0 }, // Current number of people who joined
  dateRange: {
    start: { type: Date, required: true },
    end: { type: Date, required: true },
  },
});

module.exports = mongoose.model('TravelPlan', travelPlanSchema);
