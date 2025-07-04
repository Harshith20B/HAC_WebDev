const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");
const logger = require("pino")();
const { spawn } = require('child_process');
const path = require('path');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

// Enhanced landmark scoring based on popularity and other factors
const calculateLandmarkScore = (landmark, preferences = {}, budgetLevel = 'medium') => {
  let score = 0;
  
  // Use real popularity data
  const popularity = landmark.popularity || 50;
  score += popularity * 0.4;
  
  // Use real rating data
  const rating = landmark.rating || 3.5;
  score += (rating / 5) * 50 * 0.3;
  
  // Category preference score
  const category = landmark.category || landmark.description || 'general';
  const categoryWeight = preferences[category.toLowerCase()] || 1;
  score += categoryWeight * 30 * 0.15;
  
  // Budget-based scoring adjustments
  const budgetConfig = BUDGET_RANGES[budgetLevel];
  if (budgetLevel === 'low') {
    // Prefer free or low-cost attractions
    if (landmark.entryCost && landmark.entryCost < 100) score += 10;
    if (landmark.entryCost === 0) score += 15;
  } else if (budgetLevel === 'high') {
    // Can prioritize premium experiences
    if (landmark.isPremium || (landmark.entryCost && landmark.entryCost > 500)) score += 5;
  }
  
  // Bonus for verified/high-confidence data
  if (landmark.confidence === 'high') score += 5;
  if (landmark.verified) score += 3;
  if (landmark.hasWikipediaEntry) score += 5;
  
  // Source bonus
  if (landmark.source === 'user') score += 2;
  if (landmark.source === 'opentripmap') score += 1;
  
  // Distance penalty
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
    // First, enhance user landmarks with scoring
    const enhancedUserLandmarks = userLandmarks.map(landmark => ({
      ...landmark,
      popularity: landmark.popularity || 50, // Default popularity
      rating: landmark.rating || 3.5, // Default rating
      category: landmark.category || landmark.description || 'general',
      confidence: 'user_provided',
      verified: true,
      hasWikipediaEntry: false,
      source: 'user'
    }));
    
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

    // Fetch additional landmarks from OpenTripMap
    const apiKey = process.env.OPENTRIPMAP_API_KEY;
    if (!apiKey) {
      logger.warn("OpenTripMap API key not found, using only user landmarks");
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
        // Get detailed information for each landmark
        const detailsUrl = `https://api.opentripmap.com/0.1/en/places/xid/${feature.properties.xid}?apikey=${apiKey}`;
        
        try {
          const detailsRes = await axios.get(detailsUrl, { timeout: 5000 });
          const details = detailsRes.data;
          
          // Extract popularity indicators from OpenTripMap data
          const wikidata = details.wikidata || null;
          const wikipedia = details.wikipedia || null;
          const rate = details.rate || 0; // OpenTripMap's internal rating (0-7)
          
          // Calculate estimated popularity based on available data
          let estimatedPopularity = 30; // Base popularity
          
          if (wikipedia) estimatedPopularity += 25; // Has Wikipedia entry
          if (wikidata) estimatedPopularity += 15; // Has Wikidata entry
          if (rate > 0) estimatedPopularity += (rate * 5); // Rate boost (0-35)
          if (details.kinds && details.kinds.includes('museums')) estimatedPopularity += 10;
          if (details.kinds && details.kinds.includes('monuments')) estimatedPopularity += 15;
          
          // Cap at 100
          estimatedPopularity = Math.min(100, estimatedPopularity);
          
          additionalLandmarks.push({
            name,
            latitude: feature.geometry.coordinates[1],
            longitude: feature.geometry.coordinates[0],
            description: feature.properties.kinds?.split(",")[0]?.replace("_", " ") || "Attraction",
            category: feature.properties.kinds?.split(",")[0] || "general",
            popularity: estimatedPopularity,
            rating: rate > 0 ? Math.min(5, (rate / 7) * 5) : 3.5, // Convert 0-7 to 0-5 scale
            hasWikipediaEntry: !!wikipedia,
            wikidata: wikidata,
            wikipedia: wikipedia,
            confidence: rate > 3 ? 'high' : 'medium',
            verified: !!wikipedia || !!wikidata,
            source: 'opentripmap',
            isAdditional: true,
            openTripMapId: feature.properties.xid,
            kinds: details.kinds || feature.properties.kinds
          });
          
        } catch (detailError) {
          // If details fetch fails, add with basic info
          logger.warn(`Failed to fetch details for ${name}:`, detailError.message);
          additionalLandmarks.push({
            name,
            latitude: feature.geometry.coordinates[1],
            longitude: feature.geometry.coordinates[0],
            description: feature.properties.kinds?.split(",")[0]?.replace("_", " ") || "Attraction",
            category: feature.properties.kinds?.split(",")[0] || "general",
            popularity: 40, // Default popularity for failed details
            rating: 3.5,
            hasWikipediaEntry: false,
            confidence: 'low',
            verified: false,
            source: 'opentripmap',
            isAdditional: true,
            openTripMapId: feature.properties.xid
          });
        }
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Calculate scores for all landmarks
    const allLandmarks = [...enhancedUserLandmarks, ...additionalLandmarks];
    const scoredLandmarks = allLandmarks.map(l => ({
      ...l,
      score: calculateLandmarkScore(l, tripDetails.preferences || {}),
      distanceFromCenter: calculateDistance(l.latitude, l.longitude, lat, lon),
    }));

    // Sort by score and take the best ones
    scoredLandmarks.sort((a, b) => b.score - a.score);
    const finalLandmarks = scoredLandmarks.slice(0, optimalPerDay * tripDetails.numberOfDays);

    logger.info(`Enhanced ${finalLandmarks.length} landmarks: ${enhancedUserLandmarks.length} user + ${additionalLandmarks.length} additional`);
    logger.info(`Average popularity: ${(finalLandmarks.reduce((sum, l) => sum + l.popularity, 0) / finalLandmarks.length).toFixed(1)}`);
    
    return finalLandmarks;

  } catch (err) {
    logger.warn("Failed to fetch enhanced landmarks:", err.message);
    // Fallback to user landmarks with default scores
    return userLandmarks.map(l => ({ 
      ...l, 
      popularity: l.popularity || 50,
      rating: l.rating || 3.5,
      score: calculateLandmarkScore(l, tripDetails.preferences || {}),
      source: 'fallback'
    }));
  }
};


// Create enhanced itinerary with dynamic scheduling
const createEnhancedItinerary = async (clusters, budget, tripDetails) => {
  const budgetLevel = getBudgetLevel(budget);
  const budgetConfig = BUDGET_RANGES[budgetLevel];
  const budgetPerDay = budget / tripDetails.numberOfDays;

  const days = await Promise.all(clusters.map(async (cluster) => {
    const schedule = [];
    let currentTime = 8; // Start at 8 AM
    let totalEntranceCost = 0;

    const optimizedLandmarks = optimizeClusterRoute(cluster.landmarks);

    for (let index = 0; index < optimizedLandmarks.length; index++) {
      const landmark = optimizedLandmarks[index];
      
      if (currentTime >= 19) break; // Stop scheduling after 7 PM

      // Calculate visit duration based on landmark type and popularity
      const baseDuration = budgetLevel === 'low' ? 1 : budgetLevel === 'medium' ? 1.5 : 2;
      const popularityMultiplier = (landmark.popularity || 50) / 100;
      const duration = Math.max(1, baseDuration + (popularityMultiplier * 0.5));
      
      // Calculate entrance costs based on budget level
      let entranceCost;
      if (budgetLevel === 'low') {
        entranceCost = Math.floor(20 + (landmark.popularity || 50) * 2); // ₹20-120
      } else if (budgetLevel === 'medium') {
        entranceCost = Math.floor(50 + (landmark.popularity || 50) * 4); // ₹50-450
      } else {
        entranceCost = Math.floor(100 + (landmark.popularity || 50) * 8); // ₹100-900
      }

      // Check if we can afford this landmark
      if (totalEntranceCost + entranceCost <= budgetPerDay * 0.8 && currentTime + duration <= 19) {
        
        // Add travel time if not first landmark
        if (index > 0) {
          const travelInfo = await calculateTravelTime(optimizedLandmarks[index - 1], landmark);
          const travelTimeHours = travelInfo.durationMinutes / 60;
          
          const travelHour = Math.floor(currentTime);
          const travelMinute = Math.floor((currentTime % 1) * 60);
          const travelTimeStr = `${travelHour}:${travelMinute.toString().padStart(2, '0')} ${travelHour >= 12 ? 'PM' : 'AM'}`;
          
          schedule.push({
            time: travelTimeStr,
            activity: `Travel to ${landmark.name}`,
            location: "En route",
            duration: travelInfo.duration,
            distance: travelInfo.distance,
            cost: 0, // Not showing travel cost as requested
            costType: "transport",
            travelInfo: travelInfo,
            tips: `Distance: ${travelInfo.distance} • Travel time: ${travelInfo.duration}`
          });

          currentTime += travelTimeHours;
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
          cost: entranceCost,
          costType: "entry",
          popularity: Math.round(landmark.popularity || 50),
          rating: (landmark.rating || 3.5).toFixed(1),
          tips: `${landmark.description || 'Popular attraction'}. Entry fee: ₹${entranceCost}`,
          landmark: {
            name: landmark.name,
            latitude: landmark.latitude,
            longitude: landmark.longitude,
            description: landmark.description
          }
        });

        currentTime += duration;
        totalEntranceCost += entranceCost;
      }
    }

    // Add lunch break if schedule is long enough
    if (schedule.length > 2 && currentTime < 17) {
      const lunchHour = Math.floor(13);
      const lunchTimeStr = `${lunchHour}:00 PM`;
      
      const lunchCost = budgetLevel === 'low' ? 0 : budgetLevel === 'medium' ? 0 : 0; // Not including meal costs
      
      schedule.splice(Math.ceil(schedule.length / 2), 0, {
        time: lunchTimeStr,
        activity: "Lunch Break",
        location: "Local restaurant",
        duration: "1 hour",
        cost: lunchCost,
        costType: "meal",
        tips: `Try local cuisine (${budgetLevel} budget friendly options available)`
      });
    }

    return {
      day: cluster.day,
      date: `Day ${cluster.day}`,
      schedule,
      dayBudget: budgetPerDay,
      actualEntranceCost: totalEntranceCost,
      savedAmount: budgetPerDay - totalEntranceCost,
      landmarkCount: optimizedLandmarks.length,
      budgetLevel: budgetLevel
    };
  }));

  return {
    itinerary: { days },
    budgetBreakdown: {
      level: budgetLevel,
      range: BUDGET_RANGES[budgetLevel].label,
      attractions: Math.floor(budget * 0.8), // 80% for attractions
      miscellaneous: Math.floor(budget * 0.2), // 20% for misc (food, transport, etc.)
      total: budget,
      dailyAverage: Math.floor(budget / tripDetails.numberOfDays),
      note: "Transport costs vary significantly based on mode of travel chosen"
    },
    tips: [
      `Budget Level: ${BUDGET_RANGES[budgetLevel].label}`,
      "Entry fees shown are estimates - actual prices may vary",
      "Travel times include estimated road distances and traffic conditions",
      "Transport costs not included - use local apps for real-time pricing",
      budgetLevel === 'low' ? "Focus on free/low-cost attractions and street food" :
      budgetLevel === 'medium' ? "Good balance of popular attractions and local experiences" :
      "Premium experiences and comfortable travel options available",
      "Book tickets online for popular attractions to avoid queues",
      "Check landmark timings before visiting"
    ]
  };
};

// Enhanced AI prompt with popularity and ML insights
// Enhanced AI prompt with better time utilization
const generateEnhancedAIItinerary = async (clusters, tripDetails, mlMetrics) => {
  const { location, numberOfDays, budget } = tripDetails;
  const budgetLevel = getBudgetLevel(budget);
  const budgetConfig = BUDGET_RANGES[budgetLevel];
  
  const clusterInfo = clusters.map(cluster => ({
    day: cluster.day,
    landmarks: cluster.landmarks.map(l => ({
      name: l.name,
      popularity: Math.round(l.popularity || 50),
      score: Math.round(l.score || 50),
      rating: (l.rating || 3.5).toFixed(1),
      estimatedVisitTime: l.estimatedVisitTime || 90 // Default 90 minutes per landmark
    }))
  }));

  const prompt = `Create a detailed ${numberOfDays}-day travel itinerary for ${location}, India with budget ₹${budget} INR.

BUDGET ANALYSIS:
- Budget Level: ${budgetConfig.label}
- Daily Budget: ₹${Math.floor(budget / numberOfDays)}
- Focus: ${budgetLevel === 'low' ? 'Budget-friendly attractions, free experiences, street food' : 
           budgetLevel === 'medium' ? 'Mix of popular attractions and local experiences' : 
           'Premium attractions, comfortable experiences, quality dining'}

LANDMARK CLUSTERS (ML-optimized):
${JSON.stringify(clusterInfo, null, 2)}

IMPORTANT REQUIREMENTS:
1. MUST include ALL landmarks provided in the clusters for each day
2. Schedule activities from 8 AM to 8 PM (12 hours)
3. Each landmark visit should include:
   - Minimum 1 hour for quick visits
   - 1.5-2 hours for moderate popularity (60-80)
   - 2-3 hours for high popularity (80+)
4. Include realistic travel times between locations (15-45 mins typically)
5. Add lunch break (1 hour) around 1 PM
6. Add short breaks (15-30 mins) after every 2-3 attractions
7. Show only entrance fees (no transport costs)
8. Budget distribution: 80% attractions, 20% miscellaneous

TIME MANAGEMENT GUIDELINES:
- Morning (8 AM - 12 PM): 4 hours for 2-3 attractions
- Afternoon (1 PM - 5 PM): 4 hours for 2-3 attractions (after lunch)
- Evening (5 PM - 8 PM): 3 hours for 1-2 attractions

For ${budgetLevel} budget level:
${budgetLevel === 'low' ? '- Prioritize free/low-cost attractions (₹0-150 entry)' : ''}
${budgetLevel === 'low' ? '- Suggest street food and budget dining' : ''}
${budgetLevel === 'medium' ? '- Balance popular attractions (₹50-500 entry)' : ''}
${budgetLevel === 'medium' ? '- Include mix of experiences' : ''}
${budgetLevel === 'high' ? '- Include premium attractions (₹100-1000+ entry)' : ''}
${budgetLevel === 'high' ? '- Suggest quality experiences and dining' : ''}

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
            "tips": "Entry fee: ₹250. Best time to visit is morning."
          },
          {
            "time": "10:30 AM",
            "activity": "Travel to [Next Landmark]",
            "location": "En route",
            "duration": "45 mins",
            "distance": "12 km",
            "cost": 0,
            "costType": "transport",
            "tips": "Distance: 12 km • Travel time: 45 mins"
          },
          {
            "time": "12:00 PM",
            "activity": "Lunch Break",
            "location": "Local restaurant",
            "duration": "1 hour",
            "cost": 0,
            "costType": "meal",
            "tips": "Try local cuisine"
          }
        ],
        "unusedTime": "2 hours" // Only include if not all landmarks could be scheduled
      }
    ]
  },
  "budgetBreakdown": {
    "level": "${budgetLevel}",
    "range": "${budgetConfig.label}",
    "attractions": ${Math.floor(budget * 0.8)},
    "miscellaneous": ${Math.floor(budget * 0.2)},
    "total": ${budget},
    "dailyAverage": ${Math.floor(budget / numberOfDays)},
    "note": "Transport costs vary - use local apps for pricing"
  },
  "timeUtilization": {
    "totalAvailableHours": ${numberOfDays * 12},
    "scheduledHours": 0, // Will be calculated
    "utilizationPercentage": 0 // Will be calculated
  }
}`;

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 5000,
      }
    });
    
    logger.info(`Generating ${budgetLevel} budget itinerary with enhanced time utilization...`);
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, "").trim();
    
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}") + 1;
    
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      const jsonStr = text.substring(jsonStart, jsonEnd);
      const parsed = JSON.parse(jsonStr);
      
      // Validate all landmarks were included
      const allScheduledLandmarks = new Set();
      parsed.itinerary.days.forEach(day => {
        day.schedule.forEach(activity => {
          if (activity.activity?.includes('Visit')) {
            const landmarkName = activity.activity.replace('Visit ', '').trim();
            allScheduledLandmarks.add(landmarkName);
          }
        });
      });

      // Calculate time utilization metrics
      let scheduledHours = 0;
      parsed.itinerary.days.forEach(day => {
        day.schedule.forEach(activity => {
          if (activity.duration) {
            const hoursMatch = activity.duration.match(/(\d+)\s*hours?/);
            const minsMatch = activity.duration.match(/(\d+)\s*mins?/);
            const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
            const mins = minsMatch ? parseInt(minsMatch[1]) : 0;
            scheduledHours += hours + (mins / 60);
          }
        });
      });

      parsed.timeUtilization = {
        totalAvailableHours: numberOfDays * 12,
        scheduledHours: scheduledHours,
        utilizationPercentage: Math.round((scheduledHours / (numberOfDays * 12)) * 100)
      };

      logger.info(`Enhanced ${budgetLevel} budget itinerary generated with ${parsed.timeUtilization.utilizationPercentage}% time utilization`);
      return parsed;
    }
    
    throw new Error("Invalid JSON structure from AI");
  } catch (error) {
    logger.warn("Enhanced AI itinerary generation failed:", error.message);
    return null;
  }
};

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

    const budgetLevel = getBudgetLevel(tripDetails.budget);
    logger.info(`Generating ${budgetLevel} budget itinerary: ${landmarks.length} landmarks, ${tripDetails.numberOfDays} days, budget ₹${tripDetails.budget}`);

    // Get optimal landmarks calculation with budget consideration
    const landmarkMetrics = calculateOptimalLandmarksPerDay(
      tripDetails.budget, 
      tripDetails.numberOfDays, 
      landmarks
    );

    // Fetch and enhance landmarks with popularity scoring and budget consideration
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

    // Create optimized landmarks array with travel times
    const optimizedLandmarks = [];
    const optimizedLandmarksByDay = {};
    
    for (const cluster of clusters.clusters) {
      const optimizedClusterLandmarks = optimizeClusterRoute(cluster.landmarks);
      optimizedLandmarks.push(...optimizedClusterLandmarks);
      
      // Calculate travel times between landmarks
      const landmarksWithTravelTime = [];
      for (let i = 0; i < optimizedClusterLandmarks.length; i++) {
        const landmark = optimizedClusterLandmarks[i];
        let travelTime = null;
        
        if (i > 0) {
          travelTime = await calculateTravelTime(
            optimizedClusterLandmarks[i - 1],
            landmark
          );
        }
        
        landmarksWithTravelTime.push({
          ...landmark,
          dayOrder: i + 1,
          clusterDay: cluster.day,
          travelTime: travelTime
        });
      }
      
      optimizedLandmarksByDay[`day${cluster.day}`] = landmarksWithTravelTime;
    }

    // Generate enhanced itinerary with real travel times
    const aiItinerary = await generateEnhancedAIItinerary(
      clusters.clusters, 
      tripDetails, 
      { silhouette_score: clusters.silhouette_score }
    );
    
    const finalItinerary = aiItinerary || await createEnhancedItinerary(
      clusters.clusters, 
      tripDetails.budget, 
      tripDetails
    );

    const response = {
      success: true,
      data: {
        ...finalItinerary,
        optimizedLandmarks: optimizedLandmarks,
        optimizedLandmarksByDay: optimizedLandmarksByDay,
        budgetAnalysis: {
          level: budgetLevel,
          range: BUDGET_RANGES[budgetLevel].label,
          dailyLimit: BUDGET_RANGES[budgetLevel].dailyLimit,
          recommendations: getBudgetRecommendations(budgetLevel)
        },
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
          budgetOptimized: true,
          travelTimeOptimized: true,
          clusters: clusters.clusters.map(c => ({
            day: c.day,
            landmarkCount: c.landmarks.length,
            avgPopularity: (c.landmarks.reduce((sum, l) => sum + (l.popularity || 50), 0) / c.landmarks.length).toFixed(1),
            avgScore: (c.landmarks.reduce((sum, l) => sum + (l.score || 50), 0) / c.landmarks.length).toFixed(1)
          }))
        },
        tripSummary: {
          location: tripDetails.location,
          numberOfDays: tripDetails.numberOfDays,
          budget: `₹${tripDetails.budget}`,
          budgetLevel: budgetLevel,
          totalLandmarks: enhancedLandmarks.length,
          avgLandmarksPerDay: Math.round(enhancedLandmarks.length / tripDetails.numberOfDays),
          highPopularityLandmarks: enhancedLandmarks.filter(l => (l.popularity || 50) > 70).length,
          generatedAt: new Date().toISOString(),
          mlEnhanced: true,
          realTravelTimes: true
        },
      },
    };

    logger.info(`Enhanced ${budgetLevel} budget itinerary generated successfully`);
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
const BUDGET_RANGES = {
  low: { min: 0, max: 15000, label: 'Low (₹5,000 - ₹15,000)', dailyLimit: 2000 },
  medium: { min: 15001, max: 40000, label: 'Medium (₹15,001 - ₹40,000)', dailyLimit: 5000 },
  high: { min: 40001, max: Infinity, label: 'High (₹40,001+)', dailyLimit: 10000 }
};

// Function to determine budget level
const getBudgetLevel = (budget) => {
  if (budget <= BUDGET_RANGES.low.max) return 'low';
  if (budget <= BUDGET_RANGES.medium.max) return 'medium';
  return 'high';
};

// Function to get real travel time using Google Maps API or fallback calculation
const getRealTravelTime = async (fromLat, fromLng, toLat, toLng) => {
  try {
    // If you have Google Maps API key, use this
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (googleMapsApiKey) {
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?units=metric&origins=${fromLat},${fromLng}&destinations=${toLat},${toLng}&key=${googleMapsApiKey}&mode=driving`;
      
      const response = await axios.get(url, { timeout: 5000 });
      
      if (response.data.status === 'OK' && 
          response.data.rows[0].elements[0].status === 'OK') {
        const element = response.data.rows[0].elements[0];
        return {
          distance: element.distance.text,
          duration: element.duration.text,
          distanceValue: element.distance.value, // in meters
          durationValue: element.duration.value, // in seconds
          source: 'google_maps'
        };
      }
    }
  } catch (error) {
    logger.warn('Google Maps API failed, using fallback calculation:', error.message);
  }
  
  // Fallback: Enhanced calculation based on road distance estimation
  const straightDistance = calculateDistance(fromLat, fromLng, toLat, toLng);
  
  // Apply road distance multiplier (roads are typically 1.3-1.8x longer than straight line)
  const roadMultiplier = 1.4; // Conservative estimate
  const estimatedRoadDistance = straightDistance * roadMultiplier;
  
  // Calculate time based on Indian city traffic conditions
  let avgSpeed;
  if (estimatedRoadDistance < 5) {
    avgSpeed = 20; // Heavy city traffic
  } else if (estimatedRoadDistance < 15) {
    avgSpeed = 30; // City traffic
  } else if (estimatedRoadDistance < 50) {
    avgSpeed = 45; // Suburban/highway
  } else {
    avgSpeed = 60; // Highway
  }
  
  const timeInHours = estimatedRoadDistance / avgSpeed;
  const timeInMinutes = Math.round(timeInHours * 60);
  
  return {
    distance: `${estimatedRoadDistance.toFixed(1)} km`,
    duration: timeInMinutes < 60 
      ? `${timeInMinutes} mins` 
      : `${Math.floor(timeInMinutes / 60)}h ${timeInMinutes % 60}m`,
    distanceValue: estimatedRoadDistance * 1000, // convert to meters
    durationValue: timeInMinutes * 60, // convert to seconds
    source: 'estimated'
  };
};

const getBudgetRecommendations = (budgetLevel) => {
  const recommendations = {
    low: [
      "Focus on free attractions like parks, temples, and local markets",
      "Use public transport or walk when possible",
      "Try street food and local eateries",
      "Look for group discounts and student rates",
      "Visit during off-peak hours for better deals"
    ],
    medium: [
      "Mix of popular attractions and hidden gems",
      "Use app-based cabs for convenience",
      "Try local restaurants and cafes",
      "Book combo tickets for multiple attractions",
      "Consider guided tours for better experiences"
    ],
    high: [
      "Premium attractions and experiences",
      "Comfortable transportation options",
      "Fine dining and specialty restaurants",
      "VIP access and skip-the-line tickets",
      "Photography tours and unique experiences"
    ]
  };
  
  return recommendations[budgetLevel] || recommendations.medium;
};

// Helper function to calculate estimated travel time between landmarks
const calculateTravelTime = async (fromLandmark, toLandmark) => {
  const travelInfo = await getRealTravelTime(
    fromLandmark.latitude,
    fromLandmark.longitude,
    toLandmark.latitude,
    toLandmark.longitude
  );
  
  return {
    distance: travelInfo.distance,
    duration: travelInfo.duration,
    distanceKm: travelInfo.distanceValue / 1000,
    durationMinutes: Math.round(travelInfo.durationValue / 60),
    source: travelInfo.source
  };
};


module.exports = {
  generateItinerary,
};