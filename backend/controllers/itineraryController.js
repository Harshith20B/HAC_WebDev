const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');
const logger = require('pino')();

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

// Helper function to calculate distance between two points
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
};

// Helper function to optimize route using nearest neighbor algorithm
const optimizeRoute = (landmarks) => {
  if (landmarks.length <= 2) return landmarks;
  
  const optimized = [landmarks[0]]; // Start with first landmark
  const remaining = landmarks.slice(1);
  
  while (remaining.length > 0) {
    const current = optimized[optimized.length - 1];
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    
    remaining.forEach((landmark, index) => {
      const distance = calculateDistance(
        current.latitude, current.longitude,
        landmark.latitude, landmark.longitude
      );
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    
    optimized.push(remaining[nearestIndex]);
    remaining.splice(nearestIndex, 1);
  }
  
  return optimized;
};

// Fetch additional landmarks from the same area
const fetchAdditionalLandmarks = async (location, userLandmarks, numberOfDays) => {
  try {
    const apiKey = process.env.OPENTRIPMAP_API_KEY;
    if (!apiKey) {
      logger.warn('OpenTripMap API key not available, using user landmarks only');
      return userLandmarks;
    }

    // Calculate how many additional landmarks we need
    const landmarksPerDay = 3; // Conservative estimate
    const totalNeeded = numberOfDays * landmarksPerDay;
    const additionalNeeded = Math.max(0, totalNeeded - userLandmarks.length);

    if (additionalNeeded === 0) {
      return userLandmarks;
    }

    // Get coordinates for the location
    const geocodeUrl = `https://api.opentripmap.com/0.1/en/places/geoname?name=${encodeURIComponent(location)}&apikey=${apiKey}`;
    const geocodeResponse = await axios.get(geocodeUrl, { timeout: 10000 });
    const { lat, lon } = geocodeResponse.data;

    // Fetch landmarks within reasonable radius
    const radius = location.toLowerCase().includes('lucknow') ? 15000 : 25000; // Larger radius for smaller cities
    const landmarkUrl = `https://api.opentripmap.com/0.1/en/places/radius?radius=${radius}&lon=${lon}&lat=${lat}&apikey=${apiKey}&limit=50&kinds=interesting_places,museums,churches,theatres,monuments,architecture,historic`;
    const landmarkResponse = await axios.get(landmarkUrl, { timeout: 15000 });

    const existingNames = new Set(userLandmarks.map(l => l.name.toLowerCase()));
    const additionalLandmarks = [];

    landmarkResponse.data.features.forEach(feature => {
      const name = feature.properties.name;
      if (name && 
          !existingNames.has(name.toLowerCase()) && 
          name !== 'Unknown Name' &&
          name.length > 2 &&
          additionalLandmarks.length < additionalNeeded) {
        
        additionalLandmarks.push({
          name: name,
          latitude: feature.geometry.coordinates[1],
          longitude: feature.geometry.coordinates[0],
          description: `${feature.properties.kinds.split(',')[0].replace('_', ' ')} in ${location}`,
          kinds: feature.properties.kinds,
          isAdditional: true // Flag to identify AI-added landmarks
        });
      }
    });

    // Combine user landmarks (mandatory) + additional landmarks
    const allLandmarks = [...userLandmarks, ...additionalLandmarks];
    logger.info(`Added ${additionalLandmarks.length} additional landmarks to user's ${userLandmarks.length} selections`);
    
    return allLandmarks;
  } catch (error) {
    logger.error('Error fetching additional landmarks:', error.message);
    return userLandmarks;
  }
};

// Helper function to distribute landmarks across days properly
const distributeLandmarks = (landmarks, numberOfDays, userSelectedCount) => {
  const optimizedRoute = optimizeRoute(landmarks);
  
  // Ensure user-selected landmarks are distributed first
  const userLandmarks = optimizedRoute.filter(l => !l.isAdditional);
  const additionalLandmarks = optimizedRoute.filter(l => l.isAdditional);
  
  // Calculate distribution strategy
  const minLandmarksPerDay = Math.max(2, Math.floor(userSelectedCount / numberOfDays));
  const maxLandmarksPerDay = Math.min(4, minLandmarksPerDay + 2);
  
  const days = [];
  let currentIndex = 0;
  
  for (let i = 0; i < numberOfDays; i++) {
    const remainingDays = numberOfDays - i;
    const remainingLandmarks = optimizedRoute.length - currentIndex;
    const landmarksForThisDay = Math.min(
      maxLandmarksPerDay,
      Math.max(minLandmarksPerDay, Math.ceil(remainingLandmarks / remainingDays))
    );
    
    const dayLandmarks = optimizedRoute.slice(currentIndex, currentIndex + landmarksForThisDay);
    currentIndex += landmarksForThisDay;
    
    if (dayLandmarks.length > 0) {
      days.push({
        day: i + 1,
        landmarks: dayLandmarks,
        totalDistance: 0,
        estimatedTime: 0
      });
    }
  }
  
  // Calculate distances and times for each day
  days.forEach(day => {
    let totalDistance = 0;
    for (let i = 1; i < day.landmarks.length; i++) {
      const prev = day.landmarks[i - 1];
      const curr = day.landmarks[i];
      totalDistance += calculateDistance(
        prev.latitude, prev.longitude,
        curr.latitude, curr.longitude
      );
    }
    day.totalDistance = totalDistance;
    day.estimatedTime = Math.ceil(totalDistance / 25 * 60) + (day.landmarks.length * 120); // 25km/h + 2hr per landmark
  });
  
  return days;
};

// Generate detailed itinerary using Google AI with proper INR pricing
const generateDetailedItinerary = async (landmarks, tripDetails) => {
  try {
    const { location, numberOfDays, budget } = tripDetails;
    const landmarkNames = landmarks.map(l => l.name).join(', ');
    
    const prompt = `Create a detailed ${numberOfDays}-day travel itinerary for ${location}, India with budget ₹${budget} INR.

Selected landmarks to visit (MUST include all): ${landmarkNames}

PRICING GUIDELINES (Very Important - Use only INR):
- Entry fees for monuments: ₹20-₹500 (depending on popularity)
- Transport per trip: ₹50-₹200 (auto-rickshaw, bus, metro)
- NO FOOD COSTS in activities (only transport and entry fees)
- Use realistic Indian pricing in INR only

Requirements:
- ${numberOfDays} days itinerary from 8:00 AM to 6:00 PM each day
- Budget: ₹${budget} INR total (Indian Rupees)
- Include 3-4 landmark visits per day with specific timings
- Include travel time between locations (15-45 minutes)
- ONLY include transport costs and entry fees for landmarks
- DO NOT include food costs in activities
- Use realistic Indian travel times
- Include practical travel tips for India
- Suggest transportation modes (auto-rickshaw, metro, bus, Ola/Uber)

Format as JSON:
{
  "itinerary": {
    "days": [
      {
        "day": 1,
        "date": "Day 1",
        "schedule": [
          {
            "time": "9:00 AM",
            "activity": "Visit Taj Mahal",
            "location": "Taj Mahal, Agra",
            "duration": "2 hours",
            "cost": 250,
            "costType": "entry",
            "tips": "Best time for photography"
          },
          {
            "time": "11:15 AM",
            "activity": "Travel to Red Fort",
            "location": "En route to Red Fort",
            "duration": "30 minutes",
            "cost": 150,
            "costType": "transport",
            "tips": "Use auto-rickshaw or metro"
          }
        ]
      }
    ]
  },
  "budgetBreakdown": {
    "transport": ${Math.floor(budget * 0.4)},
    "attractions": ${Math.floor(budget * 0.6)},
    "total": ${budget}
  },
  "tips": [
    "Carry cash as many places don't accept cards",
    "Download offline maps",
    "Dress modestly when visiting religious sites",
    "Bargain with auto-rickshaw drivers"
  ]
}

Use only realistic Indian pricing in INR. Include ONLY transport and entry costs. JSON only, no markdown.`;

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4000,
        topP: 0.8,
      }
    });

    console.log("🔄 Generating detailed itinerary with enhanced landmarks...");
    
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Clean and parse JSON response
    let cleanResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Remove any text before the first { and after the last }
    const jsonStart = cleanResponse.indexOf('{');
    const jsonEnd = cleanResponse.lastIndexOf('}') + 1;
    
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      const jsonStr = cleanResponse.substring(jsonStart, jsonEnd);
      const parsedResponse = JSON.parse(jsonStr);
      
      // Validate and fix costs to ensure they're reasonable INR amounts
      if (parsedResponse.itinerary && parsedResponse.itinerary.days) {
        parsedResponse.itinerary.days.forEach(day => {
          if (day.schedule) {
            day.schedule.forEach(activity => {
              if (activity.cost) {
                // Ensure costs are reasonable for India
                if (activity.costType === 'transport' && activity.cost > 500) {
                  activity.cost = Math.min(activity.cost, 300);
                }
                if (activity.costType === 'entry' && activity.cost > 1000) {
                  activity.cost = Math.min(activity.cost, 500);
                }
              }
            });
          }
        });
      }
      
      return parsedResponse;
    }
    
    throw new Error('Invalid JSON response from AI');
    
  } catch (error) {
    logger.error('Error generating detailed itinerary:', error);
    
    // Fallback to basic itinerary with proper INR pricing
    const days = distributeLandmarks(landmarks, tripDetails.numberOfDays, landmarks.filter(l => !l.isAdditional).length);
    return {
      itinerary: {
        days: days.map(day => ({
          day: day.day,
          date: `Day ${day.day}`,
          schedule: day.landmarks.flatMap((landmark, index) => [
            {
              time: `${9 + index * 2}:00 ${9 + index * 2 < 12 ? 'AM' : 'PM'}`,
              activity: `Visit ${landmark.name}`,
              location: landmark.name,
              duration: "1.5 hours",
              cost: 200,
              costType: "entry",
              tips: `Explore ${landmark.name}. ${landmark.description || ''}`
            },
            ...(index < day.landmarks.length - 1 ? [{
              time: `${9 + index * 2 + 1}:30 ${9 + index * 2 + 1 < 12 ? 'AM' : 'PM'}`,
              activity: `Travel to ${day.landmarks[index + 1].name}`,
              location: "En route",
              duration: "30 minutes",
              cost: 100,
              costType: "transport",
              tips: "Use local transport"
            }] : [])
          ])
        }))
      },
      budgetBreakdown: {
        transport: Math.floor(tripDetails.budget * 0.4),
        attractions: Math.floor(tripDetails.budget * 0.6),
        total: tripDetails.budget
      },
      tips: [
        "Carry cash as many places don't accept cards",
        "Download offline maps for navigation",
        "Keep copies of important documents",
        "Dress modestly when visiting religious sites",
        "Bargain with auto-rickshaw drivers for better rates"
      ]
    };
  }
};

// Main controller function
const generateItinerary = async (req, res) => {
  try {
    const { landmarks, tripDetails } = req.body;
    
    if (!landmarks || !Array.isArray(landmarks) || landmarks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Landmarks array is required and cannot be empty'
      });
    }
    
    if (!tripDetails || !tripDetails.numberOfDays || !tripDetails.budget) {
      return res.status(400).json({
        success: false,
        message: 'Trip details (numberOfDays, budget) are required'
      });
    }
    
    logger.info(`Generating itinerary for ${landmarks.length} user-selected landmarks over ${tripDetails.numberOfDays} days with ₹${tripDetails.budget} budget`);
    
    // Validate landmarks have required coordinates
    const validLandmarks = landmarks.filter(landmark => 
      landmark.latitude && landmark.longitude && landmark.name
    ).map(landmark => ({
      ...landmark,
      isAdditional: false // Mark user-selected landmarks
    }));
    
    if (validLandmarks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid landmarks with coordinates found'
      });
    }
    
    // Fetch additional landmarks to enhance the itinerary (only if needed)
    const allLandmarks = await fetchAdditionalLandmarks(
      tripDetails.location, 
      validLandmarks, 
      tripDetails.numberOfDays
    );
    
    logger.info(`Total landmarks for itinerary: ${allLandmarks.length} (${validLandmarks.length} user-selected + ${allLandmarks.length - validLandmarks.length} additional)`);
    
    // Generate route optimization
    const optimizedRoute = optimizeRoute(allLandmarks);
    const dayWiseDistribution = distributeLandmarks(optimizedRoute, tripDetails.numberOfDays, validLandmarks.length);
    
    // Generate detailed itinerary using AI
    const detailedItinerary = await generateDetailedItinerary(allLandmarks, tripDetails);
    
    // Calculate route statistics
    let totalDistance = 0;
    let totalTime = 0;
    
    dayWiseDistribution.forEach(day => {
      totalDistance += day.totalDistance;
      totalTime += day.estimatedTime;
    });
    
    const response = {
      success: true,
      data: {
        ...detailedItinerary,
        routeOptimization: {
          optimizedLandmarks: optimizedRoute,
          dayWiseDistribution,
          totalDistance: parseFloat(totalDistance.toFixed(2)),
          totalEstimatedTime: totalTime,
          averageDistancePerDay: parseFloat((totalDistance / tripDetails.numberOfDays).toFixed(2))
        },
        tripSummary: {
          location: tripDetails.location,
          numberOfDays: tripDetails.numberOfDays,
          budget: `₹${tripDetails.budget}`,
          totalLandmarks: allLandmarks.length,
          userSelectedLandmarks: validLandmarks.length,
          additionalLandmarks: allLandmarks.length - validLandmarks.length,
          generatedAt: new Date().toISOString()
        }
      }
    };
    
    logger.info(`Itinerary generated successfully with ${allLandmarks.length} total landmarks`);
    res.json(response);
    
  } catch (error) {
    logger.error('Error in generateItinerary:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating itinerary',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  generateItinerary
};