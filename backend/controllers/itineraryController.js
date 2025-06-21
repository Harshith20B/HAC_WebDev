const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");
const logger = require("pino")();
const { spawn } = require('child_process');
const path = require('path');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

// Enhanced landmark scoring based on popularity and other factors
const calculateLandmarkScore = (landmark, preferences = {}) => {
  let score = 0;
  
  // Use real popularity data (now from multiple sources)
  const popularity = landmark.popularity || 50;
  score += popularity * 0.4;
  
  // Use real rating data
  const rating = landmark.rating || 3.5;
  score += (rating / 5) * 50 * 0.3;
  
  // Category preference score
  const category = landmark.category || landmark.description || 'general';
  const categoryWeight = preferences[category.toLowerCase()] || 1;
  score += categoryWeight * 30 * 0.15;
  
  // Bonus for verified/high-confidence data
  if (landmark.confidence === 'high') score += 5;
  if (landmark.verified) score += 3;
  if (landmark.hasWikipediaEntry) score += 5;
  
  // Distance penalty (closer landmarks get higher scores)
  const distancePenalty = Math.min(landmark.distanceFromCenter || 0, 20);
  score -= distancePenalty * 0.05;
  
  return Math.max(0, Math.min(100, score));
};

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

// K-means clustering for landmark grouping
const runKMeansClustering = async (landmarks, numberOfDays) => {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '../python/clustering.py');
    
    // Validate landmarks data before sending
    const validatedLandmarks = landmarks.map(l => ({
      name: l.name || 'Unknown',
      latitude: parseFloat(l.latitude) || 0,
      longitude: parseFloat(l.longitude) || 0,
      score: parseFloat(l.score || 50),
      popularity: parseFloat(l.popularity || 50)
    })).filter(l => l.latitude !== 0 && l.longitude !== 0);

    if (validatedLandmarks.length === 0) {
      return reject(new Error("No valid landmarks with coordinates"));
    }

    const landmarkData = JSON.stringify({
      landmarks: validatedLandmarks,
      k: numberOfDays
    });

    console.log('Sending to Python:', landmarkData); // Debug log

    const pythonProcess = spawn('python', [pythonScript], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.log('Python stderr:', data.toString()); // Debug log
    });

    pythonProcess.on('error', (err) => {
      console.log('Python process error:', err); // Debug log
      reject(new Error(`Python process failed to start: ${err.message}`));
    });

    pythonProcess.on('close', (code) => {
      console.log('Python exit code:', code); // Debug log
      console.log('Python output:', output); // Debug log
      console.log('Python stderr:', errorOutput); // Debug log

      if (code === 0) {
        try {
          const result = JSON.parse(output.trim());
          if (result.error) {
            reject(new Error(`Clustering error: ${result.error}`));
          } else {
            resolve(result);
          }
        } catch (err) {
          logger.error('Failed to parse clustering output:', output);
          reject(new Error(`Clustering output could not be parsed: ${err.message}`));
        }
      } else {
        reject(new Error(`Clustering process exited with error code ${code}: ${errorOutput}`));
      }
    });

    try {
      pythonProcess.stdin.write(landmarkData);
      pythonProcess.stdin.end();
    } catch (err) {
      reject(new Error(`Failed to write to Python process: ${err.message}`));
    }
  });
};



// Optimize route within each cluster
const optimizeClusterRoute = (landmarks) => {
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

// Dynamic landmark allocation based on budget and time
const calculateOptimalLandmarksPerDay = (budget, numberOfDays, landmarks) => {
  const budgetPerDay = budget / numberOfDays;
  const avgEntryCost = 200; // Average entry cost in INR
  const avgTransportCost = 100; // Average transport cost between landmarks
  const avgTotalCostPerLandmark = avgEntryCost + avgTransportCost;
  
  // Calculate max landmarks based on budget
  const maxLandmarksByBudget = Math.floor(budgetPerDay / avgTotalCostPerLandmark);
  
  // Calculate max landmarks based on time (assuming 8 AM to 7 PM = 11 hours)
  const availableHours = 11;
  const avgTimePerLandmark = 2; // 1.5 hours visit + 0.5 hours travel
  const maxLandmarksByTime = Math.floor(availableHours / avgTimePerLandmark);
  
  // Take the minimum and ensure at least 2 landmarks per day
  const optimalCount = Math.max(2, Math.min(maxLandmarksByBudget, maxLandmarksByTime, 6));
  
  return {
    optimalPerDay: optimalCount,
    maxByBudget: maxLandmarksByBudget,
    maxByTime: maxLandmarksByTime,
    budgetPerDay: budgetPerDay
  };
};

// Fetch enhanced landmarks with popularity data
const fetchEnhancedLandmarks = async (location, userLandmarks, tripDetails) => {
  try {
    // First, enhance user landmarks with real popularity data
    const enhancedUserLandmarks = await getEnhancedLandmarksData(userLandmarks, location);
    
    // Calculate how many additional landmarks we need
    const { optimalPerDay } = calculateOptimalLandmarksPerDay(
      tripDetails.budget, 
      tripDetails.numberOfDays, 
      enhancedUserLandmarks
    );
    
    const requiredCount = Math.max(0, (optimalPerDay * tripDetails.numberOfDays) - enhancedUserLandmarks.length);
    
    // If we don't need additional landmarks, return enhanced user landmarks
    if (requiredCount <= 0) {
      return enhancedUserLandmarks.map(l => ({ 
        ...l, 
        score: calculateLandmarkScore(l, tripDetails.preferences || {}),
      }));
    }

    // Fetch additional landmarks from OpenTripMap (your existing code)
    const apiKey = process.env.OPENTRIPMAP_API_KEY;
    if (!apiKey) {
      return enhancedUserLandmarks.map(l => ({ 
        ...l, 
        score: calculateLandmarkScore(l, tripDetails.preferences || {}),
      }));
    }

    const geocodeUrl = `https://api.opentripmap.com/0.1/en/places/geoname?name=${encodeURIComponent(location)}&apikey=${apiKey}`;
    const geoRes = await axios.get(geocodeUrl, { timeout: 10000 });
    const { lat, lon } = geoRes.data;

    const radius = 25000;
    const landmarkUrl = `https://api.opentripmap.com/0.1/en/places/radius?radius=${radius}&lon=${lon}&lat=${lat}&apikey=${apiKey}&limit=100&kinds=interesting_places,museums,monuments,architecture,historic,cultural,natural,amusements`;
    const landRes = await axios.get(landmarkUrl, { timeout: 15000 });

    const existing = new Set(enhancedUserLandmarks.map((l) => l.name?.toLowerCase()));
    const additionalLandmarks = [];

    // Process additional landmarks from OpenTripMap
    for (const feature of landRes.data.features) {
      const name = feature?.properties?.name;
      if (
        name &&
        name.length > 2 &&
        name !== 'Unknown Name' &&
        !existing.has(name.toLowerCase()) &&
        additionalLandmarks.length < requiredCount * 2
      ) {
        additionalLandmarks.push({
          name,
          latitude: feature.geometry.coordinates[1],
          longitude: feature.geometry.coordinates[0],
          description: feature.properties.kinds?.split(",")[0]?.replace("_", " ") || "Attraction",
          category: feature.properties.kinds?.split(",")[0] || "general",
          isAdditional: true,
        });
      }
    }

    // Enhance additional landmarks with real popularity data
    const enhancedAdditionalLandmarks = await getEnhancedLandmarksData(additionalLandmarks, location);
    
    // Calculate scores for all landmarks
    const allLandmarks = [...enhancedUserLandmarks, ...enhancedAdditionalLandmarks];
    const scoredLandmarks = allLandmarks.map(l => ({
      ...l,
      score: calculateLandmarkScore(l, tripDetails.preferences || {}),
      distanceFromCenter: calculateDistance(l.latitude, l.longitude, lat, lon),
    }));

    // Sort by score and take the best ones
    scoredLandmarks.sort((a, b) => b.score - a.score);
    const finalLandmarks = scoredLandmarks.slice(0, optimalPerDay * tripDetails.numberOfDays);

    logger.info(`Enhanced ${finalLandmarks.length} landmarks with real popularity data from multiple sources`);
    return finalLandmarks;

  } catch (err) {
    logger.warn("Failed to fetch enhanced landmarks:", err.message);
    // Fallback to user landmarks with default scores
    return userLandmarks.map(l => ({ 
      ...l, 
      popularity: 50,
      rating: 3.5,
      score: 50,
      source: 'fallback'
    }));
  }
};


// Create enhanced itinerary with dynamic scheduling
const createEnhancedItinerary = (clusters, budget, tripDetails) => {
  const { budgetPerDay } = calculateOptimalLandmarksPerDay(
    budget, 
    tripDetails.numberOfDays, 
    []
  );

  const days = clusters.map(cluster => {
    const schedule = [];
    let currentTime = 8; // Start at 8 AM
    let dayBudget = budgetPerDay;
    let totalCost = 0;

    const optimizedLandmarks = optimizeClusterRoute(cluster.landmarks);

    optimizedLandmarks.forEach((landmark, index) => {
      if (currentTime >= 19) return; // Stop scheduling after 7 PM

      // Calculate visit duration based on landmark type and popularity
      const baseDuration = 1.5;
      const popularityMultiplier = (landmark.popularity || 50) / 100;
      const duration = Math.max(1, baseDuration + (popularityMultiplier * 0.5));
      
      // Calculate costs
      const entryCost = Math.floor(50 + (landmark.popularity || 50) * 4); // 50-450 INR
      const transportCost = index > 0 ? Math.floor(50 + Math.random() * 150) : 0; // 50-200 INR

      if (totalCost + entryCost + transportCost <= dayBudget && currentTime + duration <= 19) {
        // Add travel time if not first landmark
        if (index > 0) {
          const travelHour = Math.floor(currentTime);
          const travelMinute = Math.floor((currentTime % 1) * 60);
          const travelTimeStr = `${travelHour}:${travelMinute.toString().padStart(2, '0')} ${travelHour >= 12 ? 'PM' : 'AM'}`;
          
          schedule.push({
            time: travelTimeStr,
            activity: `Travel to ${landmark.name}`,
            location: "En route",
            duration: "30 minutes",
            cost: transportCost,
            costType: "transport",
            tips: "Use app-based cabs or local transport for better rates"
          });

          currentTime += 0.5;
          totalCost += transportCost;
        }

        // Add visit activity
        const visitHour = Math.floor(currentTime);
        const visitMinute = Math.floor((currentTime % 1) * 60);
        const visitTimeStr = `${visitHour}:${visitMinute.toString().padStart(2, '0')} ${visitHour >= 12 ? 'PM' : 'AM'}`;
        
        schedule.push({
          time: visitTimeStr,
          activity: `Visit ${landmark.name}`,
          location: landmark.name,
          duration: `${Math.floor(duration)} hours ${Math.floor((duration % 1) * 60)} minutes`,
          cost: entryCost,
          costType: "entry",
          popularity: Math.round(landmark.popularity || 50),
          rating: (landmark.rating || 3.5).toFixed(1),
          tips: `${landmark.description || 'Popular attraction'}. Popularity Score: ${Math.round(landmark.score || 50)}/100`,
          landmark: {
            name: landmark.name,
            latitude: landmark.latitude,
            longitude: landmark.longitude,
            description: landmark.description
          }
        });

        currentTime += duration;
        totalCost += entryCost;
      }
    });

    // Add lunch break if schedule is long enough
    if (schedule.length > 2 && currentTime < 17) {
      const lunchHour = Math.floor(13);
      const lunchTimeStr = `${lunchHour}:00 PM`;
      
      schedule.splice(Math.ceil(schedule.length / 2), 0, {
        time: lunchTimeStr,
        activity: "Lunch Break",
        location: "Local restaurant",
        duration: "1 hour",
        cost: 0,
        costType: "meal",
        tips: "Try local cuisine - budget not included, explore street food"
      });
    }

    return {
      day: cluster.day,
      date: `Day ${cluster.day}`,
      schedule,
      dayBudget: budgetPerDay,
      actualCost: totalCost,
      savedAmount: budgetPerDay - totalCost,
      landmarkCount: optimizedLandmarks.length
    };
  });

  return {
    itinerary: { days },
    budgetBreakdown: {
      transport: Math.floor(budget * 0.35),
      attractions: Math.floor(budget * 0.65),
      total: budget,
      dailyAverage: Math.floor(budget / tripDetails.numberOfDays)
    },
    tips: [
      "Book tickets online for popular attractions to avoid queues",
      "Use app-based transport for transparent pricing",
      "Visit popular landmarks early morning or late afternoon",
      "Carry cash as many places don't accept cards",
      "Download offline maps and translation apps",
      "Check landmark ratings and popularity before visiting"
    ]
  };
};

// Enhanced AI prompt with popularity and ML insights
const generateEnhancedAIItinerary = async (clusters, tripDetails, mlMetrics) => {
  const { location, numberOfDays, budget } = tripDetails;
  
  const clusterInfo = clusters.map(cluster => ({
    day: cluster.day,
    landmarks: cluster.landmarks.map(l => ({
      name: l.name,
      popularity: Math.round(l.popularity || 50),
      score: Math.round(l.score || 50),
      rating: (l.rating || 3.5).toFixed(1)
    }))
  }));

  const prompt = `Create a detailed ${numberOfDays}-day travel itinerary for ${location}, India with budget ₹${budget} INR.

LANDMARK CLUSTERS (Generated using K-means ML algorithm):
${JSON.stringify(clusterInfo, null, 2)}

ML INSIGHTS:
- Clustering Quality Score: ${(mlMetrics?.silhouette_score || 0.5).toFixed(2)}
- Landmarks grouped by geographical proximity and popularity
- High-popularity landmarks prioritized in scheduling

OPTIMIZATION REQUIREMENTS:
- Schedule based on landmark popularity and ratings
- Ensure full day utilization (8 AM to 7 PM)
- Dynamic visit durations based on popularity scores
- Include travel time between locations within clusters
- Budget distribution: 35% transport, 65% attractions

Return ONLY valid JSON in this exact format:
{
  "itinerary": {
    "days": [
      {
        "day": 1,
        "date": "Day 1",
        "schedule": [
          {
            "time": "8:00 AM",
            "activity": "Visit [Landmark Name]",
            "location": "[Landmark Name]",
            "duration": "2 hours",
            "cost": 250,
            "costType": "entry",
            "popularity": 85,
            "rating": "4.2",
            "tips": "Best time to visit, why it's popular"
          }
        ]
      }
    ]
  },
  "budgetBreakdown": {
    "transport": ${Math.floor(budget * 0.35)},
    "attractions": ${Math.floor(budget * 0.65)},
    "total": ${budget},
    "dailyAverage": ${Math.floor(budget / numberOfDays)}
  },
  "tips": [
    "ML-optimized travel tips based on clustering analysis"
  ]
}

Use realistic Indian prices and ensure full day coverage.`;

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 5000,
      }
    });
    
    logger.info("Generating enhanced AI itinerary with ML insights...");
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, "").trim();
    
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}") + 1;
    
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      const jsonStr = text.substring(jsonStart, jsonEnd);
      const parsed = JSON.parse(jsonStr);
      
      if (parsed.itinerary && parsed.itinerary.days && Array.isArray(parsed.itinerary.days)) {
        logger.info("Enhanced AI itinerary generated successfully");
        return parsed;
      }
    }
    
    throw new Error("Invalid JSON structure from AI");
  } catch (error) {
    logger.warn("Enhanced AI itinerary generation failed:", error.message);
    return null;
  }
};

// Main controller
// Main controller - Modified to include optimized landmarks in response
const generateItinerary = async (req, res) => {
  try {
    const { landmarks, tripDetails } = req.body;
    
    // Enhanced validation
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

    logger.info(`Generating enhanced itinerary: ${landmarks.length} landmarks, ${tripDetails.numberOfDays} days, budget ₹${tripDetails.budget}`);

    // Get optimal landmarks calculation
    const landmarkMetrics = calculateOptimalLandmarksPerDay(
      tripDetails.budget, 
      tripDetails.numberOfDays, 
      landmarks
    );

    // Fetch and enhance landmarks with popularity scoring
    const enhancedLandmarks = await fetchEnhancedLandmarks(
      tripDetails.location, 
      landmarks.filter(l => l.name && l.latitude && l.longitude),
      tripDetails
    );

    if (enhancedLandmarks.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid landmarks with coordinates found"
      });
    }

    // Apply ML clustering
    logger.info("Applying K-means clustering for optimal grouping...");
    let clusters;
    try {
      const clusteringResult = await runKMeansClustering(enhancedLandmarks, tripDetails.numberOfDays);
      clusters = clusteringResult || fallbackClustering(enhancedLandmarks, tripDetails.numberOfDays);
    } catch (clusteringError) {
      logger.error("Clustering failed, using fallback:", clusteringError.message);
      clusters = fallbackClustering(enhancedLandmarks, tripDetails.numberOfDays);
    }

    // NEW: Create optimized landmarks array from all clusters
    const optimizedLandmarks = [];
    const optimizedLandmarksByDay = {};
    
    clusters.clusters.forEach(cluster => {
      // Optimize route within each cluster
      const optimizedClusterLandmarks = optimizeClusterRoute(cluster.landmarks);
      
      // Add to overall optimized landmarks array
      optimizedLandmarks.push(...optimizedClusterLandmarks);
      
      // Group by day for easier access
      optimizedLandmarksByDay[`day${cluster.day}`] = optimizedClusterLandmarks.map((landmark, index) => ({
        ...landmark,
        dayOrder: index + 1,
        clusterDay: cluster.day,
        estimatedTravelTime: index > 0 ? calculateTravelTime(
          optimizedClusterLandmarks[index - 1],
          landmark
        ) : 0
      }));
    });

    // Generate enhanced itinerary
    const aiItinerary = await generateEnhancedAIItinerary(
      clusters.clusters, 
      tripDetails, 
      { silhouette_score: clusters.silhouette_score }
    );
    
    const finalItinerary = aiItinerary || createEnhancedItinerary(
      clusters.clusters, 
      tripDetails.budget, 
      tripDetails
    );

    // Calculate comprehensive metrics
    let totalDistance = 0;
    clusters.clusters.forEach(cluster => {
      for (let i = 1; i < cluster.landmarks.length; i++) {
        totalDistance += calculateDistance(
          cluster.landmarks[i-1].latitude,
          cluster.landmarks[i-1].longitude,
          cluster.landmarks[i].latitude,
          cluster.landmarks[i].longitude
        );
      }
    });

    const response = {
      success: true,
      data: {
        ...finalItinerary,
        // NEW: Add optimized landmarks to response
        optimizedLandmarks: optimizedLandmarks,
        optimizedLandmarksByDay: optimizedLandmarksByDay,
        landmarkSummary: {
          totalLandmarks: optimizedLandmarks.length,
          originalLandmarks: landmarks.length,
          enhancedLandmarks: enhancedLandmarks.length,
          addedLandmarks: enhancedLandmarks.length - landmarks.length,
          landmarksByDay: Object.keys(optimizedLandmarksByDay).reduce((acc, day) => {
            acc[day] = optimizedLandmarksByDay[day].length;
            return acc;
          }, {}),
          averagePopularity: (optimizedLandmarks.reduce((sum, l) => sum + (l.popularity || 50), 0) / optimizedLandmarks.length).toFixed(1),
          averageScore: (optimizedLandmarks.reduce((sum, l) => sum + (l.score || 50), 0) / optimizedLandmarks.length).toFixed(1)
        },
        mlAnalysis: {
          clusteringMethod: "K-means",
          clusteringQuality: (clusters.silhouette_score || 0.5).toFixed(3),
          landmarkOptimization: landmarkMetrics,
          popularityBasedSelection: true,
          clusters: clusters.clusters.map(c => ({
            day: c.day,
            landmarkCount: c.landmarks.length,
            avgPopularity: (c.landmarks.reduce((sum, l) => sum + (l.popularity || 50), 0) / c.landmarks.length).toFixed(1),
            avgScore: (c.landmarks.reduce((sum, l) => sum + (l.score || 50), 0) / c.landmarks.length).toFixed(1)
          }))
        },
        routeOptimization: {
          totalDistance: +totalDistance.toFixed(2),
          averageDistancePerDay: +(totalDistance / tripDetails.numberOfDays).toFixed(2),
          optimizationMethod: "Nearest neighbor within ML clusters"
        },
        tripSummary: {
          location: tripDetails.location,
          numberOfDays: tripDetails.numberOfDays,
          budget: `₹${tripDetails.budget}`,
          totalLandmarks: enhancedLandmarks.length,
          avgLandmarksPerDay: Math.round(enhancedLandmarks.length / tripDetails.numberOfDays),
          highPopularityLandmarks: enhancedLandmarks.filter(l => (l.popularity || 50) > 70).length,
          generatedAt: new Date().toISOString(),
          mlEnhanced: true
        },
      },
    };

    logger.info("Enhanced ML-based itinerary generated successfully");
    res.json(response);
    
  } catch (err) {
    logger.error("Error generating enhanced itinerary:", err);
    res.status(500).json({
      success: false,
      message: "Error generating itinerary",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Helper function to calculate estimated travel time between landmarks
const calculateTravelTime = (fromLandmark, toLandmark) => {
  const distance = calculateDistance(
    fromLandmark.latitude,
    fromLandmark.longitude,
    toLandmark.latitude,
    toLandmark.longitude
  );
  
  // Estimate travel time based on distance (assuming average speed of 30 km/h in city)
  const timeInHours = distance / 30;
  const timeInMinutes = Math.round(timeInHours * 60);
  
  return {
    distanceKm: +distance.toFixed(2),
    estimatedMinutes: timeInMinutes,
    estimatedHours: +(timeInHours).toFixed(2)
  };
};

module.exports = {
  generateItinerary,
};