import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import LandmarkCard2 from '../components/LandmarkCard2';

function SearchResultsPage() {
  const [landmarks, setLandmarks] = useState([]);
  const [selectedLandmarks, setSelectedLandmarks] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const searchLocation = searchParams.get('location');
  const searchRadius = searchParams.get('radius');
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://hac-webdev-2.onrender.com/api';
  useEffect(() => {
    const fetchLandmarks = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/explore/search`, {
          params: { location: searchLocation, radius: searchRadius },
        });
        
        const validLandmarks = response.data.filter(landmark => 
          landmark.name && 
          landmark.name.trim() !== '' && 
          landmark.name.toLowerCase() !== 'unknown name'
        ).map(landmark => ({
          ...landmark,
          // Ensure proper latitude and longitude format
          latitude: landmark.location?.lat || landmark.coordinates?.[1],
          longitude: landmark.location?.lon || landmark.coordinates?.[0],
          description: landmark.description || `Landmark in ${searchLocation}`
        }));

        console.log('Filtered landmarks:', validLandmarks);
        setLandmarks(validLandmarks);
      } catch (error) {
        console.error('Error fetching landmarks:', error);
        setLandmarks([]);
      }
    };

    fetchLandmarks();
  }, [searchLocation, searchRadius]);

  const selectLandmark = (landmarkName) => {
    console.log('Selecting landmark:', landmarkName);
    setSelectedLandmarks(currentSelected => {
      if (currentSelected.includes(landmarkName)) {
        return currentSelected.filter(name => name !== landmarkName);
      } else {
        return [...currentSelected, landmarkName];
      }
    });
  };

  const handleDevisePlan = () => {
    const selectedData = landmarks
      .filter(l => selectedLandmarks.includes(l.name))
      .map(landmark => ({
        _id: landmark._id || `landmark-${landmark.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: landmark.name,
        description: landmark.description,
        latitude: landmark.latitude,
        longitude: landmark.longitude,
        imageUrl: landmark.imageUrl
      }));

    console.log('Navigating with selected landmarks:', selectedData);
    
    if (selectedData.length > 0) {
      navigate('/devise-plan', { 
        state: { selectedLandmarks: selectedData } 
      });
    }
  };

  return (
    <div className="relative min-h-screen bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 pb-24">
        <h2 className="text-2xl font-bold mb-4 text-center pt-6 text-gray-800 dark:text-white">
          Landmarks near {searchLocation} within {searchRadius} km
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {landmarks.length > 0 ? (
            landmarks.map((landmark) => (
              <LandmarkCard2
                key={landmark.name}
                landmark={landmark}
                isSelected={selectedLandmarks.includes(landmark.name)}
                onSelect={selectLandmark}
              />
            ))
          ) : (
            <p className="text-center col-span-3 text-gray-600 dark:text-gray-300">
              No landmarks found with valid names.
            </p>
          )}
        </div>
      </div>

      {/* Fixed position button container */}
      <div className="fixed bottom-0 right-0 left-0 bg-white dark:bg-gray-900 shadow-lg border-t border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Selected landmarks: {selectedLandmarks.length}
          </div>
          <button
            onClick={handleDevisePlan}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            disabled={selectedLandmarks.length === 0}
          >
            Devise Plan
          </button>
        </div>
      </div>

      {/* Debug info */}
      <div className="fixed top-0 right-0 p-4 bg-black bg-opacity-50 text-white text-xs">
        Selected: {selectedLandmarks.join(', ')}
      </div>
    </div>
  );
}

export default SearchResultsPage;