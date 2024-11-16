// src/App.js

import React, { useState, useEffect } from 'react';
import { Route, Routes, Link, useNavigate } from 'react-router-dom';
import Signup from './pages/Signup';
import Login from './pages/Login';
import VerifyOtp from './pages/VerifyOtp';
import HomePage from './pages/HomePage';
import SearchResultsPage from './pages/SearchResultsPage';
import Shops from './pages/ShopPage';
import Packages from './pages/PackagesPage';
import Reviews from './pages/Reviews';
import LandmarkDetails from './pages/LandmarkDetails'; // Import LandmarkDetails
import axios from 'axios';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // For mobile menu toggle
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:5000/api/auth/logout');
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setIsLoggedIn(false);
      navigate('/');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div>
      {/* Navbar */}
      <nav className="bg-gray-900 p-4 text-white">
        <div className="container mx-auto flex justify-between items-center">
          <div className="text-xl font-bold">
            <Link to="/">Tourify</Link>
          </div>
          {/* Mobile Menu Toggle */}
          <button
            className="lg:hidden text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <span className="material-icons">menu</span>
          </button>
          {/* Desktop Menu */}
          <div className="hidden lg:flex space-x-4">
            <Link to="/shops" className="hover:bg-gray-700 px-4 py-2 rounded">Shops</Link>
            <Link to="/packages" className="hover:bg-gray-700 px-4 py-2 rounded">Packages</Link>
            <Link to="/reviews" className="hover:bg-gray-700 px-4 py-2 rounded">Reviews</Link>
            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                className="bg-white text-gray-900 px-4 py-2 rounded hover:bg-gray-300"
              >
                Logout
              </button>
            ) : (
              <>
                <Link to="/signup" className="bg-white text-gray-900 px-4 py-2 rounded hover:bg-gray-300">
                  Sign Up
                </Link>
                <Link to="/login" className="bg-white text-gray-900 px-4 py-2 rounded hover:bg-gray-300">
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden bg-gray-900 p-4">
            <Link to="/" className="block text-white py-2">Home</Link>
            <Link to="/shops" className="block text-white py-2">Shops</Link>
            <Link to="/packages" className="block text-white py-2">Packages</Link>
            <Link to="/reviews" className="block text-white py-2">Reviews</Link>
            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                className="block text-white py-2"
              >
                Logout
              </button>
            ) : (
              <>
                <Link to="/signup" className="block text-white py-2">Sign Up</Link>
                <Link to="/login" className="block text-white py-2">Login</Link>
              </>
            )}
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="container mx-auto p-4 text-center">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search-results" element={<SearchResultsPage />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login setIsLoggedIn={setIsLoggedIn} />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/shops" element={<Shops />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/landmark-details/:landmarkId" element={<LandmarkDetails />} /> {/* Add this route */}
        </Routes>
      </main>
    </div>
  );
}

export default App;
