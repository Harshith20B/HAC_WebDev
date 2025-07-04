import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import LandmarkCard2 from '../components/LandmarkCard2';

// Loading animation component
const LoadingAnimation = () => {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16">
      {/* Animated landmark icon */}
      <div className="relative mb-8">
        {/* Central landmark icon */}
        <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center shadow-lg animate-pulse">
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      {/* Loading text with typewriter effect */}
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 animate-pulse">
          Discovering Amazing Places
        </h3>
        <div className="flex items-center justify-center space-x-1">
          <span className="text-lg text-gray-600 dark:text-gray-300">Searching</span>
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>

      {/* Skeleton cards preview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12 w-full max-w-6xl">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden animate-pulse">
            <div className="h-48 bg-gray-300 dark:bg-gray-700"></div>
            <div className="p-4">
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const getBudgetNumericValue = (budgetLevel) => {
  const values = {
    low: 10000,    // Mid-point of low range
    medium: 27500, // Mid-point of medium range  
    high: 50000    // Representative high value
  };
  return values[budgetLevel] || values.medium;
};

function SearchResultsPage() {
  const [landmarks, setLandmarks] = useState([]);
  const [selectedLandmarks, setSelectedLandmarks] = useState([]);
  const [numberOfDays, setNumberOfDays] = useState(3);
  const [budget, setBudget] = useState('medium');// Changed to INR equivalent (500 USD ≈ ₹25,000)
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const searchLocation = searchParams.get('location');
  const searchRadius = searchParams.get('radius');
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://hac-webdev-2.onrender.com/api';

  // Helper function to format currency in INR
const getBudgetRangeLabel = (budgetLevel) => {
  const ranges = {
    low: '₹5,000 - ₹15,000',
    medium: '₹15,001 - ₹40,000', 
    high: '₹40,001+'
  };
  return ranges[budgetLevel] || ranges.medium;
};


useEffect(() => {
    const fetchLandmarks = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${API_BASE_URL}/explore/search`, {
          params: { 
            location: searchLocation, 
            radius: searchRadius 
          },
        });
        
        if (response.data.length === 0) {
          setError('No landmarks found for this location. Try increasing the search radius.');
        } else {
          setLandmarks(response.data);
        }
      } catch (error) {
        console.error('Error fetching landmarks:', error);
        setError('Failed to fetch landmarks. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    if (searchLocation && searchRadius) {
      fetchLandmarks();
    }
  }, [searchLocation, searchRadius]);

  const selectLandmark = (landmarkName) => {
    console.log('Selecting landmark:', landmarkName);
    setSelectedLandmarks(currentSelected => {
      if (currentSelected.includes(landmarkName)) {
        return currentSelected.filter(name => name !== landmarkName);
      } else {
        return [...currentSelected, landmarkName];
      }
    });
  };

const handleDevisePlan = () => {
  const selectedData = landmarks
    .filter(l => selectedLandmarks.includes(l.name))
    .map(landmark => ({
      _id: landmark._id || `landmark-${landmark.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: landmark.name,
      description: landmark.description,
      latitude: landmark.latitude,
      longitude: landmark.longitude,
      imageUrl: landmark.imageUrl
    }));

  console.log('Navigating with selected landmarks:', selectedData);
  
  if (selectedData.length > 0) {
    navigate('/devise-plan', { 
      state: { 
        selectedLandmarks: selectedData,
        tripDetails: {
          location: searchLocation,
          radius: searchRadius,
          numberOfDays,
          budgetLevel: budget, // Changed from budget to budgetLevel
          budget: getBudgetNumericValue(budget) // Add numeric value for backend compatibility
        }
      } 
    });
  }
};


  return (
    <div className="relative min-h-screen bg-white dark:bg-gray-900">
      {error && (
        <div className="container mx-auto px-4 pt-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        </div>
      )}
      <div className="container mx-auto px-4 pb-32">
        <h2 className="text-2xl font-bold mb-4 text-center pt-6 text-gray-800 dark:text-white">
          Landmarks near {searchLocation} within {searchRadius} km
        </h2>
        
        {/* Trip Planning Controls */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
            Plan Your Trip
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Number of Days
              </label>
              <select
                value={numberOfDays}
                onChange={(e) => setNumberOfDays(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {[1, 2, 3, 4, 5, 6, 7].map(day => (
                  <option key={day} value={day}>
                    {day} {day === 1 ? 'Day' : 'Days'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Budget Range
              </label>
              <select
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="low">Low </option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {budget === 'low' && 'Budget-friendly attractions, street food, public transport'}
                {budget === 'medium' && 'Mix of popular attractions and local experiences'}
                {budget === 'high' && 'Premium attractions, comfortable experiences, quality dining'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <LoadingAnimation />
          ) : landmarks.length > 0 ? (
            landmarks.map((landmark) => (
              <LandmarkCard2
                key={landmark.name}
                landmark={landmark}
                isSelected={selectedLandmarks.includes(landmark.name)}
                onSelect={selectLandmark}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-16">
              <div className="mb-4">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-300 mb-2">
                No landmarks found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Try searching with a different location or increasing the radius.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Fixed position button container */}
      <div className="fixed bottom-0 right-0 left-0 bg-white dark:bg-gray-900 shadow-lg border-t border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Selected landmarks: {selectedLandmarks.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {numberOfDays} days • {getBudgetRangeLabel(budget)} budget
            </div>
          </div>
          <button
            onClick={handleDevisePlan}
            className="w-full bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            disabled={selectedLandmarks.length === 0}
          >
            Generate Travel Itinerary
          </button>
        </div>
      </div>

      {/* Debug info */}
      <div className="fixed top-0 right-0 p-4 bg-black bg-opacity-50 text-white text-xs">
        Selected: {selectedLandmarks.join(', ')}
      </div>
    </div>
  );
}

export default SearchResultsPage;