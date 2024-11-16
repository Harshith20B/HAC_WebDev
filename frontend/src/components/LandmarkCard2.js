import React from 'react';

function LandmarkCard2({ landmark, isSelected, onSelect }) {
  return (
    <div
      onClick={() => onSelect(landmark._id)}
      className={`cursor-pointer bg-white rounded-lg shadow-md overflow-hidden border-2 ${
        isSelected ? 'border-blue-500' : 'border-transparent'
      }`}
    >
      <img src={landmark.imageUrl} alt={landmark.name} className="w-full h-48 object-cover" />
      <div className="p-4">
        <h3 className="text-xl font-semibold mb-2">{landmark.name}</h3>
        <p className="text-gray-700 mb-2">{landmark.description}</p>
        <p className="text-gray-500">
          Location: {landmark.location ? `${landmark.location.lat}, ${landmark.location.lon}` : 'Unknown'}
        </p>
      </div>
    </div>
  );
}

export default LandmarkCard2;
