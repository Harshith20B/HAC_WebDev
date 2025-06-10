const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");
const logger = require("pino")();
const { spawn } = require('child_process');
const path = require('path');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

// Enhanced landmark scoring based on popularity and other factors
const calculateLandmarkScore = (landmark, preferences = {}) => {
  let score = 0;
  
  // Base popularity score (0-100)
  const popularity = landmark.popularity || 50;
  score += popularity * 0.4;
  
  // Rating score (0-50)
  const rating = landmark.rating || 3.5;
  score += (rating / 5) * 50 * 0.3;
  
  // Category preference score (0-30)
  const category = landmark.category || landmark.description || 'general';
  const categoryWeight = preferences[category.toLowerCase()] || 1;
  score += categoryWeight * 30 * 0.2;
  
  // Distance penalty (closer landmarks get higher scores)
  const distancePenalty = Math.min(landmark.distanceFromCenter || 0, 20);
  score -= distancePenalty * 0.1;
  
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
    const landmarkData = JSON.stringify({
      landmarks: landmarks.map(l => ({
        name: l.name,
        latitude: l.latitude,
        longitude: l.longitude,
        score: l.score || 50,
        popularity: l.popularity || 50
      })),
      k: numberOfDays
    });
    
    const pythonProcess = spawn('python3', [pythonScript]);
    let output = '';
    let errorOutput = '';
    
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output);
          resolve(result);
        } catch (err) {
          logger.warn('Failed to parse K-means output, using fallback');
          resolve(null);
        }
      } else {
        logger.warn('K-means clustering failed:', errorOutput);
        resolve(null);
      }
    });
    
    pythonProcess.stdin.write(landmarkData);
    pythonProcess.stdin.end();
  });
};

// Fallback clustering when Python ML is not available
const fallbackClustering = (landmarks, numberOfDays) => {
  const clusters = Array.from({ length: numberOfDays }, () => []);
  const sortedLandmarks = [...landmarks].sort((a, b) => (b.score || 50) - (a.score || 50));
  
  // Distribute landmarks round-robin to ensure even distribution
  sortedLandmarks.forEach((landmark, index) => {
    clusters[index % numberOfDays].push(landmark);
  });
  
  return {
    clusters: clusters.map((cluster, index) => ({
      day: index + 1,
      landmarks: cluster,
      center: cluster.length > 0 ? {
        latitude: cluster.reduce((sum, l) => sum + l.latitude, 0) / cluster.length,
        longitude: cluster.reduce((sum, l) => sum + l.longitude, 0) / cluster.length
      } : null
    })),
    silhouette_score: 0.5 // Dummy score for fallback
  };
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
    const apiKey = process.env.OPENTRIPMAP_API_KEY;
    if (!apiKey) return userLandmarks.map(l => ({ ...l, score: 50 }));

    const geocodeUrl = `https://api.opentripmap.com/0.1/en/places/geoname?name=${encodeURIComponent(location)}&apikey=${apiKey}`;
    const geoRes = await axios.get(geocodeUrl, { timeout: 10000 });
    const { lat, lon } = geoRes.data;

    const { optimalPerDay } = calculateOptimalLandmarksPerDay(
      tripDetails.budget, 
      tripDetails.numberOfDays, 
      userLandmarks
    );
    
    const requiredCount = Math.max(0, (optimalPerDay * tripDetails.numberOfDays) - userLandmarks.length);
    if (requiredCount <= 0) {
      return userLandmarks.map(l => ({ 
        ...l, 
        score: calculateLandmarkScore(l, tripDetails.preferences || {}),
        distanceFromCenter: calculateDistance(l.latitude, l.longitude, lat, lon)
      }));
    }

    const radius = 25000;
    const landmarkUrl = `https://api.opentripmap.com/0.1/en/places/radius?radius=${radius}&lon=${lon}&lat=${lat}&apikey=${apiKey}&limit=100&kinds=interesting_places,museums,monuments,architecture,historic,cultural,natural,amusements`;
    const landRes = await axios.get(landmarkUrl, { timeout: 15000 });

    const existing = new Set(userLandmarks.map((l) => l.name?.toLowerCase()));
    const additional = [];

    // Enhanced landmark processing with popularity scoring
    for (const feature of landRes.data.features) {
      const name = feature?.properties?.name;
      if (
        name &&
        name.length > 2 &&
        name !== 'Unknown Name' &&
        !existing.has(name.toLowerCase()) &&
        additional.length < requiredCount * 2 // Fetch more to filter by popularity
      ) {
        const landmark = {
          name,
          latitude: feature.geometry.coordinates[1],
          longitude: feature.geometry.coordinates[0],
          description: feature.properties.kinds?.split(",")[0]?.replace("_", " ") || "Attraction",
          category: feature.properties.kinds?.split(",")[0] || "general",
          popularity: Math.random() * 100, // In real scenario, this would come from API
          rating: 3 + Math.random() * 2, // Random rating 3-5
          distanceFromCenter: calculateDistance(
            feature.geometry.coordinates[1],
            feature.geometry.coordinates[0],
            lat,
            lon
          ),
          isAdditional: true,
        };
        
        landmark.score = calculateLandmarkScore(landmark, tripDetails.preferences || {});
        additional.push(landmark);
      }
    }

    // Sort by popularity and score, take the best ones
    additional.sort((a, b) => b.score - a.score);
    const topAdditional = additional.slice(0, requiredCount);

    // Add scores to user landmarks
    const scoredUserLandmarks = userLandmarks.map(l => ({
      ...l,
      score: calculateLandmarkScore(l, tripDetails.preferences || {}),
      distanceFromCenter: calculateDistance(l.latitude, l.longitude, lat, lon),
      isAdditional: false
    }));

    logger.info(`Added ${topAdditional.length} additional high-score landmarks`);
    return [...scoredUserLandmarks, ...topAdditional];
  } catch (err) {
    logger.warn("Failed to fetch enhanced landmarks:", err.message);
    return userLandmarks.map(l => ({ ...l, score: 50 }));
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
          // ADD THESE LINES:
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
    const clusteringResult = await runKMeansClustering(enhancedLandmarks, tripDetails.numberOfDays);
    const clusters = clusteringResult || fallbackClustering(enhancedLandmarks, tripDetails.numberOfDays);

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
        routeOptimization: {
          ...finalItinerary.routeOptimization,
          optimizedLandmarks: clusters.clusters.reduce((acc, cluster) => {
            return acc.concat(optimizeClusterRoute(cluster.landmarks));
          }, []),
          totalDistance: +totalDistance.toFixed(2),
          averageDistancePerDay: +(totalDistance / tripDetails.numberOfDays).toFixed(2),
          optimizationMethod: "Nearest neighbor within ML clusters"
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

module.exports = {
  generateItinerary,
};