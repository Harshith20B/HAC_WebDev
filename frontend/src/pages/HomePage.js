import React, { useState, useEffect } from 'react';
import { Carousel } from 'react-responsive-carousel';
import { useNavigate } from 'react-router-dom';
import 'react-responsive-carousel/lib/styles/carousel.min.css';
import LandmarkCard from '../components/LandmarkCard';
import axios from 'axios';
import { FaLocationArrow } from 'react-icons/fa';

// Import images
import background1 from '../images/background1.jpg';
import background2 from '../images/background2.jpg';
import background3 from '../images/background3.jpg';

function HomePage() {
  const [location, setLocation] = useState('');
  const [radius, setRadius] = useState('');
  const [landmarks, setLandmarks] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const navigate = useNavigate();

  // Fetch most visited landmarks
  useEffect(() => {
    axios
      .get('http://localhost:5000/api/landmarks')
      .then((response) => {
        setLandmarks(response.data);
      })
      .catch((err) => {
        console.error('Error fetching most visited landmarks', err);
      });
  }, []);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lon: longitude });
          setLocation(`${latitude}, ${longitude}`);
        },
        (error) => {
          console.error('Error getting user location:', error);
          alert('Could not retrieve your location. Please enter it manually.');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    navigate(`/search-results?location=${location}&radius=${radius}`);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Main content wrapper */}
      <div className="flex-grow">
        {/* Carousel with Search Overlay */}
        <div className="relative w-full h-screen">
          <Carousel
            autoPlay
            infiniteLoop
            interval={5000}
            showThumbs={false}
            showStatus={false}
            className="w-full h-full"
          >
            {/* Carousel items remain the same */}
            <div className="relative w-full h-full">
              <img src={background1} alt="Scenic View 1" className="w-full h-full object-cover" />
              <div className="absolute bottom-0 left-0 w-full bg-black bg-opacity-50 py-4 text-center z-10">
                <p className="text-white text-xl font-bold">Explore Mountains</p>
              </div>
            </div>
            <div className="relative w-full h-full">
              <img src={background2} alt="Scenic View 2" className="w-full h-full object-cover" />
              <div className="absolute bottom-0 left-0 w-full bg-black bg-opacity-50 py-4 text-center z-10">
                <p className="text-white text-xl font-bold">Discover Cities</p>
              </div>
            </div>
            <div className="relative w-full h-full">
              <img src={background3} alt="Scenic View 3" className="w-full h-full object-cover" />
              <div className="absolute bottom-0 left-0 w-full bg-black bg-opacity-50 py-4 text-center z-10">
                <p className="text-white text-xl font-bold">Relax at Beaches</p>
              </div>
            </div>
          </Carousel>

          {/* Search Form Overlay */}
          <form
            onSubmit={handleSearch}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-60 p-4 rounded-lg z-20"
          >
            <h2 className="text-white text-2xl font-bold mb-6 mt-16 z-20">Find Landmarks Nearby</h2>
            <div className="flex flex-col sm:flex-row items-center w-full max-w-lg space-y-4 sm:space-y-0 sm:space-x-4">
              <input
                type="text"
                placeholder="Enter location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="p-3 w-full rounded-lg border border-gray-300 focus:outline-none"
              />
              <input
                type="number"
                placeholder="Radius (km)"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="p-3 w-full rounded-lg border border-gray-300 focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-3 bg-blue-600 text-white rounded-lg w-full sm:w-auto hover:bg-blue-700"
              >
                Search
              </button>
            </div>

            <button
              type="button"
              onClick={getUserLocation}
              className="mt-4 px-4 py-2 bg-black text-white rounded-lg flex items-center justify-center hover:bg-gray-800"
              title="Use My Current Location"
            >
              <FaLocationArrow className="mr-2 text-xl" />
              Use My Location
            </button>
          </form>
        </div>

        {/* Most Visited Landmarks Section with background */}
        <div className="bg-gray-900 py-8">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-extrabold text-center text-white mb-6">
              Explore the Most Visited Landmarks
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {landmarks.length > 0 ? (
                landmarks.map((landmark) => (
                  <LandmarkCard key={landmark._id} landmark={landmark} />
                ))
              ) : (
                <p className="text-white text-center">Loading landmarks...</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer - moved outside the container for full width */}
      <footer className="bg-black text-white w-full mt-auto">
        <div className="container mx-auto py-6 px-4">
          <p className="text-sm mb-2">&copy; {new Date().getFullYear()} Tourify. All rights reserved.</p>
          <div className="flex justify-center space-x-4 text-sm">
            <a href="/about" className="hover:underline">About Us</a>
            <a href="/contact" className="hover:underline">Contact Us</a>
            <a href="/terms" className="hover:underline">Terms & Conditions</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;