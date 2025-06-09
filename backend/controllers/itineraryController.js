const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");
const logger = require("pino")();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

// Calculate Haversine distance
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Simple nearest neighbor route optimization
const optimizeRoute = (landmarks) => {
  if (landmarks.length <= 2) return landmarks;

  const optimized = [landmarks[0]];
  const remaining = landmarks.slice(1);

  while (remaining.length > 0) {
    const current = optimized[optimized.length - 1];
    let nearest = remaining.reduce((closest, landmark) => {
      const dist = calculateDistance(
        current.latitude,
        current.longitude,
        landmark.latitude,
        landmark.longitude
      );
      return dist < closest.distance
        ? { distance: dist, landmark }
        : closest;
    }, { distance: Infinity, landmark: null });

    optimized.push(nearest.landmark);
    remaining.splice(remaining.indexOf(nearest.landmark), 1);
  }

  return optimized;
};

// Fetch extra landmarks if needed
const fetchAdditionalLandmarks = async (location, userLandmarks, numberOfDays) => {
  try {
    const apiKey = process.env.OPENTRIPMAP_API_KEY;
    if (!apiKey) return userLandmarks;

    const geocodeUrl = `https://api.opentripmap.com/0.1/en/places/geoname?name=${encodeURIComponent(location)}&apikey=${apiKey}`;
    const geoRes = await axios.get(geocodeUrl, { timeout: 10000 });
    const { lat, lon } = geoRes.data;

    const requiredCount = Math.max(0, numberOfDays * 3 - userLandmarks.length);
    if (requiredCount <= 0) return userLandmarks;

    const radius = 20000;
    const landmarkUrl = `https://api.opentripmap.com/0.1/en/places/radius?radius=${radius}&lon=${lon}&lat=${lat}&apikey=${apiKey}&limit=50&kinds=interesting_places,museums,monuments,architecture,historic`;
    const landRes = await axios.get(landmarkUrl, { timeout: 15000 });

    const existing = new Set(userLandmarks.map((l) => l.name?.toLowerCase()));
    const additional = [];

    for (const feature of landRes.data.features) {
      const name = feature?.properties?.name;
      if (
        name &&
        name.length > 2 &&
        name !== 'Unknown Name' &&
        !existing.has(name.toLowerCase()) &&
        additional.length < requiredCount
      ) {
        additional.push({
          name,
          latitude: feature.geometry.coordinates[1],
          longitude: feature.geometry.coordinates[0],
          description: feature.properties.kinds?.split(",")[0]?.replace("_", " ") || "Attraction",
          isAdditional: true,
        });
      }
    }

    logger.info(`Added ${additional.length} additional landmarks`);
    return [...userLandmarks, ...additional];
  } catch (err) {
    logger.warn("Failed to fetch additional landmarks:", err.message);
    return userLandmarks;
  }
};

// Distribute landmarks evenly across days
const distributeLandmarks = (landmarks, numberOfDays) => {
  const optimized = optimizeRoute(landmarks);
  const days = Array.from({ length: numberOfDays }, (_, i) => ({
    day: i + 1,
    landmarks: [],
    totalDistance: 0,
    estimatedTime: 0,
  }));

  // Distribute landmarks round-robin style
  optimized.forEach((lm, index) => {
    days[index % numberOfDays].landmarks.push(lm);
  });

  // Calculate distances and times for each day
  days.forEach((day) => {
    for (let i = 1; i < day.landmarks.length; i++) {
      const d = calculateDistance(
        day.landmarks[i - 1].latitude,
        day.landmarks[i - 1].longitude,
        day.landmarks[i].latitude,
        day.landmarks[i].longitude
      );
      day.totalDistance += d;
    }
    day.estimatedTime = Math.ceil(day.totalDistance / 25 * 60) + (day.landmarks.length * 90);
  });

  return days;
};

// Create fallback itinerary structure
const createFallbackItinerary = (dayWiseDistribution, budget) => {
  const days = dayWiseDistribution.map(day => {
    const schedule = [];
    let currentTime = 9; // Start at 9 AM

    day.landmarks.forEach((landmark, index) => {
      // Add visit activity
      const hour = Math.floor(currentTime);
      const minute = (currentTime % 1) * 60;
      const timeStr = `${hour}:${minute.toString().padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
      
      schedule.push({
        time: timeStr,
        activity: `Visit ${landmark.name}`,
        location: landmark.name,
        duration: "1.5 hours",
        cost: Math.floor(Math.random() * 300) + 50, // Random entry fee 50-350
        costType: "entry",
        tips: `Explore ${landmark.name}. ${landmark.description || 'Popular local attraction.'}`
      });

      currentTime += 1.5;

      // Add travel time to next location (except for last landmark)
      if (index < day.landmarks.length - 1) {
        const nextHour = Math.floor(currentTime);
        const nextMinute = (currentTime % 1) * 60;
        const nextTimeStr = `${nextHour}:${nextMinute.toString().padStart(2, '0')} ${nextHour >= 12 ? 'PM' : 'AM'}`;
        
        schedule.push({
          time: nextTimeStr,
          activity: `Travel to ${day.landmarks[index + 1].name}`,
          location: "En route",
          duration: "30 minutes",
          cost: Math.floor(Math.random() * 150) + 50, // Random transport cost 50-200
          costType: "transport",
          tips: "Use local transportation - auto-rickshaw, bus, or taxi"
        });

        currentTime += 0.5;
      }
    });

    return {
      day: day.day,
      date: `Day ${day.day}`,
      schedule
    };
  });

  return {
    itinerary: { days },
    budgetBreakdown: {
      transport: Math.floor(budget * 0.4),
      attractions: Math.floor(budget * 0.6),
      total: budget,
    },
    tips: [
      "Carry cash as many places don't accept cards",
      "Download offline maps for navigation",
      "Keep copies of important documents",
      "Dress modestly when visiting religious sites",
      "Negotiate prices with auto-rickshaw drivers"
    ]
  };
};

// Ask Gemini for a detailed JSON plan
const generateDetailedItinerary = async (landmarks, tripDetails) => {
  const { location, numberOfDays, budget } = tripDetails;
  const landmarkNames = landmarks.map((l) => l.name).filter(Boolean).join(", ");

  const prompt = `Create a detailed ${numberOfDays}-day travel itinerary for ${location}, India with budget ₹${budget} INR.

LANDMARKS TO VISIT: ${landmarkNames}

Return ONLY valid JSON in this exact format:
{
  "itinerary": {
    "days": [
      {
        "day": 1,
        "date": "Day 1",
        "schedule": [
          {
            "time": "9:00 AM",
            "activity": "Visit [Landmark Name]",
            "location": "[Landmark Name]",
            "duration": "2 hours",
            "cost": 200,
            "costType": "entry",
            "tips": "Best time to visit, photography tips"
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
    "Practical travel tips"
  ]
}

Requirements:
- Include ALL landmarks: ${landmarkNames}
- Use realistic Indian prices (entry: ₹50-₹500, transport: ₹50-₹300)
- Time from 8 AM to 6 PM daily
- Include travel time between locations
- NO food costs, only entry and transport
- Return ONLY JSON, no markdown or extra text`;

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4000,
      }
    });
    
    logger.info("Generating AI itinerary...");
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, "").trim();
    
    // More robust JSON extraction
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}") + 1;
    
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      const jsonStr = text.substring(jsonStart, jsonEnd);
      const parsed = JSON.parse(jsonStr);
      
      // Validate structure
      if (parsed.itinerary && parsed.itinerary.days && Array.isArray(parsed.itinerary.days)) {
        logger.info("AI itinerary generated successfully");
        return parsed;
      }
    }
    
    throw new Error("Invalid JSON structure from AI");
  } catch (error) {
    logger.warn("AI itinerary generation failed, using fallback:", error.message);
    return null;
  }
};

// Controller
const generateItinerary = async (req, res) => {
  try {
    const { landmarks, tripDetails } = req.body;
    
    // Validation
    if (!Array.isArray(landmarks) || landmarks.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Landmarks array is required and cannot be empty" 
      });
    }
    
    if (!tripDetails?.numberOfDays || !tripDetails?.budget || !tripDetails?.location) {
      return res.status(400).json({ 
        success: false, 
        message: "Trip details (location, numberOfDays, budget) are required" 
      });
    }

    logger.info(`Generating itinerary for ${landmarks.length} landmarks, ${tripDetails.numberOfDays} days, budget ₹${tripDetails.budget}`);

    const validLandmarks = landmarks
      .filter((l) => l.name && l.latitude && l.longitude)
      .map((l) => ({ ...l, isAdditional: false }));

    if (validLandmarks.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid landmarks with coordinates found"
      });
    }

    // Fetch additional landmarks if needed
    const allLandmarks = await fetchAdditionalLandmarks(
      tripDetails.location,
      validLandmarks,
      tripDetails.numberOfDays
    );

    // Generate route optimization
    const optimized = optimizeRoute(allLandmarks);
    const dayWiseDistribution = distributeLandmarks(optimized, tripDetails.numberOfDays);

    // Try to get AI-generated itinerary
    const aiItinerary = await generateDetailedItinerary(allLandmarks, tripDetails);
    
    // Use AI result or fallback
    const finalItinerary = aiItinerary || createFallbackItinerary(dayWiseDistribution, tripDetails.budget);

    // Calculate totals
    let totalDistance = 0, totalTime = 0;
    dayWiseDistribution.forEach((d) => {
      totalDistance += d.totalDistance;
      totalTime += d.estimatedTime;
    });

    const response = {
      success: true,
      data: {
        ...finalItinerary,
        routeOptimization: {
          optimizedLandmarks: optimized,
          dayWiseDistribution,
          totalDistance: +totalDistance.toFixed(2),
          totalEstimatedTime: totalTime,
          averageDistancePerDay: +(totalDistance / tripDetails.numberOfDays).toFixed(2)
        },
        tripSummary: {
          location: tripDetails.location,
          numberOfDays: tripDetails.numberOfDays,
          budget: `₹${tripDetails.budget}`,
          userSelectedLandmarks: validLandmarks.length,
          additionalLandmarks: allLandmarks.length - validLandmarks.length,
          totalLandmarks: allLandmarks.length,
          generatedAt: new Date().toISOString(),
        },
      },
    };

    logger.info("Itinerary generated successfully");
    res.json(response);
    
  } catch (err) {
    logger.error("Error generating itinerary:", err);
    res.status(500).json({
      success: false,
      message: "Error generating itinerary",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

module.exports = {
  generateItinerary,
};