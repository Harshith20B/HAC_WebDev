const axios = require('axios');
require('dotenv').config();
const logger = require('pino')();

// Enhanced function to fetch detailed information from OpenTripMap
const fetchDetailsFromOpenTripMap = async (xid, apiKey) => {
  const detailsUrl = `https://api.opentripmap.com/0.1/en/places/xid/${xid}?apikey=${apiKey}`;
  try {
    const response = await axios.get(detailsUrl, { timeout: 10000 });
    logger.debug(`OpenTripMap Details Response for xid "${xid}":`, JSON.stringify(response.data, null, 2));
    
    // Check multiple possible image paths
    const imageUrl = response.data.image || 
                    response.data.preview?.source || 
                    response.data.wikipedia_extracts?.thumbnail ||
                    null;
    
    if (imageUrl) {
      // Ensure the URL is properly formatted
      return imageUrl.startsWith('http') ? imageUrl : `https:${imageUrl}`;
    }
    return null;
  } catch (error) {
    logger.error(`Error fetching OpenTripMap details for xid "${xid}":`, error.message);
    return null;
  }
};

// Enhanced Wikidata image fetching with proper URL construction
const fetchImageFromWikidata = async (query) => {
  const searchQueries = [
    query,
    `${query} landmark`,
    `${query} monument`,
    `${query} building`,
    query.split(' ')[0] // First word only as fallback
  ];

  for (const searchQuery of searchQueries) {
    try {
      // Step 1: Search for entities
      const searchUrl = `https://www.wikidata.org/w/api.php`;
      const searchResponse = await axios.get(searchUrl, {
        params: {
          action: 'wbsearchentities',
          search: searchQuery,
          language: 'en',
          format: 'json',
          limit: 3
        },
        timeout: 8000
      });

      const entities = searchResponse.data.search || [];
      
      for (const entity of entities) {
        if (entity.id) {
          // Step 2: Get entity details including image claims
          const entityResponse = await axios.get(searchUrl, {
            params: {
              action: 'wbgetentities',
              ids: entity.id,
              props: 'claims',
              format: 'json'
            },
            timeout: 8000
          });

          const entityData = entityResponse.data.entities[entity.id];
          const imageClaims = entityData?.claims?.P18; // P18 is the image property

          if (imageClaims && imageClaims.length > 0) {
            const imageFileName = imageClaims[0].mainsnak.datavalue.value;
            // Construct proper Commons URL
            const commonsImageUrl = await getCommonsImageUrl(imageFileName);
            if (commonsImageUrl) {
              logger.info(`Found Wikidata image for "${searchQuery}": ${commonsImageUrl}`);
              return commonsImageUrl;
            }
          }
        }
      }
    } catch (error) {
      logger.error(`Error fetching from Wikidata for "${searchQuery}":`, error.message);
      continue; // Try next search query
    }
  }
  
  logger.warn(`No Wikidata image found for "${query}"`);
  return null;
};

// Helper function to get actual image URL from Commons
const getCommonsImageUrl = async (fileName) => {
  try {
    const commonsUrl = 'https://commons.wikimedia.org/w/api.php';
    const response = await axios.get(commonsUrl, {
      params: {
        action: 'query',
        titles: `File:${fileName}`,
        prop: 'imageinfo',
        iiprop: 'url',
        format: 'json'
      },
      timeout: 5000
    });

    const pages = response.data.query.pages;
    const pageId = Object.keys(pages)[0];
    const imageInfo = pages[pageId]?.imageinfo?.[0];
    
    return imageInfo?.url || null;
  } catch (error) {
    logger.error('Error getting Commons image URL:', error.message);
    return null;
  }
};

// New: Fetch from Unsplash as additional fallback
const fetchImageFromUnsplash = async (query) => {
  const unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!unsplashAccessKey) {
    logger.warn('Unsplash access key not provided');
    return null;
  }

  try {
    const searchTerms = `${query} landmark architecture building`;
    const response = await axios.get('https://api.unsplash.com/search/photos', {
      params: {
        query: searchTerms,
        per_page: 1,
        orientation: 'landscape'
      },
      headers: {
        'Authorization': `Client-ID ${unsplashAccessKey}`
      },
      timeout: 8000
    });

    const photo = response.data.results?.[0];
    if (photo) {
      logger.info(`Found Unsplash image for "${query}": ${photo.urls.regular}`);
      return photo.urls.regular;
    }
  } catch (error) {
    logger.error(`Error fetching from Unsplash for "${query}":`, error.message);
  }
  
  return null;
};

// New: Generate a more appealing placeholder
const generateStyledPlaceholder = (landmarkName, width = 500, height = 300) => {
  const encodedName = encodeURIComponent(landmarkName);
  const backgroundColor = '4A90E2'; // Nice blue color
  const textColor = 'FFFFFF';
  
  return `https://via.placeholder.com/${width}x${height}/${backgroundColor}/${textColor}?text=${encodedName}`;
};

// Enhanced main function with rate limiting and better error handling
const getLandmarksWithImages = async (req, res) => {
  const { location, radius } = req.query;
  const apiKey = process.env.OPENTRIPMAP_API_KEY;

  try {
    // Step 1: Get coordinates for the location
    const geocodeUrl = `https://api.opentripmap.com/0.1/en/places/geoname?name=${location}&apikey=${apiKey}`;
    const geocodeResponse = await axios.get(geocodeUrl, { timeout: 10000 });
    const { lat, lon } = geocodeResponse.data;

    // Step 2: Fetch landmarks within the radius
    const landmarkUrl = `https://api.opentripmap.com/0.1/en/places/radius?radius=${radius * 1000}&lon=${lon}&lat=${lat}&apikey=${apiKey}&limit=20`;
    const landmarkResponse = await axios.get(landmarkUrl, { timeout: 15000 });

    logger.info(`Found ${landmarkResponse.data.features.length} landmarks`);

    // Step 3: Process landmarks with controlled concurrency
    const landmarks = [];
    const batchSize = 3; // Process 3 landmarks at a time to avoid rate limiting
    
    for (let i = 0; i < landmarkResponse.data.features.length; i += batchSize) {
      const batch = landmarkResponse.data.features.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (feature) => {
        const xid = feature.properties.xid;
        if (!xid) {
          logger.warn('Missing xid for feature:', feature.properties.name);
          return null;
        }

        const landmarkData = {
          _id: xid,
          name: feature.properties.name || 'Unknown Name',
          kinds: feature.properties.kinds,
          osm: feature.properties.osm,
          dist: feature.properties.dist,
          coordinates: feature.geometry.coordinates,
          location: {
            lat: feature.geometry.coordinates[1],
            lon: feature.geometry.coordinates[0]
          }
        };

        // Skip landmarks with generic names
        if (landmarkData.name === 'Unknown Name' || landmarkData.name.trim() === '') {
          return null;
        }

        // Try multiple image sources with delays between requests
        let imageUrl = null;
        
        // 1. Try OpenTripMap first
        imageUrl = await fetchDetailsFromOpenTripMap(xid, apiKey);
        if (imageUrl) {
          logger.info(`Found OpenTripMap image for "${landmarkData.name}"`);
        }
        
        // 2. Try Wikidata if OpenTripMap fails
        if (!imageUrl) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting delay
          imageUrl = await fetchImageFromWikidata(landmarkData.name);
        }
        
        // 3. Try Unsplash as final fallback
        if (!imageUrl) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting delay
          imageUrl = await fetchImageFromUnsplash(landmarkData.name);
        }
        
        // 4. Use styled placeholder if all else fails
        landmarkData.imageUrl = imageUrl || generateStyledPlaceholder(landmarkData.name);
        
        logger.info(`Final image URL for "${landmarkData.name}": ${landmarkData.imageUrl}`);
        return landmarkData;
      });

      const batchResults = await Promise.all(batchPromises);
      landmarks.push(...batchResults.filter(landmark => landmark !== null));
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < landmarkResponse.data.features.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    logger.info(`Successfully processed ${landmarks.length} landmarks with images`);
    // Add this right before the final res.json(landmarks) line:

    // Remove duplicates based on name and location proximity
    const uniqueLandmarks = [];
    const seenNames = new Set();
    const locationThreshold = 0.001; // ~100 meters

    for (const landmark of landmarks) {
      const normalizedName = landmark.name.toLowerCase().trim();
      
      // Skip if exact name already exists
      if (seenNames.has(normalizedName)) {
        continue;
      }
      
      // Check for nearby duplicates with similar coordinates
      const isDuplicate = uniqueLandmarks.some(existing => {
        const latDiff = Math.abs(existing.location.lat - landmark.location.lat);
        const lonDiff = Math.abs(existing.location.lon - landmark.location.lon);
        return latDiff < locationThreshold && lonDiff < locationThreshold;
      });
      
      if (!isDuplicate) {
        uniqueLandmarks.push(landmark);
        seenNames.add(normalizedName);
      }
    }

    logger.info(`Filtered ${landmarks.length} landmarks down to ${uniqueLandmarks.length} unique ones`);

    // Replace the original res.json(landmarks) with:
    res.json(uniqueLandmarks);
  } catch (error) {
    logger.error("Error fetching landmarks with images:", error.message);
    res.status(500).json({ 
      message: 'Error fetching landmarks with images',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = { getLandmarksWithImages };