// src/pages/LandmarkDetails.js

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

function LandmarkDetails() {
  const { landmarkId } = useParams(); // Get the landmark ID from the URL
  const [landmark, setLandmark] = useState(null);

  useEffect(() => {
    const fetchLandmarkDetails = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/landmarks/${landmarkId}`);
        setLandmark(response.data);
      } catch (error) {
        console.error("Error fetching landmark details:", error);
      }
    };

    fetchLandmarkDetails();
  }, [landmarkId]);

  if (!landmark) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-3xl font-bold mb-4">{landmark.name}</h2>
      <img src={landmark.imageUrl} alt={landmark.name} className="w-full h-80 object-cover mb-4" />
      <p className="text-gray-700 mb-4">{landmark.description}</p>
      <p className="text-gray-500">
        Location: {landmark.location ? `${landmark.location.lat}, ${landmark.location.lon}` : "Unknown"}
      </p>
      {/* You can add more detailed information here */}
    </div>
  );
}

export default LandmarkDetails;
