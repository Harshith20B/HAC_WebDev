const TravelPlan = require('../models/TravelPlan');

// Fetch all travel plans
exports.getTravelPlans = async (req, res) => {
  try {
    const plans = await TravelPlan.find().sort({ 'dateRange.start': -1 });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching travel plans', error: error.message });
  }
};

// Add a new travel plan
exports.addTravelPlan = async (req, res) => {
  const { user, title, description, landmarks, maxPeople, dateRange, email } = req.body;

  try {
    const newPlan = new TravelPlan({
      user,
      title,
      description,
      landmarks: Array.isArray(landmarks) ? landmarks : [landmarks],
      maxPeople: Number(maxPeople),
      currentPeople: 0,
      dateRange: {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end)
      },
      email
    });

    const savedPlan = await newPlan.save();
    res.status(201).json(savedPlan);
  } catch (error) {
    res.status(400).json({ message: 'Error adding travel plan', error: error.message });
  }
};

// Join a travel plan
exports.joinTravelPlan = async (req, res) => {
  const { id } = req.params;

  try {
    const plan = await TravelPlan.findById(id);

    if (!plan) {
      return res.status(404).json({ message: 'Travel plan not found' });
    }

    if (plan.currentPeople >= plan.maxPeople) {
      return res.status(400).json({ message: 'Travel plan is already full' });
    }

    plan.currentPeople += 1;
    await plan.save();

    res.json(plan);
  } catch (error) {
    res.status(500).json({ message: 'Error joining travel plan', error: error.message });
  }
};