// src/pages/SearchResultsPage.js
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import LandmarkCard from '../components/LandmarkCard';

function SearchResultsPage() {
  const [landmarks, setLandmarks] = useState([]);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const searchLocation = searchParams.get('location');
  const searchRadius = searchParams.get('radius');

  useEffect(() => {
    const fetchLandmarks = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/explore/search`, {
          params: { location: searchLocation, radius: searchRadius }
        });
        setLandmarks(response.data);
      } catch (error) {
        console.error("Error fetching landmarks:", error);
      }
    };

    fetchLandmarks();
  }, [searchLocation, searchRadius]);

  return (
    <div className="container mx-auto px-4">
      <h2 className="text-2xl font-bold mb-4 text-center">
        Landmarks near {searchLocation} within {searchRadius} km
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {landmarks.length ? (
          landmarks.map((landmark) => (
            <LandmarkCard key={landmark.id} landmark={landmark} />
          ))
        ) : (
          <p className="text-center col-span-3">No landmarks found.</p>
        )}
      </div>
    </div>
  );
}

export default SearchResultsPage;
