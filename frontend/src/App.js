import React, { useState, useEffect } from 'react';
import { Route, Routes, Link, useNavigate } from 'react-router-dom';
import Signup from './pages/Signup';
import Login from './pages/Login';
import VerifyOtp from './pages/VerifyOtp';
import HomePage from './pages/HomePage';
import SearchResultsPage from './pages/SearchResultsPage';
import Shops from './pages/ShopPage';
// import Packages from './pages/PackagesPage';
import Connect from './pages/Connect';
import LandmarkDetails from './pages/LandmarkDetails';
import DevisePlanPage from './pages/DevisePlanPage';
import DarkModeToggle from './components/DarkModeToggle';
import axios from 'axios';
import TravelForm from './pages/TravelForm';
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [notificationShown, setNotificationShown] = useState(false);
  const [user, setUser] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Hardcoded API Base URL
  const API_BASE_URL = 'https://hac-webdev-2.onrender.com/api'; // Change to your live backend URL when deployed

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
      await axios.post(`${API_BASE_URL}/auth/logout`); // Updated to use hardcoded base URL
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setIsLoggedIn(false);
      setUser(null);
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

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
            <DarkModeToggle />
  
            <Link to="/shops" className="px-4 py-2 rounded hover:bg-opacity-80">
              Shops
            </Link>
            {/* <Link to="/packages" className="px-4 py-2 rounded hover:bg-opacity-80">
              Packages
            </Link> */}
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
              <DarkModeToggle />
            </div>
            <Link to="/" className="block text-white py-2">Home</Link>
            <Link to="/shops" className="block text-white py-2">Shops</Link>
            {/* <Link to="/packages" className="block text-white py-2">Packages</Link> */}
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
          {/* <Route path="/packages" element={<Packages />} /> */}
          <Route path="/connect" element={<Connect />} />
          <Route path="/landmark-details/:landmarkId" element={<LandmarkDetails />} />
          <Route path="/devise-plan" element={<DevisePlanPage />} />
          <Route path="/create-travel-plan" element={<TravelForm />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
