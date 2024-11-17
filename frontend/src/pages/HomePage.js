import React, { useState, useEffect } from 'react';
import DarkModeToggle from '../components/DarkModeToggle';
import { Carousel } from 'react-responsive-carousel';
import { useNavigate } from 'react-router-dom';
import 'react-responsive-carousel/lib/styles/carousel.min.css';
import LandmarkCard1 from '../components/LandmarkCard1';
import axios from 'axios';
import { FaLocationArrow } from 'react-icons/fa';

import background1 from '../images/background1.jpg';
import background2 from '../images/background2.jpg';
import background3 from '../images/background3.jpg';

function HomePage() {
  const [location, setLocation] = useState('');
  const [radius, setRadius] = useState('');
  const [landmarks, setLandmarks] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const navigate = useNavigate();

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
    <div className="flex flex-col dark:bg-darkBackground bg-lightBackground min-h-screen">
      <header className="relative h-[80vh]">
        <Carousel
          autoPlay
          infiniteLoop
          interval={5000}
          showThumbs={false}
          showStatus={false}
          className="h-full"
        >
          {[{ img: background1, text: 'Explore Mountains' }, { img: background2, text: 'Discover Cities' }, { img: background3, text: 'Relax at Beaches' }]
            .map((slide, index) => (
              <div key={index} className="relative h-[80vh]">
                <img src={slide.img} alt={`Scenic View ${index + 1}`} className="w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 w-full bg-black bg-opacity-50 py-4 text-center">
                  <p className="text-white text-xl font-bold">{slide.text}</p>
                </div>
              </div>
            ))}
        </Carousel>

        {/* Search Form Overlay */}
        <form
          onSubmit={handleSearch}
          className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-60 px-4"
        >
          <h2 className="text-white text-2xl font-bold mb-6">Find Landmarks Nearby</h2>
          <div className="flex flex-col w-full max-w-sm space-y-4">
            <input
              type="text"
              placeholder="Enter location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="p-3 rounded-lg border border-gray-300 focus:outline-none"
            />
            <input
              type="number"
              placeholder="Radius (km)"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              className="p-3 rounded-lg border border-gray-300 focus:outline-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-center items-center w-full max-w-sm space-y-4 sm:space-y-0 sm:space-x-4 mt-6">
            <button
              type="submit"
              className="px-4 py-3 bg-blue-600 text-white rounded-lg w-full sm:w-auto hover:bg-blue-700"
            >
              Search
            </button>

            <button
              type="button"
              onClick={getUserLocation}
              className="px-4 py-3 bg-black text-white rounded-lg flex items-center justify-center hover:bg-gray-800 w-full sm:w-auto"
              title="Use My Current Location"
            >
              <FaLocationArrow className="mr-2 text-xl" />
              Use My Location
            </button>
          </div>
        </form>
      </header>

      {/* Most Visited Landmarks Section */}
      <div className="w-full">
        <div className="container mx-auto px-4 py-16">
          <h2 className="text-3xl font-extrabold text-center text-black dark:text-white mb-12">
            Explore the Most Visited Landmarks
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {landmarks.length > 0 ? (
              landmarks.map((landmark) => (
                <LandmarkCard1 key={landmark._id} landmark={landmark} />
              ))
            ) : (
              <p className="text-black dark:text-white text-center">Loading landmarks...</p>
            )}
          </div>
        </div>
      </div>

      {/* Footer with dark/light mode colors */}
      <footer className="w-full bg-blue-600 dark:bg-black text-black dark:text-white">
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