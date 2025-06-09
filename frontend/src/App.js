import React, { useState, useEffect } from 'react';
import { Route, Routes, Link, useNavigate } from 'react-router-dom';
import Signup from './pages/Signup';
import Login from './pages/Login';
import VerifyOtp from './pages/VerifyOtp';
import HomePage from './pages/HomePage';
import SearchResultsPage from './pages/SearchResultsPage';
import Shops from './pages/ShopPage';
import Connect from './pages/Connect';
import LandmarkDetails from './pages/LandmarkDetails';
import DevisePlanPage from './pages/DevisePlanPage';
import DarkModeToggle from './components/DarkModeToggle';
import Posts from './pages/Posts'; 
import axios from 'axios';
import TravelForm from './pages/TravelForm';
import EditProfile from './pages/EditProfile';
import EditTravelForm from './components/EditTravelForm';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [notificationShown, setNotificationShown] = useState(false);
  const [user, setUser] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false); // Add dark mode state
  const navigate = useNavigate();

  // Hardcoded API Base URL
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://hac-webdev-2.onrender.com/api';

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode) {
      const isDark = savedDarkMode === 'true';
      setDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = JSON.parse(localStorage.getItem('user'));
    setIsLoggedIn(!!token);
    setUser(storedUser);
  }, []);

  useEffect(() => {
    if (!notificationShown) {
      if (Notification.permission === 'granted') {
        new Notification('Welcome!', {
          body: 'Thank you for visiting Tourify! We hope you have a great experience exploring landmarks.',
        });
        setNotificationShown(true);
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification('Welcome!', {
              body: 'Thank you for visiting Tourify! We hope you have a great experience exploring landmarks.',
            });
            setNotificationShown(true);
          }
        });
      }
    }
  }, [notificationShown]);

  const handleLogout = async () => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      
      // With JWT, we just need to notify the backend of logout
      // but we don't actually need to wait for a response
      // since we'll clear the token client-side
      axios.post(`${API_BASE_URL}/auth/logout`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).catch(err => {
        // Even if the server request fails, we still want to log out locally
        console.log('Server logout notification failed, but continuing with client logout');
      });
      
      // Clear local storage regardless of server response
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setIsLoggedIn(false);
      setUser(null);
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
      // Still clear local data even if there's an error
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setIsLoggedIn(false);
      setUser(null);
      navigate('/');
    }
  };

  // Configure axios default headers when token is available
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [isLoggedIn]);

  const toggleProfileMenu = () => setProfileMenuOpen(!profileMenuOpen);

  return (
    <div className="flex flex-col min-h-screen dark:bg-darkBackground bg-lightBackground">
      <nav className="p-4 text-white w-full dark:bg-gray-900 bg-blue-600">
        <div className="container mx-auto flex justify-between items-center">
          <div className="text-xl font-bold">
            <Link to="/">Tourify</Link>
          </div>
          
          <button
            className="lg:hidden text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <span className="material-icons">menu</span>
          </button>
  
          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center space-x-4">
            <DarkModeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
  
            <Link to="/shops" className="px-4 py-2 rounded hover:bg-opacity-80">
              Shops
            </Link>
            <Link to="/posts" className="px-4 py-2 rounded hover:bg-opacity-80">
              Posts
            </Link>
            <Link to="/connect" className="px-4 py-2 rounded hover:bg-opacity-80">
              Connect
            </Link>
            {isLoggedIn ? (
              <div className="relative">
                <button 
                  className="flex items-center px-4 py-2 rounded bg-opacity-80"
                  onClick={toggleProfileMenu}
                >
                  <span className="font-bold text-2xl">{user ? user.name[0].toUpperCase() : ''}</span>
                </button>
                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 shadow-lg rounded z-50 dark:bg-gray-800 bg-white dark:text-white text-gray-900">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <p className="font-semibold">Hi, {user?.name}</p>
                    </div>
                    <Link to="/profile" className="block px-4 py-2 hover:bg-opacity-80">
                      Edit Profile
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 hover:bg-opacity-80"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/signup" className="px-4 py-2 rounded bg-white text-gray-900 hover:bg-opacity-90">
                  Sign Up
                </Link>
                <Link to="/login" className="px-4 py-2 rounded bg-white text-gray-900 hover:bg-opacity-90">
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
  
        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden p-4 dark:bg-gray-900 bg-blue-700">
            <div className="py-2">
              <DarkModeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
            </div>
            <Link to="/" className="block text-white py-2">Home</Link>
            <Link to="/shops" className="block text-white py-2">Shops</Link>
            <Link to="/posts" className="block text-white py-2">Posts</Link>
            <Link to="/connect" className="block text-white py-2">Connect</Link>
            {isLoggedIn ? (
              <>
                <div className="block text-white py-2">Hi, {user?.name}</div>
                <Link to="/profile" className="block text-white py-2">Edit Profile</Link>
                <button
                  onClick={handleLogout}
                  className="block text-white py-2 w-full text-left"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/signup" className="block text-white py-2">Sign Up</Link>
                <Link to="/login" className="block text-white py-2">Login</Link>
              </>
            )}
          </div>
        )}
      </nav>
  
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search-results" element={<SearchResultsPage />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login setIsLoggedIn={setIsLoggedIn} setUser={setUser} />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/shops" element={<Shops />} />
          <Route path="/posts" element={<Posts darkMode={darkMode} />} />
          <Route path="/connect" element={<Connect />} />
          <Route path="/landmark-details/:landmarkId" element={<LandmarkDetails />} />
          <Route path="/devise-plan" element={<DevisePlanPage />} />
          <Route path="/create-travel-plan" element={<TravelForm />} />
          <Route path="/profile" element={<EditProfile />} />
          <Route path="/edit-travel-plan" element={<EditTravelForm />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;