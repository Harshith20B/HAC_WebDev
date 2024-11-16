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
        const response = await axios.get(`http://localhost:5000/api/explore/search`, {
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
        ? prev.filter((id) => id !== landmarkId) // Remove if already selected
        : [...prev, landmarkId] // Add if not selected
    );
  };

  const handleDevisePlan = () => {
    navigate('/devise-plan', { state: { selectedLandmarks } });
  };

  return (
    <div className="container mx-auto px-4 flex flex-col min-h-screen">
      <h2 className="text-2xl font-bold mb-4 text-center">
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
          <p className="text-center col-span-3">No landmarks found.</p>
        )}
      </div>
      <div className="text-center mt-8">
        <button
          onClick={handleDevisePlan}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition"
          disabled={!selectedLandmarks.length}
        >
          Devise Plan
        </button>
      </div>
    </div>
  );
}

export default SearchResultsPage;
