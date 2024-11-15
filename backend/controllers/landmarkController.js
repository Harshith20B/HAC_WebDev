// controllers/landmarkController.js

const Landmark = require('../models/Landmark');
const axios = require('axios');

// Function to get most visited landmarks
const getMostVisitedLandmarks = async (req, res) => {
  try {
    const landmarks = await Landmark.find().sort({ visits: -1 }).limit(9); // Top 9 most visited landmarks
    res.json(landmarks);
  } catch (error) {
    console.error("Error fetching landmarks:", error);
    res.status(500).json({ message: 'Error fetching landmarks' });
  }
};

// Function to increment visits count
// const incrementVisits = async (req, res) => {
//   const { id } = req.params;
//   try {
//     const landmark = await Landmark.findByIdAndUpdate(
//       id,
//       { $inc: { visits: 1 } }, // Increment visits by 1
//       { new: true }
//     );
//     if (!landmark) {
//       return res.status(404).json({ message: 'Landmark not found' });
//     }
//     res.json(landmark);
//   } catch (error) {
//     console.error("Error incrementing visits:", error);
//     res.status(500).json({ message: 'Error incrementing visits' });
//   }
// };
// const handleBookNow = async (landmarkId) => {
//   try {
//     await axios.post(`http://localhost:5000/api/landmarks/${landmarkId}/visit`);
//   } catch (error) {
//     console.error("Error incrementing visits:", error);
//   }
// };

// // Call this function in the booking action in the LandmarkCard component or elsewhere
// handleBookNow(landmark._id);
module.exports = { getMostVisitedLandmarks};

