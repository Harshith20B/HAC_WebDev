import React from 'react';

function LandmarkCard2({ landmark, isSelected, onSelect }) {
  const handleClick = () => {
    console.log('Clicking landmark:', landmark.name);
    onSelect(landmark.name);
  };

  return (
    <div
      onClick={handleClick}
      className={`cursor-pointer bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border-2 
        ${isSelected ? 'border-blue-500' : 'border-transparent'} 
        transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1`}
    >
      <img
        src={landmark.imageUrl || 'https://via.placeholder.com/400x300?text=No+Image'}
        alt={landmark.name}
        className="w-full h-48 object-cover"
      />
      <div className="p-4">
        <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{landmark.name}</h3>
        <p className="text-gray-700 dark:text-gray-300 mb-2">
          {landmark.description || 'No description available.'}
        </p>
        <p className="text-gray-500 dark:text-gray-400 mb-1 text-sm">
          Location: {landmark.latitude?.toFixed(4)}, {landmark.longitude?.toFixed(4)}
        </p>
      </div>
    </div>
  );
}

export default LandmarkCard2;