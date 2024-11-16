import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import LandmarkCard2 from '../components/LandmarkCard2';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function DevisePlanPage() {
  const location = useLocation();
  const { selectedLandmarks } = location.state || { selectedLandmarks: [] };
  const [distances, setDistances] = useState([]);

  useEffect(() => {
    if (!selectedLandmarks.length) return;

    const validCoordinates = selectedLandmarks.filter(
      (landmark) => landmark.latitude !== undefined && landmark.longitude !== undefined
    );

    if (!validCoordinates.length) {
      console.error("No valid latitude/longitude data for the selected landmarks.");
      return;
    }

    // Initialize the map with the first valid landmark coordinates
    const map = L.map('map').setView(
      [validCoordinates[0].latitude, validCoordinates[0].longitude],
      10
    );

    // Add a tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Calculate distances between landmarks
    const calculatedDistances = [];
    const markers = validCoordinates.map((landmark, index) => {
      const marker = L.marker([landmark.latitude, landmark.longitude]).addTo(map);

      // Custom popup content
      const popupContent = `
        <div>
          <h3 class="font-semibold text-lg">${landmark.name}</h3>
          <p class="text-sm">${landmark.description || 'No description available.'}</p>
        </div>
      `;
      
      marker.bindPopup(popupContent); // Bind the popup to the marker

      if (index > 0) {
        const previousLandmark = validCoordinates[index - 1];
        const currentLatLng = L.latLng(landmark.latitude, landmark.longitude);
        const prevLatLng = L.latLng(previousLandmark.latitude, previousLandmark.longitude);
        const distance = prevLatLng.distanceTo(currentLatLng); // Distance in meters

        calculatedDistances.push({
          from: previousLandmark.name,
          to: landmark.name,
          distance: (distance / 1000).toFixed(2), // Convert to kilometers
        });
      }

      return [landmark.latitude, landmark.longitude];
    });

    // Draw lines between landmarks
    if (markers.length > 1) {
      L.polyline(markers, { color: 'blue' }).addTo(map);
    }

    // Fit the map to the markers
    if (markers.length) {
      map.fitBounds(markers);
    }

    // Set the distances state
    setDistances(calculatedDistances);

    return () => {
      map.remove(); // Cleanup the map on unmount
    };
  }, [selectedLandmarks]);

  return (
    <div className="container mx-auto px-4 text-center">
      <h2 className="text-2xl font-bold my-4">Devise Plan</h2>
      <p className="mb-4">Selected Landmarks:</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {selectedLandmarks.length ? (
          selectedLandmarks.map((landmark) => (
            <LandmarkCard2 key={landmark._id} landmark={landmark} />
          ))
        ) : (
          <p>No landmarks selected.</p>
        )}
      </div>

      {/* Main Content Container */}
      <div className="mt-6 flex flex-col lg:flex-row gap-6">
        {/* Map Section (Left) */}
        <div className="lg:w-1/2 w-full h-96 rounded-lg shadow-lg" id="map"></div>

        {/* Distances Section (Right) */}
        <div className="lg:w-1/2 w-full p-4 bg-gray-800 text-white rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold mb-4">Distances Between Landmarks:</h3>
          {distances.length > 0 ? (
            <div className="flex flex-wrap justify-start gap-4">
              {distances.map((distance, index) => (
                <div
                  key={index}
                  className="bg-gray-700 p-4 rounded-lg shadow-lg w-48 text-center transition-transform transform hover:scale-105"
                >
                  <p className="font-medium">{distance.from} to {distance.to}</p>
                  <p className="text-lg font-bold">{distance.distance} km</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400">No distances to display.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default DevisePlanPage;
