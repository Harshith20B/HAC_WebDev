import React, { useState, useEffect } from 'react';
import { Carousel } from 'react-responsive-carousel';
import { useNavigate } from 'react-router-dom';
import 'react-responsive-carousel/lib/styles/carousel.min.css';
import LandmarkCard from '../components/LandmarkCard';
import axios from 'axios';

// Import images
import background1 from '../images/background1.jpg';
import background2 from '../images/background2.jpg';
import background3 from '../images/background3.jpg';

function HomePage() {
  const [location, setLocation] = useState('');
  const [radius, setRadius] = useState('');
  const [landmarks, setLandmarks] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLandmarks = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/landmarks');
        setLandmarks(response.data);
      } catch (error) {
        console.error("Error fetching landmarks:", error);
      }
    };

    fetchLandmarks();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/search-results?location=${location}&radius=${radius}`);
  };

  return (
    <div>
      {/* Carousel with Search Overlay */}
      <div className="relative max-w-screen-lg mx-auto mt-4">
        <Carousel
          autoPlay
          infiniteLoop
          interval={5000}
          showThumbs={false}
          showStatus={false}
          className="rounded-lg overflow-hidden"
        >
          <div>
            <img src={background1} alt="Scenic View 1" />
            <p className="legend">Explore Mountains</p>
          </div>
          <div>
            <img src={background2} alt="Scenic View 2" />
            <p className="legend">Discover Cities</p>
          </div>
          <div>
            <img src={background3} alt="Scenic View 3" />
            <p className="legend">Relax at Beaches</p>
          </div>
        </Carousel>

        {/* Search Form Overlay */}
        <form 
          onSubmit={handleSearch} 
          className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 p-4 rounded-lg"
        >
          <h2 className="text-white text-xl font-bold mb-4">Find Landmarks Nearby</h2>
          <div className="flex flex-col sm:flex-row items-center w-full max-w-md space-y-2 sm:space-y-0 sm:space-x-2">
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
        </form>
      </div>

      {/* Most Visited Landmarks Section */}
      <div className="mt-8 container mx-auto px-4">
        <h2 className="text-2xl font-bold mb-4 text-center">Most Visited Landmarks</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {landmarks.map((landmark) => (
            <LandmarkCard key={landmark._id} landmark={landmark} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-blue-600 text-white text-center p-6 w-full mt-8">
        <p className="text-sm mb-2">&copy; {new Date().getFullYear()} Tourify. All rights reserved.</p>
        <div className="flex justify-center space-x-4 text-sm">
          <a href="/about" className="hover:underline">About Us</a>
          <a href="/contact" className="hover:underline">Contact Us</a>
          <a href="/privacy" className="hover:underline">Privacy Policy</a>
          <a href="/terms" className="hover:underline">Terms of Service</a>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
