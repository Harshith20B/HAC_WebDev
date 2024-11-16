import React, { useState, useEffect } from 'react';
import { Route, Routes, Link, useNavigate } from 'react-router-dom';
import Signup from './pages/Signup';
import Login from './pages/Login';
import VerifyOtp from './pages/VerifyOtp';
import HomePage from './pages/HomePage';
import SearchResultsPage from './pages/SearchResultsPage';
import Shops from './pages/ShopPage';
import Packages from './pages/PackagesPage';
import Connect from './pages/Connect';
import LandmarkDetails from './pages/LandmarkDetails';
import DevisePlanPage from './pages/DevisePlanPage';
import axios from 'axios';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // For mobile menu toggle
  const [notificationShown, setNotificationShown] = useState(false); // Track if notification has been shown
  const [user, setUser] = useState(null); // Store user data
  const [profileMenuOpen, setProfileMenuOpen] = useState(false); // For the profile dropdown
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = JSON.parse(localStorage.getItem('user'));
    setIsLoggedIn(!!token);
    setUser(storedUser);
  }, []);

  useEffect(() => {
    // Only show the notification once (when the app first loads)
    if (!notificationShown) {
      if (Notification.permission === 'granted') {
        new Notification('Welcome!', {
          body: 'Thank you for visiting Tourify! We hope you have a great experience exploring landmarks.',
        });
        setNotificationShown(true); // Set notification as shown
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification('Welcome!', {
              body: 'Thank you for visiting Tourify! We hope you have a great experience exploring landmarks.',
            });
            setNotificationShown(true); // Set notification as shown
          }
        });
      }
    }
  }, [notificationShown]);

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:5000/api/auth/logout');
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setIsLoggedIn(false);
      setUser(null);
      navigate('/');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const toggleProfileMenu = () => setProfileMenuOpen(!profileMenuOpen);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <nav className="bg-gray-900 p-4 text-white w-full">
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
            <Link to="/connect" className="hover:bg-gray-700 px-4 py-2 rounded">Connect</Link>
            {isLoggedIn ? (
              <div className="relative">
                <button 
                  className="flex items-center bg-gray-700 px-4 py-2 rounded"
                  onClick={toggleProfileMenu}
                >
                  <span className="font-bold text-2xl">{user ? user.name[0] : ''}</span> {/* Increased size of first letter */}
                </button>
                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white text-gray-900 shadow-lg rounded z-50">
                    <Link to="/profile" className="block px-4 py-2 hover:bg-gray-200">Edit Profile</Link>
                    <button 
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-200"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
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
            <Link to="/connect" className="block text-white py-2">Connect</Link>
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
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search-results" element={<SearchResultsPage />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login setIsLoggedIn={setIsLoggedIn} setUser={setUser} />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/shops" element={<Shops />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/connect" element={<Connect />} />
          <Route path="/landmark-details/:landmarkId" element={<LandmarkDetails />} />
          <Route path="/devise-plan" element={<DevisePlanPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
