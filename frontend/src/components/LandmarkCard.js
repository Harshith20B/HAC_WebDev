import React from 'react';

function LandmarkCard({ landmark }) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <img src={landmark.imageUrl} alt={landmark.name} className="w-full h-48 object-cover" />
      <div className="p-4">
        <h3 className="text-xl font-semibold mb-2">{landmark.name}</h3>
        <p className="text-gray-700 mb-2">{landmark.description}</p>
        {/* Convert location object to a readable string format */}
        <p className="text-gray-500">
          Location: {landmark.location ? `${landmark.location.lat}, ${landmark.location.lon}` : "Unknown"}
        </p>
        <button className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          Book Now
        </button>
      </div>
    </div>
  );
}

export default LandmarkCard;
