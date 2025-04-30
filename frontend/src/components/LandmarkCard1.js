// src/components/LandmarkCard.js

import React from 'react';
import { Link } from 'react-router-dom';

function LandmarkCard({ landmark }) {
  return (
    <Link to={`/landmark-details/${landmark._id}`} className="bg-white rounded-lg shadow-md overflow-hidden">
      <img src={landmark.imageUrl} alt={landmark.name} className="w-full h-48 object-cover" />
      <div className="p-4">
        <h3 className="text-xl font-semibold mb-2">{landmark.name}</h3>
        <p className="text-gray-700 mb-2">{landmark.description}</p>
        {/* Convert location object to a readable string format */}
        <p className="text-gray-500">
          Location: {landmark.location ? `${landmark.location.lat}, ${landmark.location.lon}` : "Unknown"}
        </p>
      </div>
    </Link>
  );
}

export default LandmarkCard;
