const axios = require('axios');
require('dotenv').config();
const logger = require('pino')(); // Using Pino for logging

// Function to fetch detailed information (including image) from OpenTripMap
const fetchDetailsFromOpenTripMap = async (xid, apiKey) => {
  const detailsUrl = `https://api.opentripmap.com/0.1/en/places/xid/${xid}?apikey=${apiKey}`;
  try {
    const response = await axios.get(detailsUrl);
    logger.debug(`OpenTripMap Details Response for xid "${xid}":`, response.data);
    return response.data.image || null; // Return image URL if available
  } catch (error) {
    logger.error(`Error fetching details for xid "${xid}":`, error.message);
    return null;
  }
};

// Function to fetch image from Wikidata (as a fallback)
const fetchImageFromWikidata = async (query) => {
  const baseUrl = 'https://www.wikidata.org/w/api.php?action=wbsearchentities';
  const searchQueries = [query, `${query} Landmark`, `${query} monument`]; // Fuzzy search

  for (const searchQuery of searchQueries) {
    const url = `${baseUrl}&search=${encodeURIComponent(searchQuery)}&limit=1&props=labels|descriptions|claims&languages=en&format=json`;
    try {
      const response = await axios.get(url);
      logger.debug(`Wikidata Search Response for "${searchQuery}":`, response.data);
      const entity = response.data.search?.[0];
      if (entity?.claims?.P18) {
        const imageTitle = entity.claims.P18[0].mainsnak.datavalue.value;
        return `https://commons.wikimedia.org/wiki/File:${imageTitle}`;
      }
    } catch (error) {
      logger.error('Error fetching image from Wikidata:', error.message);
    }
  }
  logger.warn(`No image found for "${query}". Using default image.`);
  return 'https://via.placeholder.com/500x300?text=Image+Not+Found';
};

const getLandmarksWithImages = async (req, res) => {
  const { location, radius } = req.query;
  const apiKey = process.env.OPENTRIPMAP_API_KEY;

  try {
    // Step 1: Get coordinates for the location
    const geocodeUrl = `https://api.opentripmap.com/0.1/en/places/geoname?name=${location}&apikey=${apiKey}`;
    const geocodeResponse = await axios.get(geocodeUrl);
    const { lat, lon } = geocodeResponse.data;

    // Step 2: Fetch landmarks within the radius
    const landmarkUrl = `https://api.opentripmap.com/0.1/en/places/radius?radius=${radius * 1000}&lon=${lon}&lat=${lat}&apikey=${apiKey}&limit=20`;
    const landmarkResponse = await axios.get(landmarkUrl);

    // Log the raw data structure
    console.log('Raw OpenTripMap Response:', landmarkResponse.data.features[0]);

    // Step 3: Process landmarks and fetch images
    const landmarks = await Promise.all(
      landmarkResponse.data.features.map(async (feature) => {
        const xid = feature.properties.xid;
        // Ensure xid exists and is unique
        if (!xid) {
          console.error('Missing xid for feature:', feature);
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

        // Fetch image
        let image = await fetchDetailsFromOpenTripMap(xid, apiKey);
        if (!image) {
          image = await fetchImageFromWikidata(landmarkData.name);
        }
        landmarkData.imageUrl = image || 'https://via.placeholder.com/500x300?text=Image+Not+Available';
        
        return landmarkData;
      })
    );

    // Filter out any null values and log the processed landmarks
    const validLandmarks = landmarks.filter(landmark => landmark !== null);
    console.log('Processed landmarks:', validLandmarks.map(l => ({ _id: l._id, name: l.name })));

    res.json(validLandmarks);
  } catch (error) {
    logger.error("Error fetching landmarks with images:", error.message);
    res.status(500).json({ message: 'Error fetching landmarks with images' });
  }
};

module.exports = { getLandmarksWithImages };
