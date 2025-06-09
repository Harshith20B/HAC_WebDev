import React from 'react';

const LandmarkCard2 = ({ landmark, isSelected, onSelect }) => {
  return (
    <div 
      className={`relative rounded-lg overflow-hidden shadow-md transition-all duration-300 ${isSelected ? 'ring-4 ring-blue-500' : ''}`}
      onClick={() => onSelect(landmark.name)}
    >
      <div className="h-48 relative">
        <img
          src={landmark.imageUrl}
          alt={landmark.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = `https://via.placeholder.com/500x300/4A90E2/FFFFFF?text=${encodeURIComponent(landmark.name)}`;
          }}
        />
        {isSelected && (
          <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-4 bg-white dark:bg-gray-800">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">{landmark.name}</h3>
        <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">{landmark.description}</p>
        <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {landmark.type}
        </div>
      </div>
    </div>
  );
};

export default LandmarkCard2;