import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Map, Navigation, Clock, Calendar, DollarSign, MapPin, Users, Loader2, Home, Car, Utensils, IndianRupee, Cloud } from 'lucide-react';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import WeatherForecast from '../components/WeatherForecast';

const DevisePlanPage = () => {
  const location = useLocation();
  const { selectedLandmarks = [], tripDetails = {} } = location.state || {};
  const [distances, setDistances] = useState([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [map, setMap] = useState(null);
  const [itinerary, setItinerary] = useState(null);
  const [isGeneratingItinerary, setIsGeneratingItinerary] = useState(false);
  const [error, setError] = useState(null);
  const [showWeather, setShowWeather] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);
  
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://hac-webdev-2.onrender.com/api';

  useEffect(() => {
    const checkDarkMode = () => {
      const htmlHasDark = document.documentElement.classList.contains('dark');
      const bodyHasDark = document.body.classList.contains('dark');
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(htmlHasDark || bodyHasDark || systemPrefersDark);
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });
    observer.observe(document.body, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkDarkMode);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkDarkMode);
    };
  }, []);

  const formatINR = (amount) => {
    if (typeof amount !== 'number') return '₹0';
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  useEffect(() => {
    return () => {
      clearMapElements();
      if (mapRef.current) {
        try {
          mapRef.current.remove();
          mapRef.current = null;
        } catch (error) {
          console.warn('Error cleaning up map:', error);
        }
      }
    };
  }, []);

  const clearMapElements = () => {
    if (markersRef.current) {
      markersRef.current.forEach(marker => {
        if (mapRef.current && marker) {
          mapRef.current.removeLayer(marker);
        }
      });
      markersRef.current = [];
    }
    
    if (polylineRef.current && mapRef.current) {
      mapRef.current.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }
  };

  const getCurrentLandmarks = () => {
    if (itinerary?.optimizedLandmarks && 
        itinerary.optimizedLandmarks.length > 0) {
      return itinerary.optimizedLandmarks;
    }
    return selectedLandmarks;
  };

  const updateMapWithLandmarks = () => {
    if (!mapRef.current) return;

    const currentLandmarks = getCurrentLandmarks();
    if (!currentLandmarks.length) return;

    clearMapElements();

    const validCoordinates = currentLandmarks.filter(
      landmark => landmark.latitude && landmark.longitude
    );

    if (!validCoordinates.length) return;

    const calculatedDistances = [];
    let totalDist = 0;

    validCoordinates.forEach((landmark, index) => {
      const markerIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: ${landmark.isAdditional ? '#10B981' : '#3B82F6'}; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${index + 1}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      const marker = L.marker([landmark.latitude, landmark.longitude], { icon: markerIcon })
        .addTo(mapRef.current)
        .bindPopup(`
          <div class="p-2">
            <h3 class="font-bold">${landmark.name}</h3>
            <p class="text-sm">Stop ${index + 1}</p>
            ${landmark.isAdditional ? '<p class="text-xs text-green-600">AI Recommended</p>' : ''}
            ${landmark.description ? `<p class="text-xs mt-1">${landmark.description}</p>` : ''}
            ${landmark.popularity ? `<p class="text-xs">Popularity: ${Math.round(landmark.popularity)}/100</p>` : ''}
          </div>
        `);

      markersRef.current.push(marker);

      if (index > 0) {
        const prevLandmark = validCoordinates[index - 1];
        const distance = mapRef.current.distance(
          [prevLandmark.latitude, prevLandmark.longitude],
          [landmark.latitude, landmark.longitude]
        );
        
        totalDist += distance;
        calculatedDistances.push({
          from: prevLandmark.name,
          to: landmark.name,
          distance: (distance / 1000).toFixed(2),
          travelTime: Math.ceil((distance / 1000) / 30 * 60) // Estimated travel time in minutes
        });
      }
    });

    const coordinates = validCoordinates.map(l => [l.latitude, l.longitude]);
    polylineRef.current = L.polyline(coordinates, { 
      color: '#3B82F6', 
      weight: 4, 
      opacity: 0.8,
      dashArray: '5, 10'
    }).addTo(mapRef.current);

    mapRef.current.fitBounds(coordinates, { padding: [20, 20] });

    setDistances(calculatedDistances);
    setTotalDistance(totalDist / 1000);
    setEstimatedTime(Math.ceil((totalDist / 1000) / 30 * 60));
  };

  useEffect(() => {
    const initializeMap = () => {
      if (!selectedLandmarks.length) return;

      const mapContainer = document.getElementById('map');
      if (!mapContainer) return;

      if (!mapRef.current) {
        try {
          mapContainer.innerHTML = '';
          const mapInstance = L.map('map').setView(
            [selectedLandmarks[0].latitude, selectedLandmarks[0].longitude],
            13
          );
          
          mapRef.current = mapInstance;
          setMap(mapInstance);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(mapInstance);
        } catch (error) {
          console.error("Error initializing map:", error);
          return;
        }
      }

      updateMapWithLandmarks();
    };

    initializeMap();
  }, [selectedLandmarks]);

  useEffect(() => {
    if (mapRef.current && itinerary?.optimizedLandmarks) {
      updateMapWithLandmarks();
    }
  }, [itinerary?.optimizedLandmarks]);

  const generateDetailedItinerary = async () => {
    if (!selectedLandmarks.length || !tripDetails.numberOfDays) {
      setError('Missing required data for itinerary generation');
      return;
    }

    setIsGeneratingItinerary(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/explore/generate-itinerary`, {
        landmarks: selectedLandmarks,
        tripDetails: {
          ...tripDetails,
          location: tripDetails.location || 'Unknown Location'
        }
      });

      if (response.data.success) {
        // Ensure all landmarks are included in the itinerary days
        const optimizedLandmarks = response.data.data.optimizedLandmarks || selectedLandmarks;
        const daysWithAllLandmarks = response.data.data.itinerary.days.map(day => {
          const dayLandmarks = optimizedLandmarks.filter(l => l.clusterDay === day.day);
          return {
            ...day,
            landmarks: dayLandmarks
          };
        });
        
        setItinerary({
          ...response.data.data,
          itinerary: {
            ...response.data.data.itinerary,
            days: daysWithAllLandmarks
          }
        });
      } else {
        throw new Error(response.data.message || 'Failed to generate itinerary');
      }
    } catch (error) {
      console.error('Error generating itinerary:', error);
      setError(error.response?.data?.message || error.message || 'Failed to generate itinerary');
    } finally {
      setIsGeneratingItinerary(false);
    }
  };

  const getActivityIcon = (activity) => {
    const activityLower = activity.toLowerCase();
    if (activityLower.includes('hotel') || activityLower.includes('accommodation')) {
      return <Home className="h-4 w-4" />;
    } else if (activityLower.includes('transport') || activityLower.includes('travel')) {
      return <Car className="h-4 w-4" />;
    } else if (activityLower.includes('lunch') || activityLower.includes('dinner') || activityLower.includes('breakfast') || activityLower.includes('meal')) {
      return <Utensils className="h-4 w-4" />;
    }
    return <MapPin className="h-4 w-4" />;
  };

  const getBudgetRangeLabel = () => {
    if (!itinerary?.budgetBreakdown?.level) return '';
    const level = itinerary.budgetBreakdown.level;
    return level === 'low' ? '₹5,000 - ₹15,000' :
           level === 'medium' ? '₹15,001 - ₹40,000' :
           '₹40,001+';
  };

  // Calculate total cost for a day including all activities
  const calculateDayCost = (day) => {
    if (!day.schedule) return 0;
    return day.schedule.reduce((total, activity) => {
      return total + (activity.cost || 0);
    }, 0);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Travel Itinerary - {tripDetails.location || 'Your Trip'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {selectedLandmarks.length} locations • {tripDetails.numberOfDays} days • Budget: {getBudgetRangeLabel()}
          </p>
        </div>

        {/* Trip Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center">
              <MapPin className="h-8 w-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Destinations</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedLandmarks.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center">
              <Navigation className="h-8 w-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Distance</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {itinerary?.landmarkSummary?.totalDistance?.toFixed(1) || totalDistance.toFixed(1)} km
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Travel Time</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {itinerary?.landmarkSummary?.totalEstimatedTime || estimatedTime} min
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center">
              {/* <IndianRupee className="h-8 w-8 text-purple-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Budget Range</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{getBudgetRangeLabel()}</p>
              </div> */}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Map Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <Map className="mr-2" />
                Optimized Route Map
              </h2>
            </div>
            <div className="p-6">
              <div id="map" className="h-96 rounded-lg border" ref={mapContainerRef}></div>
            </div>
          </div>

          {/* Route Details */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <Navigation className="mr-2" />
                Optimized Route Order
                {itinerary?.optimizedLandmarks && (
                  <span className="ml-2 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full">
                    AI Enhanced
                  </span>
                )}
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {getCurrentLandmarks().map((landmark, index) => (
                  <div key={`${landmark.name}-${index}`} className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 w-8 h-8 ${landmark.isAdditional ? 'bg-green-500' : 'bg-blue-500'} text-white rounded-full flex items-center justify-center text-sm font-bold`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{landmark.name}</h3>
                        {landmark.isAdditional && (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full">
                            AI Added
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{landmark.description}</p>
                      {landmark.popularity && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Popularity: {Math.round(landmark.popularity)}/100
                        </p>
                      )}
                      {landmark.rating && (
                        <p className="text-xs text-yellow-600 dark:text-yellow-400">
                          Rating: {landmark.rating}/5
                        </p>
                      )}
                      {landmark.entryCost && (
                        <p className="text-xs text-purple-600 dark:text-purple-400">
                          Entry Fee: {formatINR(landmark.entryCost)}
                        </p>
                      )}
                      {distances[index - 1] && (
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Distance from previous: {distances[index - 1].distance} km
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Estimated travel time: {distances[index - 1].travelTime} mins
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Budget Breakdown Section */}
        {/* {itinerary?.budgetBreakdown && (
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <IndianRupee className="mr-2" />
                Budget Breakdown
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {formatINR(itinerary.budgetBreakdown.attractions)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Attractions</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatINR(itinerary.budgetBreakdown.food)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Food</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {formatINR(itinerary.budgetBreakdown.transport)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Transport</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {formatINR(itinerary.budgetBreakdown.miscellaneous)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Miscellaneous</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {formatINR(itinerary.budgetBreakdown.total)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Budget Range:</span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {itinerary.budgetBreakdown.range}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-600 dark:text-gray-400">Daily Average:</span>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    {formatINR(itinerary.budgetBreakdown.dailyAverage)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )} */}

        {/* Detailed Itinerary Section */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <Calendar className="mr-2" />
                Detailed Day-by-Day Itinerary
                {itinerary?.timeUtilization && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                    Time Utilization: {itinerary.timeUtilization.utilizationPercentage}%
                  </span>
                )}
              </h2>
              {!itinerary && !isGeneratingItinerary && (
                <button
                  onClick={generateDetailedItinerary}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Generate Itinerary
                </button>
              )}
            </div>
          </div>
          
          <div className="p-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-600 dark:text-red-400">{error}</p>
                <button
                  onClick={generateDetailedItinerary}
                  className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {isGeneratingItinerary && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Generating your personalized itinerary...</p>
              </div>
            )}

        {itinerary?.itinerary?.days && (
              <div className="space-y-8">
                {itinerary.itinerary.days.map((day, dayIndex) => {
                  const dayCost = calculateDayCost(day);
                  const dayBudget = itinerary.budgetBreakdown.dailyAverage;
                  const budgetPercentage = Math.round((dayCost / dayBudget) * 100);
                  
                  // Get all landmarks for this day from optimizedLandmarksByDay
                  const dayLandmarks = itinerary.optimizedLandmarksByDay ? 
                    itinerary.optimizedLandmarksByDay[`day${day.day}`] || [] : 
                    [];
                  
                  // Find which landmarks weren't scheduled
                  const scheduledLandmarks = new Set();
                  day.schedule?.forEach(activity => {
                    if (activity.activity?.includes('Visit')) {
                      const landmarkName = activity.activity.replace('Visit ', '').trim();
                      scheduledLandmarks.add(landmarkName);
                    }
                  });
                  
                  const unscheduledLandmarks = dayLandmarks.filter(
                    landmark => !scheduledLandmarks.has(landmark.name)
                  );
                  
                  return (
                    <div key={dayIndex} className="border-l-4 border-blue-500 pl-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                          Day {day.day} - {day.date}
                        </h3>
                        <div className="text-right">
                          {/* <p className="text-sm text-gray-600 dark:text-gray-400">Day Budget: {formatINR(dayBudget)}</p> */}
                          {/* <p className={`text-lg font-bold ${
                            dayCost > dayBudget ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                          }`}>
                            Day Cost: {formatINR(dayCost)} ({budgetPercentage}%)
                          </p> */}
                        </div>
                      </div>
                      
                      {/* Display all landmarks for this day */}
                      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium text-blue-800 dark:text-blue-200">Places to Visit:</h4>
                          <span className="text-sm text-blue-700 dark:text-blue-300">
                            {dayLandmarks.length} locations
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {dayLandmarks.map((landmark, idx) => (
                            <span 
                              key={idx} 
                              className={`px-3 py-1 text-sm rounded-full flex items-center ${
                                scheduledLandmarks.has(landmark.name) ? 
                                'bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200' :
                                'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                              }`}
                            >
                              <MapPin className="h-3 w-3 mr-1" />
                              {landmark.name}
                              {!scheduledLandmarks.has(landmark.name) && (
                                <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">(not scheduled)</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>


                      <div className="space-y-4">
                        {day.schedule?.map((activity, activityIndex) => (
                          <div key={activityIndex} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  {getActivityIcon(activity.activity)}
                                  <h4 className="font-medium text-gray-900 dark:text-white">{activity.time}</h4>
                                </div>
                                <p className="text-gray-800 dark:text-gray-200 font-medium">{activity.activity}</p>
                                {activity.location && (
                                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1 flex items-center">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    {activity.location}
                                  </p>
                                )}
                                {activity.duration && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    Duration: {activity.duration}
                                  </p>
                                )}
                                {activity.tips && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                                    💡 {activity.tips}
                                  </p>
                                )}
                                {activity.travelInfo && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Travel: {activity.travelInfo.distance} • {activity.travelInfo.duration}
                                  </p>
                                )}
                              </div>
                              {activity.cost && activity.costType === 'entry' && (
                                <div className="text-right ml-4">
                                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                                    {formatINR(activity.cost)}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Entry Fee</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Show unscheduled landmarks if any */}
                      {unscheduledLandmarks.length > 0 && (
                        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                          <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                            ⚠️ {unscheduledLandmarks.length} Landmarks Not Scheduled
                          </h4>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
                            These landmarks could be visited if you have extra time:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {unscheduledLandmarks.map((landmark, idx) => (
                              <span 
                                key={idx} 
                                className="px-3 py-1 bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 text-sm rounded-full flex items-center"
                              >
                                <MapPin className="h-3 w-3 mr-1" />
                                {landmark.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Day summary */}
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            Day {day.day} Total Cost:
                          </span>
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            {formatINR(dayCost)}
                          </span>
                        </div>
                        {day.unusedTime && (
                          <div className="flex justify-between items-center mt-2 text-sm">
                            <span className="text-gray-600 dark:text-gray-400">
                              Unused Time:
                            </span>
                            <span className="font-bold text-orange-600 dark:text-orange-400">
                              {day.unusedTime}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {/* Trip Tips */}
                {itinerary.tips && itinerary.tips.length > 0 && (
                  <div className="mt-8 p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      💡 Travel Tips
                    </h3>
                    <ul className="space-y-2">
                      {itinerary.tips.map((tip, index) => (
                        <li key={index} className="text-gray-700 dark:text-gray-300 flex items-start">
                          <span className="text-yellow-500 mr-2">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {!itinerary && !isGeneratingItinerary && !error && (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  Click "Generate Itinerary" to create a detailed day-by-day plan for your trip.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-8 flex justify-center space-x-4">
          <button 
            onClick={() => window.print()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Navigation className="mr-2 h-5 w-5" />
            Export Itinerary
          </button>
          <button 
            onClick={() => setShowWeather(!showWeather)}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
          >
            <Cloud className="mr-2 h-5 w-5" />
            {showWeather ? 'Hide Weather' : 'Show Weather Forecast'}
          </button>
          <button 
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `${tripDetails.location} Travel Itinerary`,
                  text: `Check out my ${tripDetails.numberOfDays}-day trip to ${tripDetails.location}!`,
                  url: window.location.href
                });
              }
            }}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center"
          >
            <Users className="mr-2 h-5 w-5" />
            Share Trip
          </button>
        </div>

        {/* Weather Forecast Section */}
        {showWeather && (
          <div className="mt-8">
            <WeatherForecast 
              city={tripDetails.location}
              tripDetails={tripDetails}
              isVisible={showWeather}
              darkMode={isDarkMode}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DevisePlanPage;