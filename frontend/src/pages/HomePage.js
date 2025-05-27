import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FaLocationArrow, FaSearch, FaInstagram, FaTwitter, FaFacebook, FaLinkedin } from 'react-icons/fa';
import axios from 'axios';

const HomePage = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [location, setLocation] = useState('');
  const [radius, setRadius] = useState('');
  const [landmarks, setLandmarks] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://hac-webdev-2.onrender.com/api';
  // Fetch landmarks from the database
  useEffect(() => {
    axios.get(`${API_BASE_URL}/landmarks`)
      .then((response) => {
        setLandmarks(response.data);  // Assume landmarks are returned in an array
      })
      .catch((error) => {
        console.error("Error fetching landmarks:", error);
      });
  }, []);

  const heroImages = [
    {
      url: "https://images.unsplash.com/photo-1531572753322-ad063cecc140",
      title: "Explore Amazing Places",
      subtitle: "Your next adventure awaits"
    },
    {
      url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470",
      title: "Discover Hidden Gems",
      subtitle: "Find unique destinations"
    },
    {
      url: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1",
      title: "Create Memories",
      subtitle: "Experience unforgettable moments"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/search-results?location=${location}&radius=${radius}`);
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation(`${latitude}, ${longitude}`);
        },
        (error) => {
          console.error('Error:', error);
          alert('Could not retrieve your location. Please enter it manually.');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <div className="relative h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImageIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0"
          >
            <div
              className="w-full h-full bg-cover bg-center"
              style={{
                backgroundImage: `url(${heroImages[currentImageIndex].url})`,
              }}
            >
              <div className="absolute inset-0 bg-black bg-opacity-50" />
            </div>

          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
              {heroImages[currentImageIndex].title}
            </h1>
            <p className="text-xl md:text-2xl text-white mb-8">
              {heroImages[currentImageIndex].subtitle}
            </p>
          </motion.div>

          <motion.form
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            onSubmit={handleSearch}
            className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl"
          >
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Enter location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full p-4 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="w-full md:w-32">
                <input
                  type="number"
                  placeholder="Radius (km)"
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  className="w-full p-4 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center"
                >
                  <FaSearch className="mr-2" />
                  Search
                </button>
                <button
                  type="button"
                  onClick={getUserLocation}
                  className="px-6 py-4 bg-gray-800 hover:bg-gray-900 text-white rounded-lg flex items-center justify-center"
                >
                  <FaLocationArrow className="mr-2" />
                  Current Location
                </button>
              </div>
            </div>
          </motion.form>
        </div>
      </div>

      {/* Featured Destinations (Landmarks) */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl font-bold text-center mb-12 dark:text-white"
          >
            Featured Destinations
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {landmarks.length > 0 ? (
              landmarks.map((landmark) => (
                <motion.div
                  key={landmark._id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  whileHover={{ y: -10 }}
                  className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg"
                >
                  <div className="relative h-64">
                    <img
                      src={landmark.imageUrl || 'https://via.placeholder.com/500'}
                      alt={landmark.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-full px-3 py-1 text-sm font-semibold">
                      ⭐ {landmark.rating || 'N/A'}
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2 dark:text-white">{landmark.name}</h3>
                    <p className="text-gray-600 dark:text-gray-300">{landmark.description}</p>
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="text-center text-gray-600 dark:text-white">Loading landmarks...</p>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">About Tourify</h3>
              <p className="text-gray-400">
                Discover the world's most amazing places with Tourify. We help you create unforgettable travel experiences.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><a href="/about" className="text-gray-400 hover:text-white">About Us</a></li>
                <li><a href="/contact" className="text-gray-400 hover:text-white">Contact</a></li>
                <li><a href="/privacy" className="text-gray-400 hover:text-white">Privacy Policy</a></li>
                <li><a href="/terms" className="text-gray-400 hover:text-white">Terms of Service</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Follow Us</h3>
              <div className="flex space-x-4">
                <a href="https://instagram.com" target="_blank" className="text-gray-400 hover:text-white"><FaInstagram size={20} /></a>
                <a href="https://twitter.com" target="_blank" className="text-gray-400 hover:text-white"><FaTwitter size={20} /></a>
                <a href="https://facebook.com" target="_blank" className="text-gray-400 hover:text-white"><FaFacebook size={20} /></a>
                <a href="https://linkedin.com" target="_blank" className="text-gray-400 hover:text-white"><FaLinkedin size={20} /></a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
