import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const TravelForm = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [newPlan, setNewPlan] = useState({
    title: '',
    description: '',
    landmarks: '',
    maxPeople: '',
    dateRange: { start: new Date(), end: new Date() }
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  // Get token from localStorage
  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  // Get auth headers for API calls
  const getAuthHeaders = () => {
    const token = getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  // Fetch current user info
  const fetchCurrentUser = async () => {
    const token = getAuthToken();
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);
      } else {
        // Token is invalid, redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
      navigate('/login');
    }
  };

  const handleAddTravelPlan = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/travelplans`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...newPlan,
          landmarks: newPlan.landmarks.split(',').map(landmark => landmark.trim()),
          maxPeople: parseInt(newPlan.maxPeople),
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create travel plan');
      }

      const data = await response.json();
      console.log('Travel plan created:', data);
      alert('Travel plan created successfully!');
      navigate('/connect');
    } catch (error) {
      console.error('Error adding travel plan:', error);
      setError(error.message || 'Failed to create travel plan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-300">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Create Travel Plan
        </h2>
        
        <div className="mb-4 p-4 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-lg">
          <p className="text-sm">
            <strong>Creating as:</strong> {currentUser.name} ({currentUser.email})
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <form onSubmit={handleAddTravelPlan} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title
            </label>
            <input
              type="text"
              placeholder="Title"
              value={newPlan.title}
              onChange={(e) => setNewPlan({ ...newPlan, title: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              placeholder="Description"
              value={newPlan.description}
              onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              rows="3"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Landmarks (comma-separated)
            </label>
            <input
              type="text"
              placeholder="Landmarks (comma-separated)"
              value={newPlan.landmarks}
              onChange={(e) => setNewPlan({ ...newPlan, landmarks: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Maximum People
            </label>
            <input
              type="number"
              placeholder="Max People"
              value={newPlan.maxPeople}
              onChange={(e) => setNewPlan({ ...newPlan, maxPeople: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
              min="1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <DatePicker
                selected={newPlan.dateRange.start}
                onChange={(date) =>
                  setNewPlan({ ...newPlan, dateRange: { ...newPlan.dateRange, start: date } })
                }
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
                minDate={new Date()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <DatePicker
                selected={newPlan.dateRange.end}
                onChange={(date) =>
                  setNewPlan({ ...newPlan, dateRange: { ...newPlan.dateRange, end: date } })
                }
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
                minDate={newPlan.dateRange.start}
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={() => navigate('/connect')}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:bg-blue-400"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TravelForm;