import React from 'react';

function LandmarkCard2({ landmark, isSelected, onSelect }) {
  return (
    <div
      onClick={() => onSelect(landmark._id)} // Trigger the onSelect function with the landmark's _id
      className={`cursor-pointer bg-white rounded-lg shadow-md overflow-hidden border-2 
        ${isSelected ? 'border-blue-500' : 'border-transparent'} transition-all duration-300`}
    >
      {/* Landmark image */}
      <img
        src={landmark.imageUrl} // Assuming each landmark has an imageUrl property
        alt={landmark.name}
        className="w-full h-48 object-cover"
      />
      <div className="p-4">
        {/* Landmark name */}
        <h3 className="text-xl font-semibold mb-2">{landmark.name}</h3>
        {/* Landmark description */}
        <p className="text-gray-700 mb-2">{landmark.description}</p>
        {/* Landmark location */}
        <p className="text-gray-500 mb-1">
          Location: {landmark.location}
        </p>
        {/* Latitude and Longitude */}
        <p className="text-gray-500">
          Coordinates: {landmark.latitude}, {landmark.longitude}
        </p>
      </div>
    </div>
  );
}

export default LandmarkCard2;
