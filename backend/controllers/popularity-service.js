const axios = require("axios");
const logger = require("pino")();
const { getEnhancedLandmarksData } = require('./popularity-service');
/**
 * Enhanced Popularity and Rating Service
 * Uses multiple free APIs to get comprehensive landmark data
 */

// Wikipedia API for historical and cultural significance
const getWikipediaPopularity = async (landmarkName, location) => {
  try {
    const searchQuery = `${landmarkName} ${location}`;
    const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchQuery)}`;
    
    const response = await axios.get(searchUrl, { 
      timeout: 5000,
      headers: {
        'User-Agent': 'TravelApp/1.0 (https://example.com/contact)'
      }
    });
    
    if (response.data && response.data.extract) {
      // Calculate popularity based on Wikipedia metrics
      const extractLength = response.data.extract.length;
      const hasImage = response.data.thumbnail ? 20 : 0;
      const hasCoordinates = response.data.coordinates ? 15 : 0;
      
      // Base score from extract length (longer = more notable)
      let popularity = Math.min(60, extractLength / 10);
      popularity += hasImage + hasCoordinates;
      
      return {
        popularity: Math.min(100, popularity),
        rating: 4.0, // Default good rating for Wikipedia entries
        source: 'wikipedia',
        description: response.data.extract?.substring(0, 200) + '...',
        hasWikipediaEntry: true
      };
    }
  } catch (error) {
    // Not an error - just no Wikipedia data
    return null;
  }
};

// Foursquare API for modern attraction data
const getFoursquareData = async (landmarkName, latitude, longitude) => {
  try {
    const apiKey = process.env.FOURSQUARE_API_KEY;
    if (!apiKey) return null;

    // Search for venues near the coordinates
    const searchUrl = `https://api.foursquare.com/v3/places/search`;
    const params = {
      ll: `${latitude},${longitude}`,
      query: landmarkName,
      radius: 500, // 500 meter radius
      limit: 5
    };

    const response = await axios.get(searchUrl, {
      params,
      headers: {
        'Authorization': apiKey,
        'Accept': 'application/json'
      },
      timeout: 8000
    });

    if (response.data?.results?.length > 0) {
      const venue = response.data.results[0];
      
      // Calculate popularity from Foursquare metrics
      const popularity = Math.min(100, (venue.popularity || 50) + 
        (venue.stats?.checkinsCount ? Math.min(30, venue.stats.checkinsCount / 100) : 0));
      
      return {
        popularity: popularity,
        rating: venue.rating || 3.8,
        source: 'foursquare',
        category: venue.categories?.[0]?.name || 'Attraction',
        verified: venue.verified || false,
        checkinsCount: venue.stats?.checkinsCount || 0
      };
    }
  } catch (error) {
    logger.warn(`Foursquare API error for ${landmarkName}:`, error.message);
    return null;
  }
};

// OpenStreetMap Overpass API for landmark significance
const getOSMSignificance = async (landmarkName, latitude, longitude) => {
  try {
    // Query OSM for tourism, historic, and cultural tags
    const query = `
      [out:json][timeout:10];
      (
        node["tourism"](around:500,${latitude},${longitude});
        node["historic"](around:500,${latitude},${longitude});
        node["amenity"="place_of_worship"](around:500,${latitude},${longitude});
        way["tourism"](around:500,${latitude},${longitude});
        way["historic"](around:500,${latitude},${longitude});
      );
      out;
    `;

    const response = await axios.post('https://overpass-api.de/api/interpreter', 
      query, 
      { 
        timeout: 10000,
        headers: { 'Content-Type': 'text/plain' }
      }
    );

    if (response.data?.elements?.length > 0) {
      const element = response.data.elements[0];
      const tags = element.tags || {};
      
      // Calculate significance based on OSM tags
      let significance = 40; // Base score
      
      // Tourism tags
      if (tags.tourism === 'attraction') significance += 30;
      if (tags.tourism === 'museum') significance += 25;
      if (tags.tourism === 'monument') significance += 20;
      
      // Historic tags
      if (tags.historic) significance += 25;
      if (tags.heritage) significance += 20;
      
      // Religious significance
      if (tags.amenity === 'place_of_worship') significance += 15;
      
      // UNESCO or protected status
      if (tags.heritage === 'world_heritage_site') significance += 40;
      if (tags.protection_title) significance += 20;
      
      return {
        popularity: Math.min(100, significance),
        rating: 4.2, // Good default for OSM tagged landmarks
        source: 'osm',
        category: tags.tourism || tags.historic || tags.amenity || 'landmark',
        heritage: tags.heritage || null,
        osmTags: tags
      };
    }
  } catch (error) {
    logger.warn(`OSM query error for ${landmarkName}:`, error.message);
    return null;
  }
};

// Gemini AI for intelligent estimation when other sources fail
const getAIEstimatedPopularity = async (landmarkName, location, description) => {
  try {
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    
    if (!process.env.GOOGLE_AI_API_KEY) return null;

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 200,
      }
    });

    const prompt = `Rate the tourism popularity of "${landmarkName}" in ${location} on a scale of 1-100.
    
    Consider factors like:
    - Historical significance
    - Tourist visitor numbers
    - Cultural importance
    - Architectural value
    - Media coverage
    - Accessibility
    
    Description: ${description || 'No description available'}
    
    Respond with ONLY a number between 1-100 and a rating between 1-5 separated by a comma.
    Example: 85,4.2`;

    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();
    
    const match = response.match(/(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)/);
    if (match) {
      const popularity = Math.min(100, Math.max(1, parseFloat(match[1])));
      const rating = Math.min(5, Math.max(1, parseFloat(match[2])));
      
      return {
        popularity: popularity,
        rating: rating,
        source: 'ai_estimated',
        confidence: 'medium'
      };
    }
  } catch (error) {
    logger.warn(`AI estimation error for ${landmarkName}:`, error.message);
    return null;
  }
};

// Main function to get enhanced landmark data
const getEnhancedLandmarkData = async (landmark, location) => {
  const { name, latitude, longitude, description } = landmark;
  
  if (!name || !latitude || !longitude) {
    return {
      ...landmark,
      popularity: 50,
      rating: 3.5,
      source: 'default',
      confidence: 'low'
    };
  }

  logger.info(`Fetching enhanced data for: ${name}`);

  // Run all API calls concurrently for better performance
  const [wikipediaData, foursquareData, osmData] = await Promise.allSettled([
    getWikipediaPopularity(name, location),
    getFoursquareData(name, latitude, longitude),
    getOSMSignificance(name, latitude, longitude)
  ]);

  // Collect successful results
  const results = [];
  if (wikipediaData.status === 'fulfilled' && wikipediaData.value) {
    results.push(wikipediaData.value);
  }
  if (foursquareData.status === 'fulfilled' && foursquareData.value) {
    results.push(foursquareData.value);
  }
  if (osmData.status === 'fulfilled' && osmData.value) {
    results.push(osmData.value);
  }

  let finalData;

  if (results.length === 0) {
    // Fallback to AI estimation
    const aiData = await getAIEstimatedPopularity(name, location, description);
    finalData = aiData || {
      popularity: 50,
      rating: 3.5,
      source: 'default',
      confidence: 'low'
    };
  } else if (results.length === 1) {
    // Use single source
    finalData = results[0];
    finalData.confidence = 'medium';
  } else {
    // Combine multiple sources with weighted average
    let totalPopularity = 0;
    let totalRating = 0;
    let totalWeight = 0;
    
    // Assign weights to different sources
    const sourceWeights = {
      'foursquare': 0.4,    // Most reliable for modern attractions
      'wikipedia': 0.35,     // Great for historical significance
      'osm': 0.25           // Good for general landmark data
    };

    results.forEach(result => {
      const weight = sourceWeights[result.source] || 0.2;
      totalPopularity += result.popularity * weight;
      totalRating += result.rating * weight;
      totalWeight += weight;
    });

    finalData = {
      popularity: Math.round(totalPopularity / totalWeight),
      rating: +(totalRating / totalWeight).toFixed(1),
      source: 'combined',
      sources: results.map(r => r.source),
      confidence: 'high',
      dataPoints: results.length
    };
  }

  // Enhance the original landmark object
  return {
    ...landmark,
    popularity: finalData.popularity,
    rating: finalData.rating,
    source: finalData.source,
    confidence: finalData.confidence,
    enhancedData: finalData,
    // Keep additional useful data
    category: finalData.category || landmark.category || 'attraction',
    verified: finalData.verified || false,
    hasWikipediaEntry: finalData.hasWikipediaEntry || false
  };
};

// Batch process multiple landmarks
const getEnhancedLandmarksData = async (landmarks, location) => {
  const batchSize = 5; // Process 5 landmarks at a time to avoid rate limits
  const enhancedLandmarks = [];
  
  for (let i = 0; i < landmarks.length; i += batchSize) {
    const batch = landmarks.slice(i, i + batchSize);
    
    const batchPromises = batch.map(landmark => 
      getEnhancedLandmarkData(landmark, location)
    );
    
    const batchResults = await Promise.allSettled(batchPromises);
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        enhancedLandmarks.push(result.value);
      } else {
        // Fallback for failed landmarks
        enhancedLandmarks.push({
          ...batch[index],
          popularity: 50,
          rating: 3.5,
          source: 'fallback',
          confidence: 'low'
        });
      }
    });
    
    // Add delay between batches to respect rate limits
    if (i + batchSize < landmarks.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  logger.info(`Enhanced ${enhancedLandmarks.length} landmarks with popularity data`);
  return enhancedLandmarks;
};

module.exports = {
  getEnhancedLandmarkData,
  getEnhancedLandmarksData,
  getWikipediaPopularity,
  getFoursquareData,
  getOSMSignificance,
  getAIEstimatedPopularity
};