const axios = require('axios');
const Fuse = require('fuse.js'); // Fuzzy matching library for partial name matching

// Search Wikimedia Commons by coordinates
const fetchImageByCoordinates = async (lat, lon) => {
  const wikiUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=coordinates&climit=3&gcmtitle=&gcmprop=title|timestamp&gcmlat=${lat}&gcmLon=${lon}&gcmradius=1000`;
  
  try {
    const response = await axios.get(wikiUrl);
    const images = response.data.query.pages;
    
    if (images && Object.keys(images).length > 0) {
      // Extract and return the first relevant image
      const imageUrl = images[Object.keys(images)[0]].thumbnail;
      return imageUrl || 'https://via.placeholder.com/500x300?text=Image+Not+Found';
    }
    
    return 'https://via.placeholder.com/500x300?text=Image+Not+Found'; // Fallback if no image found
  } catch (error) {
    console.error("Error fetching image by coordinates:", error);
    return 'https://via.placeholder.com/500x300?text=Image+Not+Found';
  }
};

// Search Wikimedia Commons by name using fuzzy matching
const fetchImageByName = async (query) => {
  const wikiUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(query)}&srprop=timestamp|size&utf8=1`;

  try {
    const response = await axios.get(wikiUrl);
    const searchResults = response.data.query.search;
    
    if (searchResults && searchResults.length > 0) {
      // Extract the image from the first result
      const title = searchResults[0].title;
      return `https://commons.wikimedia.org/wiki/File:${title}`; // Wikimedia image URL
    }
    
    return 'https://via.placeholder.com/500x300?text=Image+Not+Found'; // Fallback if no image found
  } catch (error) {
    console.error("Error fetching image by name:", error);
    return 'https://via.placeholder.com/500x300?text=Image+Not+Found';
  }
};

// Main function to search landmarks and fetch images
const searchLandmarks = async (req, res) => {
  const { location, radius } = req.query;
  const apiKey = process.env.OPENTRIPMAP_API_KEY; // OpenTripMap API Key

  try {
    // Geocode the location to get latitude and longitude
    const geocodeUrl = `https://api.opentripmap.com/0.1/en/places/geoname?name=${location}&apikey=${apiKey}`;
    const geocodeResponse = await axios.get(geocodeUrl);
    const { lat, lon } = geocodeResponse.data;

    // Get landmarks from OpenTripMap within radius
    const landmarkUrl = `https://api.opentripmap.com/0.1/en/places/radius?radius=${radius * 1000}&lon=${lon}&lat=${lat}&apikey=${apiKey}&limit=20`;
    const landmarkResponse = await axios.get(landmarkUrl);

    const landmarks = await Promise.all(landmarkResponse.data.features.map(async (feature) => {
      const landmarkData = {
        id: feature.id,
        name: feature.properties.name || 'Unknown Name',
        kinds: feature.properties.kinds,
        osm: feature.properties.osm,
        dist: feature.properties.dist,
        location: { lat: feature.geometry.coordinates[1], lon: feature.geometry.coordinates[0] }
      };

      // First try to get images based on coordinates
      let image = await fetchImageByCoordinates(landmarkData.location.lat, landmarkData.location.lon);
      
      // If no image is found, use name-based search with fuzzy matching
      if (image === 'https://via.placeholder.com/500x300?text=Image+Not+Found') {
        image = await fetchImageByName(landmarkData.name);
      }

      landmarkData.image = image;
      return landmarkData;
    }));

    res.json(landmarks);
  } catch (error) {
    console.error("Error fetching landmarks:", error);
    res.status(500).json({ message: 'Error fetching landmarks' });
  }
};

module.exports = { searchLandmarks };
