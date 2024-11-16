const axios = require('axios');
const wdk = require('wikidata-sdk'); // For SPARQL queries
require('dotenv').config();

const logger = require('pino')(); // Using Pino for logging

// Function to fetch image from Wikidata with fuzzy search
const fetchImageFromWikidata = async (query) => {
  const baseUrl = 'https://www.wikidata.org/w/api.php?action=wbsearchentities';
  
  // Prepare different query variations for fuzzy search
  const searchQueries = [
    query,                               // Exact name of the landmark
    `${query} Landmark`,                 // Add "Landmark" suffix
    `${query} monument`,                 // Try searching for "monument" variant
  ];

  // Attempt all query variations
  for (const searchQuery of searchQueries) {
    const url = `${baseUrl}&search=${encodeURIComponent(searchQuery)}&limit=1&props=labels|descriptions|claims&languages=en&format=json`;
    
    try {
      const response = await axios.get(url);
      logger.debug(`Wikidata Search Response for "${searchQuery}":`, response.data);

      const entity = response.data.search?.[0];
      if (entity && entity.claims && entity.claims.P18) { // Check if P18 (image) exists
        const imageTitle = entity.claims.P18[0].mainsnak.datavalue.value;
        const imageUrl = `https://commons.wikimedia.org/wiki/File:${imageTitle}`;
        logger.info(`Found image for "${searchQuery}": ${imageUrl}`);
        return imageUrl;
      }
    } catch (error) {
      logger.error('Error fetching image from Wikidata:', error.message);
    }
  }

  // Fallback in case no image was found
  logger.warn(`No image found for "${query}". Using default image.`);
  return 'https://via.placeholder.com/500x300?text=Image+Not+Found';
};

// Function to get landmarks with images
const getLandmarksWithImages = async (req, res) => {
  const { location, radius } = req.query;
  const apiKey = process.env.OPENTRIPMAP_API_KEY;

  try {
    // Geocode the location to get latitude and longitude
    const geocodeUrl = `https://api.opentripmap.com/0.1/en/places/geoname?name=${location}&apikey=${apiKey}`;
    const geocodeResponse = await axios.get(geocodeUrl);
    const { lat, lon } = geocodeResponse.data;

    // Get landmarks from OpenTripMap within the specified radius
    const landmarkUrl = `https://api.opentripmap.com/0.1/en/places/radius?radius=${radius * 1000}&lon=${lon}&lat=${lat}&apikey=${apiKey}&limit=20`;
    const landmarkResponse = await axios.get(landmarkUrl);

    const landmarks = await Promise.all(
      landmarkResponse.data.features.map(async (feature) => {
        const landmarkData = {
          id: feature.id,
          name: feature.properties.name || 'Unknown Name',
          kinds: feature.properties.kinds,
          osm: feature.properties.osm,
          dist: feature.properties.dist,
          location: { lat: feature.geometry.coordinates[1], lon: feature.geometry.coordinates[0] },
        };

        // First, try to get an image from Wikidata
        logger.info(`Searching Wikidata for: ${landmarkData.name}`);
        let image = await fetchImageFromWikidata(landmarkData.name);

        // If no image is found, fall back to default image
        if (image.includes('Image+Not+Found')) {
          logger.warn(`No image found for ${landmarkData.name}. Using default image.`);
        }

        landmarkData.image = image;
        return landmarkData;
      })
    );

    res.json(landmarks);
  } catch (error) {
    logger.error("Error fetching landmarks:", error.message);
    res.status(500).json({ message: 'Error fetching landmarks' });
  }
};

module.exports = { getLandmarksWithImages };
