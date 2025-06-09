import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const EditTravelForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { plan, currentUser } = location.state || {}; // Fixed: Changed from userEmail to currentUser
  
  const [editPlan, setEditPlan] = useState({
    title: '',
    description: '',
    landmarks: '',
    maxPeople: '',
    dateRange: { start: new Date(), end: new Date() }
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://hac-webdev-2.onrender.com/api';

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

  useEffect(() => {
    if (!plan || !currentUser) {
      alert('Invalid access. Redirecting to travel plans.');
      navigate('/connect');
      return;
    }

    // Check if current user is the creator
    if (currentUser.email !== plan.email) {
      alert('You can only edit your own travel plans.');
      navigate('/connect');
      return;
    }

    // Initialize form with existing plan data
    setEditPlan({
      title: plan.title,
      description: plan.description,
      landmarks: Array.isArray(plan.landmarks) ? plan.landmarks.join(', ') : plan.landmarks,
      maxPeople: plan.maxPeople.toString(),
      dateRange: {
        start: new Date(plan.dateRange.start),
        end: new Date(plan.dateRange.end)
      }
    });
  }, [plan, currentUser, navigate]);

  const handleUpdateTravelPlan = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate authentication
    const token = getAuthToken();
    if (!token) {
      alert('Please log in to edit travel plans');
      navigate('/login');
      return;
    }

    // Validate max people constraint
    const newMaxPeople = parseInt(editPlan.maxPeople);
    if (newMaxPeople < plan.currentPeople) {
      setError(`Cannot reduce maximum people below current participants (${plan.currentPeople})`);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/travelplans/${plan._id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: editPlan.title,
          description: editPlan.description,
          landmarks: editPlan.landmarks.split(',').map(landmark => landmark.trim()),
          maxPeople: newMaxPeople,
          dateRange: {
            start: editPlan.dateRange.start,
            end: editPlan.dateRange.end
          }
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update travel plan');
      }

      const data = await response.json();
      console.log('Travel plan updated:', data);
      alert('Travel plan updated successfully!');
      navigate('/connect');
    } catch (error) {
      console.error('Error updating travel plan:', error);
      setError(error.message || 'Failed to update travel plan');
    } finally {
      setLoading(false);
    }
  };

  if (!plan || !currentUser) {
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
          Edit Travel Plan
        </h2>
        
        <div className="mb-4 p-4 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-lg">
          <p className="text-sm">
            <strong>Editing as:</strong> {currentUser.name} ({currentUser.email})
          </p>
          <p className="text-sm mt-1">
            <strong>Current participants:</strong> {plan.currentPeople}/{plan.maxPeople}
          </p>
          <p className="text-sm mt-1">
            Note: You cannot reduce the maximum people below the current number of participants.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleUpdateTravelPlan} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title
            </label>
            <input
              type="text"
              placeholder="Title"
              value={editPlan.title}
              onChange={(e) => setEditPlan({ ...editPlan, title: e.target.value })}
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
              value={editPlan.description}
              onChange={(e) => setEditPlan({ ...editPlan, description: e.target.value })}
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
              value={editPlan.landmarks}
              onChange={(e) => setEditPlan({ ...editPlan, landmarks: e.target.value })}
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
              value={editPlan.maxPeople}
              onChange={(e) => setEditPlan({ ...editPlan, maxPeople: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
              min={plan.currentPeople} // Minimum is current participants
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Minimum: {plan.currentPeople} (current participants)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <DatePicker
                selected={editPlan.dateRange.start}
                onChange={(date) =>
                  setEditPlan({ ...editPlan, dateRange: { ...editPlan.dateRange, start: date } })
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
                selected={editPlan.dateRange.end}
                onChange={(date) =>
                  setEditPlan({ ...editPlan, dateRange: { ...editPlan.dateRange, end: date } })
                }
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
                minDate={editPlan.dateRange.start}
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
              {loading ? 'Updating...' : 'Update Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTravelForm;