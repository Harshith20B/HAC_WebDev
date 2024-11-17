import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Map, Navigation, Clock } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DevisePlanPage = () => {
  const location = useLocation();
  const { selectedLandmarks = [] } = location.state || {};
  const [distances, setDistances] = useState([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [map, setMap] = useState(null);

  useEffect(() => {
    // Clean up function for the map
    return () => {
      if (map) map.remove();
    };
  }, [map]);

  useEffect(() => {
    try {
      if (!selectedLandmarks.length) return;

      const validCoordinates = selectedLandmarks.filter(
        landmark => landmark.latitude && landmark.longitude
      );

      if (!validCoordinates.length) {
        console.error("No valid coordinates found");
        return;
      }

      // Initialize map
      const mapInstance = L.map('map').setView(
        [validCoordinates[0].latitude, validCoordinates[0].longitude],
        13
      );

      setMap(mapInstance);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstance);

      // Calculate distances and add markers
      const calculatedDistances = [];
      let totalDist = 0;

      validCoordinates.forEach((landmark, index) => {
        // Create marker
        const marker = L.marker([landmark.latitude, landmark.longitude])
          .addTo(mapInstance)
          .bindPopup(`
            <div class="p-2">
              <h3 class="font-bold">${landmark.name}</h3>
              <p class="text-sm">Stop ${index + 1}</p>
            </div>
          `);

        // Calculate distance if not first point
        if (index > 0) {
          const prevLandmark = validCoordinates[index - 1];
          const distance = mapInstance.distance(
            [prevLandmark.latitude, prevLandmark.longitude],
            [landmark.latitude, landmark.longitude]
          );
          
          totalDist += distance;
          calculatedDistances.push({
            from: prevLandmark.name,
            to: landmark.name,
            distance: (distance / 1000).toFixed(2)
          });
        }
      });

      // Draw path
      const coordinates = validCoordinates.map(l => [l.latitude, l.longitude]);
      L.polyline(coordinates, { color: '#3B82F6', weight: 3 }).addTo(mapInstance);

      // Fit bounds
      mapInstance.fitBounds(coordinates, { padding: [50, 50] });

      // Update state
      setDistances(calculatedDistances);
      setTotalDistance(totalDist / 1000);
      setEstimatedTime(Math.ceil((totalDist / 1000) / 30 * 60));

    } catch (error) {
      console.error("Error initializing map:", error);
    }
  }, [selectedLandmarks]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Travel Plan
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {selectedLandmarks.length} locations selected
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Map className="w-6 h-6 text-blue-500" />
              <div className="ml-3">
                <p className="text-gray-500 dark:text-gray-400 text-sm">Stops</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedLandmarks.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Navigation className="w-6 h-6 text-green-500" />
              <div className="ml-3">
                <p className="text-gray-500 dark:text-gray-400 text-sm">Distance</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {totalDistance.toFixed(2)} km
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Clock className="w-6 h-6 text-purple-500" />
              <div className="ml-3">
                <p className="text-gray-500 dark:text-gray-400 text-sm">Est. Time</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {estimatedTime} min
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Map */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div id="map" className="h-96 w-full rounded-lg"></div>
          </div>

          {/* Route Details */}
          <div className="space-y-6">
            {/* Distances */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Route Details
              </h3>
              <div className="space-y-3">
                {distances.map((distance, index) => (
                  <div 
                    key={index}
                    className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {distance.from} → {distance.to}
                        </p>
                      </div>
                      <p className="font-medium text-blue-600 dark:text-blue-400">
                        {distance.distance} km
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Landmarks */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Selected Landmarks
              </h3>
              <div className="space-y-3">
                {selectedLandmarks.map((landmark, index) => (
                  <div 
                    key={landmark._id || index}
                    className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                        {index + 1}
                      </div>
                      <div className="ml-3">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {landmark.name}
                        </h4>
                        {landmark.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {landmark.description.substring(0, 60)}...
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevisePlanPage;