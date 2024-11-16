const TravelPlan = require('../models/travelPlan');

// Fetch all travel plans
exports.getTravelPlans = async (req, res) => {
  try {
    const plans = await TravelPlan.find();
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching travel plans', error });
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
      landmarks,
      maxPeople,
      currentPeople: 0, // Initial count is zero
      dateRange,
      email, // Save the email of the user creating the travel plan
    });

    await newPlan.save();
    res.status(201).json(newPlan);
  } catch (error) {
    res.status(400).json({ message: 'Error adding travel plan', error });
  }
};

// Join a travel plan (optional based on your needs)
exports.joinTravelPlan = async (req, res) => {
  const { id } = req.params;
  const { groupSize } = req.body;

  try {
    const plan = await TravelPlan.findById(id);

    if (!plan) {
      return res.status(404).json({ message: 'Travel plan not found' });
    }

    // Ensure there is enough capacity to accommodate the group
    if (plan.currentPeople + groupSize > plan.maxPeople) {
      return res.status(400).json({ message: 'Not enough capacity in this travel plan' });
    }

    plan.currentPeople += groupSize; // Increment the number of joined people
    await plan.save();

    res.json(plan);
  } catch (error) {
    res.status(500).json({ message: 'Error joining travel plan', error });
  }
};
