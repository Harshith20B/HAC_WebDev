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

  useEffect(() => {
    const fetchLandmarks = async () => {
      try {
        const response = await axios.get(`https://hac-webdev-2.onrender.com/api/landmarks/search2`, {
          params: { location: searchLocation, radius: searchRadius },
        });
        setLandmarks(response.data);
      } catch (error) {
        console.error('Error fetching landmarks:', error);
      }
    };

    fetchLandmarks();
  }, [searchLocation, searchRadius]);

  const toggleSelection = (landmarkId) => {
    setSelectedLandmarks((prev) =>
      prev.includes(landmarkId)
        ? prev.filter((id) => id !== landmarkId)
        : [...prev, landmarkId]
    );
  };

  const handleDevisePlan = () => {
    const fullLandmarkData = landmarks.filter((landmark) =>
      selectedLandmarks.includes(landmark._id)
    );
    navigate('/devise-plan', { state: { selectedLandmarks: fullLandmarkData } });
  };

  return (
    <div className="container mx-auto px-4 flex flex-col min-h-screen bg-white dark:bg-gray-900">
      <h2 className="text-2xl font-bold mb-4 text-center text-gray-800 dark:text-white">
        Landmarks near {searchLocation} within {searchRadius} km
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 flex-grow">
        {landmarks.length ? (
          landmarks.map((landmark) => (
            <LandmarkCard2
              key={landmark._id}
              landmark={landmark}
              isSelected={selectedLandmarks.includes(landmark._id)}
              onSelect={toggleSelection}
            />
          ))
        ) : (
          <p className="text-center col-span-3 text-gray-600 dark:text-gray-300">
            No landmarks found.
          </p>
        )}
      </div>
      <div className="text-center mt-8 mb-6">
        <button
          onClick={handleDevisePlan}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!selectedLandmarks.length}
        >
          Devise Plan
        </button>
      </div>
    </div>
  );
}

export default SearchResultsPage;