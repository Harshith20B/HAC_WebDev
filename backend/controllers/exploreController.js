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

// Function to get landmarks with images
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

    // Step 3: Process landmarks and fetch images
    const landmarks = await Promise.all(
      landmarkResponse.data.features.map(async (feature) => {
        const xid = feature.properties.xid;
        const landmarkData = {
          id: xid,
          name: feature.properties.name || 'Unknown Name',
          kinds: feature.properties.kinds,
          osm: feature.properties.osm,
          dist: feature.properties.dist,
          location: { lat: feature.geometry.coordinates[1], lon: feature.geometry.coordinates[0] },
        };

        // Step 3a: Try to fetch image from OpenTripMap's details API
        let image = await fetchDetailsFromOpenTripMap(xid, apiKey);

        // Step 3b: Fallback to Wikidata if no image is found
        if (!image) {
          logger.warn(`No image found for "${landmarkData.name}" in OpenTripMap. Searching Wikidata...`);
          image = await fetchImageFromWikidata(landmarkData.name);
        }

        // Step 3c: Fallback to default image if all fails
        landmarkData.image = image || 'https://via.placeholder.com/500x300?text=Image+Not+Available';
        return landmarkData;
      })
    );

    res.json(landmarks);
  } catch (error) {
    logger.error("Error fetching landmarks with images:", error.message);
    res.status(500).json({ message: 'Error fetching landmarks with images' });
  }
};

module.exports = { getLandmarksWithImages };
