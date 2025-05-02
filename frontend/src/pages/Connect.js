import React, { useEffect, useState } from 'react';
import { Calendar, Users, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Connect = () => {
  const [travelPlans, setTravelPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://hac-webdev-2.onrender.com/api';
  const fetchTravelPlans = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/travelplans`);
      if (!response.ok) {
        throw new Error('Failed to fetch travel plans');
      }
      const data = await response.json();
      setTravelPlans(data);
    } catch (error) {
      console.error('Error fetching travel plans:', error);
      setError('Failed to load travel plans. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = (recipientEmail, planTitle) => {
    const subject = encodeURIComponent(`Join my travel plan: ${planTitle}`);
    const body = encodeURIComponent(
      `Hi there,\n\nI would like to join your travel plan titled "${planTitle}".\n\nPlease let me know if there's room for me!\n\nBest regards,`
    );
    
    // Open email client with pre-filled details
    window.location.href = `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
  };

  useEffect(() => {
    fetchTravelPlans();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-300">Loading travel plans...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Connect with Fellow Travelers
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
          Join exciting travel plans or create your own adventure
        </p>
        <button
          onClick={() => navigate('/create-travel-plan')}
          className="inline-flex items-center px-6 py-3 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg transition-colors duration-200"
        >
          <Users className="mr-2 h-5 w-5" />
          Create Travel Plan
        </button>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto mb-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        </div>
      )}

      {/* Travel Plans Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {travelPlans.length === 0 ? (
          <div className="col-span-full text-center text-gray-600 dark:text-gray-300">
            No travel plans available. Be the first to create one!
          </div>
        ) : (
          travelPlans.map((plan) => (
            <div key={plan._id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {plan.title}
                  </h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    by {plan.user}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {plan.description}
                </p>
                <div className="space-y-3">
                  <div className="flex items-center text-gray-600 dark:text-gray-300">
                    <MapPin className="h-5 w-5 mr-2 flex-shrink-0" />
                    <span>{Array.isArray(plan.landmarks) ? plan.landmarks.join(', ') : plan.landmarks}</span>
                  </div>
                  <div className="flex items-center text-gray-600 dark:text-gray-300">
                    <Users className="h-5 w-5 mr-2 flex-shrink-0" />
                    <span>{plan.currentPeople}/{plan.maxPeople} travelers</span>
                  </div>
                  <div className="flex items-center text-gray-600 dark:text-gray-300">
                    <Calendar className="h-5 w-5 mr-2 flex-shrink-0" />
                    <span>
                      {new Date(plan.dateRange.start).toLocaleDateString()} - {new Date(plan.dateRange.end).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="mt-6">
                  <button
                    onClick={() => handleSendInvite(plan.email, plan.title)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:bg-gray-400"
                    disabled={plan.currentPeople >= plan.maxPeople}
                  >
                    {plan.currentPeople >= plan.maxPeople ? 'Plan Full' : 'Request to Join'}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Connect;