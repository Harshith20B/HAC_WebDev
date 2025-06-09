const TravelPlan = require('../models/TravelPlan');
const User = require('../models/User');

// Fetch all travel plans
exports.getTravelPlans = async (req, res) => {
  try {
    const plans = await TravelPlan.find().sort({ 'dateRange.start': -1 });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching travel plans', error: error.message });
  }
};

// Add a new travel plan (requires authentication)
exports.addTravelPlan = async (req, res) => {
  const { title, description, landmarks, maxPeople, dateRange } = req.body;

  try {
    // Get user info from authenticated request
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newPlan = new TravelPlan({
      user: user.name,
      title,
      description,
      landmarks: Array.isArray(landmarks) ? landmarks : [landmarks],
      maxPeople: Number(maxPeople),
      currentPeople: 1, // Creator is automatically included
      dateRange: {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end)
      },
      email: user.email,
      createdBy: userId // Store the user ID for ownership verification
    });

    const savedPlan = await newPlan.save();
    res.status(201).json(savedPlan);
  } catch (error) {
    res.status(400).json({ message: 'Error adding travel plan', error: error.message });
  }
};

// Update travel plan (only by creator, requires authentication)
exports.updateTravelPlan = async (req, res) => {
  const { id } = req.params;
  const { title, description, landmarks, maxPeople, dateRange } = req.body;

  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const plan = await TravelPlan.findById(id);
    if (!plan) {
      return res.status(404).json({ message: 'Travel plan not found' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the authenticated user is the creator
    if (plan.createdBy?.toString() !== userId && plan.email !== user.email) {
      return res.status(403).json({ message: 'You can only edit your own travel plans' });
    }

    // Validate that maxPeople is not less than currentPeople
    if (maxPeople < plan.currentPeople) {
      return res.status(400).json({ 
        message: `Cannot reduce max people below current participants (${plan.currentPeople})` 
      });
    }

    // Update the plan
    const updatedPlan = await TravelPlan.findByIdAndUpdate(
      id,
      {
        user: user.name,
        title,
        description,
        landmarks: Array.isArray(landmarks) ? landmarks : [landmarks],
        maxPeople: Number(maxPeople),
        dateRange: {
          start: new Date(dateRange.start),
          end: new Date(dateRange.end)
        },
        email: user.email
      },
      { new: true, runValidators: true }
    );

    res.json(updatedPlan);
  } catch (error) {
    res.status(400).json({ message: 'Error updating travel plan', error: error.message });
  }
};

// Delete travel plan (only by creator, requires authentication)
exports.deleteTravelPlan = async (req, res) => {
  const { id } = req.params;

  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const plan = await TravelPlan.findById(id);
    if (!plan) {
      return res.status(404).json({ message: 'Travel plan not found' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the authenticated user is the creator
    if (plan.createdBy?.toString() !== userId && plan.email !== user.email) {
      return res.status(403).json({ message: 'You can only delete your own travel plans' });
    }

    await TravelPlan.findByIdAndDelete(id);
    res.json({ message: 'Travel plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting travel plan', error: error.message });
  }
};

// Join a travel plan (requires authentication)
exports.joinTravelPlan = async (req, res) => {
  const { id } = req.params;

  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const plan = await TravelPlan.findById(id);
    if (!plan) {
      return res.status(404).json({ message: 'Travel plan not found' });
    }

    if (plan.currentPeople >= plan.maxPeople) {
      return res.status(400).json({ message: 'Travel plan is already full' });
    }

    // Check if user is already the creator
    const user = await User.findById(userId);
    if (plan.createdBy?.toString() === userId || plan.email === user.email) {
      return res.status(400).json({ message: 'You cannot join your own travel plan' });
    }

    plan.currentPeople += 1;
    await plan.save();

    res.json(plan);
  } catch (error) {
    res.status(500).json({ message: 'Error joining travel plan', error: error.message });
  }
};